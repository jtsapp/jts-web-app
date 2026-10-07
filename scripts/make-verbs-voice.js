// Озвучка форм «Неправильных глаголов» через ElevenLabs.
//
// Записи лежат в public/practice/verbs/audio/<ключ>.wav (16 кГц моно, PCM) и
// играются на доли бита: клип стартует РОВНО на доле, а длиннее 0.47 с он быть
// не может — на самом быстром темпе (116 BPM) доля 0.517 с, и следующая форма
// наедет. Поэтому здесь не просто синтез, а подгонка под слот:
//   — формат pcm_16000 (сырой PCM: у mp3 есть задержка кодера, форма съедет с доли);
//   — тишина в начале срезается до самого звука, хвост — плавным спадом;
//   — длиннее потолка клип не отдаём (скорость поднимается и пробуется ещё раз).
//
// Живость даёт контекст: форма читается не отдельным словом (изолированное
// слово у синтеза выходит плоским), а внутри строки «go, went, gone» — с
// интонацией перечисления, — и режется по посимвольным таймингам Eleven
// (/with-timestamps). Так же ложится ритм: V1 чуть вверх, V2 ровно, V3 вниз.
//
// Запуск (ключ — ELEVENLABS_API_KEY из .env.local):
//   node scripts/make-verbs-voice.js --samples        # образцы в build/verbs-voice-samples/
//   node scripts/make-verbs-voice.js --write          # перезаписать public/practice/verbs/audio
//   --voice <id> --model <id> --style isolated|context (по умолчанию isolated) --only went,gone
//
// Без --write ничего в public не трогаем: сначала слушаем образцы.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VERBS = path.join(ROOT, 'public/practice/verbs/verbs.json')
const AUDIO_DIR = path.join(ROOT, 'public/practice/verbs/audio')
const SAMPLES_DIR = path.join(ROOT, 'build/verbs-voice-samples')

const RATE = 16000
export const MAX_CLIP_SEC = 0.47 // потолок прототипа: доля при 116 BPM — 0.517 с
const FADE_SEC = 0.04
const SILENCE = 0.012 // порог «звука» для среза тишины, доля от полной шкалы

// Env может прийти с BOM из Windows-пайпа — как и в серверном коде.
function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name)
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

/** Слово, которое просим произнести, по ключу записи. У омографов — подсказка. */
export function spokenText(key, verb) {
  if (key === 'read-base') return 'reed'
  if (key === 'read-past') return 'red'
  if (verb && verb.speech) {
    const i = [verb.v1, verb.v2.split(' / ')[0], verb.v3.split(' / ')[0]].indexOf(key)
    if (i >= 0) return verb.speech[i]
  }
  return key
}

/** Что нужно озвучить: ключ → { text, verb }. Ключи общие у разных глаголов. */
export function planClips(verbs) {
  const plan = new Map()
  const add = (key, text, verb) => {
    if (!plan.has(key)) plan.set(key, { key, text, verb })
  }
  for (const v of verbs) {
    if (v.v1 === 'read') {
      add('read-base', 'reed', v)
      add('read-past', 'red', v)
      continue
    }
    const forms = [v.v1, v.v2.split(' / ')[0], v.v3.split(' / ')[0]]
    forms.forEach((f) => add(f, spokenText(f, v), v))
    // Варианты через « / » (were, gotten): таблица читает форму целиком.
    for (const field of [v.v2, v.v3]) for (const alt of field.split(/\s*\/\s*/)) add(alt, alt, v)
  }
  return plan
}

const TAIL_SILENCE = 0.03 // хвост затухает долго: его «звук» ниже слышимого порога
const MAX_STRETCH = 1.7
const GOOD_STRETCH = 1.2 // до такого сжатия слово звучит естественно — дальше пробуем ещё дубль
const TAKES = 6 // сжатие по времени сильнее этого уже слышно — тогда режем

/**
 * Сжать по времени БЕЗ смены высоты (WSOLA): кадры 25 мс, шаг синтеза 12 мс,
 * шаг анализа — ratio раз больше, начало каждого кадра подбирается по
 * взаимной корреляции в окне ±6 мс, чтобы фазы сшивались без щелчков.
 */
