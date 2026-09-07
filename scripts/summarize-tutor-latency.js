#!/usr/bin/env node
/**
 * Сводка замеров задержки тютора из логов.
 *
 * Читает stdin (или файлы-аргументы) и ищет:
 *   LATENCY turn=N perceived=…s eou_delay=… llm_ttft=… tts_ttfb=…
 *   LATENCY eou_delay=… / llm_ttft=… / tts_ttfb=…   (старые поштучные строки)
 *   [brain] ttft=…s own=…s total=…s
 *
 * Пример:
 *   lk agent logs 2>&1 | node scripts/summarize-tutor-latency.js
 *   docker logs --since 30m jts-development-web-1 2>&1 | node scripts/summarize-tutor-latency.js
 */

const { readFileSync } = require('node:fs')

const STAGE_KEYS = [
  'perceived',
  'eou_delay',
  'transcription_delay',
  'stt_duration',
  'llm_ttft',
  'llm_duration',
  'tts_ttfb',
  'tts_duration',
  'ttft', // [brain] ttft=
  'own',
  'total',
]

function parseLine(line) {
  const out = {}
  if (/LATENCY\s+turn=/.test(line)) out.kind = 'turn'
  else if (/LATENCY\s+eou_delay=/.test(line)) out.kind = 'eou'
  else if (/LATENCY\s+llm_ttft=/.test(line)) out.kind = 'llm'
  else if (/LATENCY\s+tts_ttfb=/.test(line)) out.kind = 'tts'
  else if (/LATENCY\s+stt_duration=/.test(line)) out.kind = 'stt'
  else if (/\[brain\]/.test(line)) out.kind = 'brain'
  else return null

  for (const key of STAGE_KEYS) {
    const m = line.match(new RegExp(`\\b${key}=([0-9.]+)s?`))
    if (m) out[key] = Number(m[1])
  }
  const turn = line.match(/\bturn=(\d+)/)
  if (turn) out.turn = Number(turn[1])
  return out
}

function stats(nums) {
  if (!nums.length) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)
  const pct = (p) => sorted[Math.min(n - 1, Math.floor((p / 100) * n))]
  return {
    n,
    min: sorted[0],
    p50: pct(50),
    p90: pct(90),
    max: sorted[n - 1],
    avg: sum / n,
  }
}

function fmt(s) {
  if (!s) return '—'
  const f = (x) => `${x.toFixed(2)}s`
  return `n=${s.n}  min=${f(s.min)}  p50=${f(s.p50)}  p90=${f(s.p90)}  max=${f(s.max)}  avg=${f(s.avg)}`
}

function readInput(argv) {
  if (argv.length) {
    return argv.map((p) => readFileSync(p, 'utf8')).join('\n')
  }
  return readFileSync(0, 'utf8')
}

const text = readInput(process.argv.slice(2))
const rows = text.split(/\r?\n/).map(parseLine).filter(Boolean)

const byKind = Object.fromEntries(
  ['turn', 'eou', 'llm', 'tts', 'stt', 'brain'].map((k) => [k, rows.filter((r) => r.kind === k)]),
)

const buckets = {
  'turn perceived (eou+llm_ttft+tts_ttfb)': byKind.turn.map((r) => r.perceived).filter((x) => x != null),
  'turn eou_delay': byKind.turn.map((r) => r.eou_delay).filter((x) => x != null),
  'turn llm_ttft (agent→brain hop + Anthropic)': byKind.turn.map((r) => r.llm_ttft).filter((x) => x != null),
  'turn tts_ttfb': byKind.turn.map((r) => r.tts_ttfb).filter((x) => x != null),
  'stage eou_delay': byKind.eou.map((r) => r.eou_delay).filter((x) => x != null),
  'stage llm_ttft': byKind.llm.map((r) => r.llm_ttft).filter((x) => x != null),
  'stage tts_ttfb': byKind.tts.map((r) => r.tts_ttfb).filter((x) => x != null),
  '[brain] ttft (внутри стенда)': byKind.brain.map((r) => r.ttft).filter((x) => x != null),
  '[brain] own (parse body)': byKind.brain.map((r) => r.own).filter((x) => x != null),
  '[brain] total': byKind.brain.map((r) => r.total).filter((x) => x != null),
}

console.log('Tutor latency summary')
console.log('─'.repeat(64))
for (const [label, nums] of Object.entries(buckets)) {
  if (!nums.length) continue
  console.log(`${label}`)
  console.log(`  ${fmt(stats(nums))}`)
}

const brainTtft = byKind.brain.map((r) => r.ttft).filter((x) => x != null)
const agentTtft = (byKind.turn.length ? byKind.turn : byKind.llm)
  .map((r) => r.llm_ttft)
  .filter((x) => x != null)

if (brainTtft.length && agentTtft.length) {
  const hop = []
  const n = Math.min(brainTtft.length, agentTtft.length)
  // Грубое сопоставление по порядку: для живого звонка ходы идут парами.
  for (let i = 0; i < n; i++) hop.push(Math.max(0, agentTtft[i] - brainTtft[i]))
  console.log('hop ≈ agent llm_ttft − [brain] ttft (дорога us-east ↔ стенд)')
  console.log(`  ${fmt(stats(hop))}`)
}

if (!rows.length) {
  console.log('Строк LATENCY / [brain] не найдено.')
  console.log('Собери: lk agent logs  и/или  GitLab → brain-logs  /  docker logs web')
  process.exitCode = 1
} else {
  console.log('─'.repeat(64))
  console.log(
    `строк: turn=${byKind.turn.length} eou=${byKind.eou.length} llm=${byKind.llm.length} ` +
      `tts=${byKind.tts.length} stt=${byKind.stt.length} brain=${byKind.brain.length}`,
  )
}