export function compress(samples, ratio) {
  if (ratio <= 1.001) return samples
  const frame = Math.round(0.025 * RATE)
  const hop = Math.round(0.012 * RATE)
  const search = Math.round(0.006 * RATE)
  const outLen = Math.floor(samples.length / ratio)
  const out = new Float32Array(outLen + frame)
  const norm = new Float32Array(outLen + frame)
  const win = new Float32Array(frame).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frame))
  let prevStart = 0
  for (let n = 0, pos = 0; pos < outLen; n++, pos += hop) {
    const ideal = Math.round(pos * ratio)
    let best = ideal
    if (n > 0) {
      // Ищем сдвиг, при котором кадр продолжает предыдущий (его «естественный» хвост).
      const target = prevStart + hop
      let bestScore = -Infinity
      for (let d = -search; d <= search; d++) {
        const st = Math.min(Math.max(0, ideal + d), samples.length - frame)
        let sc = 0
        for (let i = 0; i < frame; i += 2) sc += samples[st + i] * (samples[target + i] || 0)
        if (sc > bestScore) {
          bestScore = sc
          best = st
        }
      }
    }
    best = Math.min(Math.max(0, best), Math.max(0, samples.length - frame))
    for (let i = 0; i < frame; i++) {
      out[pos + i] += samples[best + i] * win[i]
      norm[pos + i] += win[i]
    }
    prevStart = best
  }
  const res = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) res[i] = norm[i] > 1e-3 ? out[i] / norm[i] : 0
  return res
}

/** Срезать тишину по краям, влезть в слот (сжатием, потом — спадом), нормализовать края. */
export function fitClip(samples, maxSec = MAX_CLIP_SEC) {
  let a = 0
  let b = samples.length
  while (a < b && Math.abs(samples[a]) < SILENCE) a++
  while (b > a && Math.abs(samples[b - 1]) < TAIL_SILENCE) b--
  // Чуть воздуха до звука: срез по порогу иначе съедает взрывной согласный.
  a = Math.max(0, a - Math.round(0.004 * RATE))
  b = Math.min(samples.length, b + Math.round(0.02 * RATE))
  let out = samples.slice(a, b)
  const limit = Math.round(maxSec * RATE)
  const raw = out.length / RATE
  let stretch = 1
  if (out.length > limit) {
    stretch = Math.min(MAX_STRETCH, out.length / limit)
    out = compress(out, stretch)
  }
  const cut = Math.min(out.length, limit)
  const fade = Math.min(Math.round(FADE_SEC * RATE), cut)
  const res = out.slice(0, cut)
  for (let i = 0; i < fade; i++) res[cut - 1 - i] *= i / fade
  return { samples: res, sec: res.length / RATE, trimmed: out.length > limit, raw, stretch }
}

/** Громкость к общему уровню: пик ~0.9, но без раздувания шума. */
export function normalize(samples, peak = 0.9) {
  let max = 0
  for (const s of samples) max = Math.max(max, Math.abs(s))
  if (max < 0.02) return samples
  const k = peak / max
  return samples.map((s) => s * k)
}

export function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * 32767))), i * 2))
  const head = Buffer.alloc(44)
  head.write('RIFF', 0)
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVE', 8)
  head.write('fmt ', 12)
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20)
  head.writeUInt16LE(1, 22)
  head.writeUInt32LE(RATE, 24)
  head.writeUInt32LE(RATE * 2, 28)
  head.writeUInt16LE(2, 32)
  head.writeUInt16LE(16, 34)
  head.write('data', 36)
  head.writeUInt32LE(data.length, 40)
  return Buffer.concat([head, data])
}

function pcmToFloat(buf) {
  const n = Math.floor(buf.length / 2)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2) / 32768
  return out
}

async function synth({ text, voice, model, speed, stability, style }) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('нет ELEVENLABS_API_KEY')
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=pcm_16000`
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability, similarity_boost: 0.75, style, use_speaker_boost: true, speed },
      }),
    })
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)))
      continue
    }
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 200)}`)
    const j = await r.json()
    return { pcm: pcmToFloat(Buffer.from(j.audio_base64, 'base64')), align: j.alignment }
  }
  throw new Error('ElevenLabs: лимит/сбой после повторов')
}

/** [начало, конец] слова с индексом wi в строке, по посимвольным таймингам. */
export function wordSpan(align, text, wi) {
  const words = [...text.matchAll(/[A-Za-z']+/g)]
  const w = words[wi]
  if (!w) return null
  const s = align.character_start_times_seconds[w.index]
  const e = align.character_end_times_seconds[w.index + w[0].length - 1]
  return [s, e]
}

function slice(pcm, span, pad = 0.015) {
  const a = Math.max(0, Math.floor((span[0] - pad) * RATE))
  const b = Math.min(pcm.length, Math.ceil((span[1] + pad) * RATE))
  return pcm.slice(a, b)
}

/**
 * Одна запись. style=context: слово — из строки «w1, w2, w3», style=isolated —
 * отдельным словом. Скорость поднимаем, пока не влезет в слот.
 */
async function makeClip(item, opts) {
  const { verb, key, text } = item
  let speed = opts.speed
  // Eleven каждый раз произносит чуть иначе (то лишний выдох, то растяжка):
  // берём несколько дублей и оставляем тот, что меньше всего приходится сжимать.
  let best = null
  for (let attempt = 0; attempt < TAKES; attempt++, speed = Math.min(1.2, speed + 0.04)) {
    let pcm
    let span
    const cfg = { voice: opts.voice, model: opts.model, speed, stability: opts.stability, style: opts.styleAmt }
    const spoken = verb && opts.style === 'context' && key !== 'read-base' && key !== 'read-past'
    const forms = verb && [verb.v1, verb.v2.split(' / ')[0], verb.v3.split(' / ')[0]]
    const idx = forms ? forms.indexOf(key) : -1
    if (spoken && idx >= 0) {
      const line = forms.map((f, i) => spokenText(f, verb)).join(', ') + '.'
      const res = await synth({ ...cfg, text: line })
      pcm = res.pcm
      span = wordSpan(res.align, line, idx)
    } else {
      const res = await synth({ ...cfg, text: text + '.' })
      pcm = res.pcm
      // «tear the paper» (омограф): фраза нужна для произношения, звучит первое слово.
      span = /\s/.test(text) ? wordSpan(res.align, text, 0) : [0, pcm.length / RATE]
    }
    if (!span) continue
    const fit = fitClip(slice(pcm, span))
    if (!best || fit.stretch < best.stretch) best = { ...fit, speed }
    if (best.stretch <= GOOD_STRETCH) break
  }
  if (!best) throw new Error(`не получилось: ${key}`)
  return best
}

function parseArgs(argv) {
  const o = {
    voice: '876MHA6EtWKaHTEGzjy5',
    model: 'eleven_multilingual_v2',
    style: 'isolated',
    speed: 1.05,
    stability: 0.4,
    styleAmt: 0.35,
    only: null,
    write: false,
    samples: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--write') o.write = true
    else if (a === '--samples') o.samples = true
    else if (a === '--voice') o.voice = argv[++i]
    else if (a === '--model') o.model = argv[++i]
    else if (a === '--style') o.style = argv[++i]
    else if (a === '--speed') o.speed = Number(argv[++i])
    else if (a === '--stability') o.stability = Number(argv[++i])
    else if (a === '--only') o.only = argv[++i].split(',')
    else if (a === '--out') o.out = argv[++i]
  }
  return o
}

async function main() {
  loadEnv()
  const opts = parseArgs(process.argv.slice(2))
  const verbs = JSON.parse(fs.readFileSync(VERBS, 'utf8')).verbs
  let items = [...planClips(verbs).values()]
  if (opts.samples && !opts.only) opts.only = ['went', 'gone', 'be', 'bought', 'read-base', 'read-past', 'tear', 'took']
  if (opts.only) items = items.filter((i) => opts.only.includes(i.key))
  const dir = opts.write ? AUDIO_DIR : opts.out || SAMPLES_DIR
  fs.mkdirSync(dir, { recursive: true })
  const report = []
  // Параллельность держим ниже потолка тарифа (Creator: 10 одновременных).
  const queue = items.slice()
  const worker = async () => {
    while (queue.length) {
      const item = queue.shift()
      try {
        const clip = await makeClip(item, opts)
        fs.writeFileSync(path.join(dir, `${item.key}.wav`), toWav(normalize(clip.samples)))
        report.push({ key: item.key, sec: +clip.sec.toFixed(3), raw: +clip.raw.toFixed(3), speed: +clip.speed.toFixed(2), trimmed: clip.trimmed, stretch: +clip.stretch.toFixed(2) })
        console.log(item.key.padEnd(12), clip.sec.toFixed(3), 'raw', clip.raw.toFixed(2), 'x' + clip.stretch.toFixed(2), clip.trimmed ? 'ОБРЕЗАНО' : '')
      } catch (e) {
        console.error('FAIL', item.key, e.message)
        report.push({ key: item.key, error: e.message })
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  const bad = report.filter((r) => r.error || r.trimmed)
  console.log(`\nготово: ${report.length - bad.length}/${report.length}, проблемных: ${bad.length}`)
  if (bad.length) console.log(bad.map((b) => b.key + (b.error ? ' (ошибка)' : ' (обрезано)')).join(', '))
  if (bad.some((b) => b.error)) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
