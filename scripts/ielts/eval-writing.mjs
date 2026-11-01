#!/usr/bin/env node
// Приёмка ИИ-проверки Writing (ТЗ §9.6, замечание C7): 7 эссе пакета через тот же грейдер, что у роута
// /api/ielts/writing/assess, и те же ограничения балла, что у бэкенда (порт — src/lib/ielts/writingCaps.js).
// Сервер не нужен: задание берётся из выгрузки банка бэкенда (backend/build/ielts-seed/writing/**.json), а если там
// его нет — из каталога, встроенного в writing-prototype.html пакета.
//
// Ходит в живую модель и стоит денег (7 эссе × 3 языка + 2 повтора A ≈ 27 оценок, каждая — 2 вызова Sonnet), поэтому
// не в CI: запускать руками перед релизом.
//
//   node --env-file=.env.local scripts/ielts/eval-writing.mjs --pack <папка writing-dev-pack> [--langs ru,en,kk]
//        [--only A,F] [--repeat-a 3] [--out отчёт.md]
//
// Печатает markdown-таблицу: баллы по критериям, ограничения, ошибки (доля найденных цитат), упражнения, язык
// объяснений и попадание в ожидаемый диапазон §9.6; для A — разброс повторов.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IELTS_REVIEW_MODEL, hasAnthropicKey, structured } from '../../src/lib/anthropic.js'
import { WRITING_SCHEMA, buildSystemPrompt, exercisesWriting, normalizeAssessment, userMessage } from '../../src/lib/ielts/writingGrader.js'
import { applyWritingCaps } from '../../src/lib/ielts/writingCaps.js'
import { copiedWords, copyTaskText, countWords } from '../../src/ielts/writing/writing.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SEED = path.join(ROOT, '..', 'backend', 'build', 'ielts-seed')

// эссе пакета → задание и ожидаемый общий балл (§9.6); caps — баннеры, которые обязаны появиться
const ESSAYS = [
  { key: 'A', file: 'A_strong.txt', task: 'W2-101', min: 7.5, max: 8.5 },
  { key: 'B', file: 'B_weak.txt', task: 'W2-101', min: 4.5, max: 5.5 },
  { key: 'C', file: 'C_offtopic.txt', task: 'W2-101', min: 0, max: 3.5, caps: ['off_topic'] },
  { key: 'D', file: 'D_template.txt', task: 'W2-101', min: 3.5, max: 4.5 },
  { key: 'E', file: 'E_short.txt', task: 'W2-101', min: 0, max: 4.5, caps: ['too_short'] },
  { key: 'F', file: 'F_t1strong.txt', task: 'W1-AC-001', min: 7.5, max: 8.5 },
  { key: 'G', file: 'G_t1nooverview.txt', task: 'W1-AC-001', min: 4, max: 5, caps: ['no_overview', 'copied_intro'] },
]

function args() {
  const a = process.argv.slice(2)
  const get = (k, d) => {
    const i = a.indexOf(`--${k}`)
    return i >= 0 && a[i + 1] ? a[i + 1] : d
  }
  return {
    pack: get('pack', process.env.WRITING_PACK || ''),
    langs: get('langs', 'ru,en,kk').split(',').map((s) => s.trim()).filter(Boolean),
    only: get('only', '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
    repeatA: Math.max(1, Number(get('repeat-a', '3')) || 1),
    out: get('out', ''),
  }
}

// ---------------------------------------------------------------- задания

function walkJson(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkJson(p, out)
    else if (e.name.endsWith('.json')) out.push(p)
  }
  return out
}

/** Задание из выгрузки банка бэкенда (формат jts-ielts-bundle: { tests: [...] } или один документ). */
function fromSeed(id) {
  for (const f of walkJson(path.join(SEED, 'writing')).concat(walkJson(path.join(SEED, 'writing-pack')))) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'))
      const list = Array.isArray(j?.tests) ? j.tests : Array.isArray(j) ? j : [j]
      const doc = list.find((d) => d?.id === id)
      if (doc) return { doc, source: path.relative(ROOT, f) }
    } catch {
      /* не json банка — пропускаем */
    }
  }
  return null
}

/** Объект JSON, начинающийся с позиции at (скобки внутри строк не считаются). */
function sliceObject(s, at) {
  let depth = 0
  let str = false
  for (let i = at; i < s.length; i++) {
    const c = s[i]
    if (str) {
      if (c === '\\') i++
      else if (c === '"') str = false
    } else if (c === '"') str = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return s.slice(at, i + 1)
  }
  return null
}

/** Задание из каталога прототипа (поля q / bullets / chart / part / cat) → форма документа банка. */
function fromPrototype(id, pack) {
  const file = path.join(pack, 'writing-prototype.html')
  if (!fs.existsSync(file)) return null
  const html = fs.readFileSync(file, 'utf8')
  const at = html.indexOf(`{"id":"${id}"`)
  if (at < 0) return null
  const raw = JSON.parse(sliceObject(html, at))
  const t2 = raw.kind === 'task2' || String(id).startsWith('W2-')
  const gt = String(id).startsWith('W1-GT')
  return {
    doc: {
      id,
      kind: t2 ? 'task2' : 'task1',
      taskKind: t2 ? 'task2' : gt ? 'task1_general' : 'task1_academic',
      title: raw.title,
      question: raw.q,
      bullets: raw.bullets || undefined,
      opening: raw.opening || undefined,
      // формат графика прототипа может отличаться от банка — describeChart опишет, что поймёт
      chart: raw.chart || undefined,
      minWords: t2 ? 250 : 150,
    },
    source: 'writing-prototype.html',
  }
}

// ---------------------------------------------------------------- оценка

// язык объяснений: казахские буквы → kk, кириллица → ru, иначе en
function langOf(s) {
  const t = String(s || '')
  if (/[әғқңөұүһі]/i.test(t)) return 'kk'
  const cyr = (t.match(/[а-яё]/gi) || []).length
  const lat = (t.match(/[a-z]/gi) || []).length
  return cyr > lat ? 'ru' : 'en'
}

async function gradeOnce(doc, text, uiLang) {
  const words = countWords(text)
  const copied = copiedWords(text, copyTaskText(doc))
  const minWords = doc.minWords || (doc.kind === 'task2' ? 250 : 150)
  const job = { taskKind: doc.taskKind || (doc.kind === 'task2' ? 'task2' : 'task1_academic'), task: doc, text, words, minWords, copied, effectiveWords: Math.max(0, words - copied) }
  const t0 = Date.now()
  const exP = exercisesWriting({ run: structured, model: IELTS_REVIEW_MODEL, job, uiLang, timeoutMs: 80_000 })
  const raw = await structured({ systemPrompt: buildSystemPrompt(job, uiLang), userMessage: userMessage(job), schema: WRITING_SCHEMA, model: IELTS_REVIEW_MODEL, effort: 'medium', timeoutMs: 80_000, maxRetries: 0 })
  const a = normalizeAssessment(raw, text)
  const exercises = await exP
  const capped = applyWritingCaps({ criteria: a.criteria, onTopic: a.onTopic, overviewPresent: a.overviewPresent, introCopied: a.introCopied, copied, effectiveWords: job.effectiveWords, minWords, taskKind: job.taskKind })
  const explain = a.errors.map((e) => `${e.why} ${e.rule}`).join(' ') + ' ' + a.feedback
  return {
    ms: Date.now() - t0,
    words,
    copied,
    ...capped,
    errors: a.errors.length,
    found: a.errors.filter((e) => e.quoteFound).length,
    exercises: exercises.length,
    lang: langOf(explain),
    flags: { onTopic: a.onTopic, overviewPresent: a.overviewPresent, introCopied: a.introCopied },
  }
}

// ---------------------------------------------------------------- отчёт

const f1 = (n) => (n == null ? '—' : Number(n).toFixed(1))

function row(e, lang, run, r) {
  const okBand = r.overall != null && r.overall >= e.min && r.overall <= e.max
  const okCaps = (e.caps || []).every((c) => r.caps.includes(c))
  const pct = r.errors ? Math.round((r.found / r.errors) * 100) : 100
  const okQ = pct >= 90
  const okEx = r.exercises >= 4
  const okLang = r.lang === lang
  const pass = okBand && okCaps && okQ && okEx && okLang
  const c = r.criteria
  return `| ${e.key} | ${lang} | ${run} | **${f1(r.overall)}** | ${e.min}–${e.max} ${okBand ? '✅' : '❌'} | ${f1(c.taskResponse)}/${f1(c.coherenceCohesion)}/${f1(c.lexicalResource)}/${f1(c.grammaticalRange)} | ${r.caps.join(', ') || '—'}${okCaps ? '' : ' ❌'} | ${r.words}/${r.copied} | ${r.errors} (${pct}%${okQ ? '' : ' ❌'}) | ${r.exercises}${okEx ? '' : ' ❌'} | ${r.lang}${okLang ? '' : ' ❌'} | ${Math.round(r.ms / 1000)} с | ${pass ? '✅' : '❌'} |`
}

async function main() {
  const o = args()
  if (!o.pack || !fs.existsSync(path.join(o.pack, 'essays'))) {
    console.error('Укажите --pack <папка writing-dev-pack> (в ней essays/ и writing-prototype.html)')
    process.exit(2)
  }
  if (!hasAnthropicKey()) {
    console.error('Нет ANTHROPIC_API_KEY: node --env-file=.env.local scripts/ielts/eval-writing.mjs …')
    process.exit(2)
  }
  const tasks = {}
  for (const id of new Set(ESSAYS.map((e) => e.task))) {
    const t = fromSeed(id) || fromPrototype(id, o.pack)
    if (!t) {
      console.error(`Задание ${id} не найдено ни в ${path.relative(ROOT, SEED)}, ни в прототипе`)
      process.exit(2)
    }
    tasks[id] = t
  }

  const lines = [
    `# eval-writing — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${IELTS_REVIEW_MODEL}`,
    '',
    ...Object.entries(tasks).map(([id, t]) => `- ${id}: ${t.source}`),
    '',
    '| Эссе | Язык | Прогон | Общий | Ожидание | TA/CC/LR/GRA | Ограничения | Слов/скоп. | Ошибки (цитаты найдены) | Упражн. | Язык объясн. | Время | Итог |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ]
  const spreadA = {}
  for (const e of ESSAYS.filter((x) => !o.only.length || o.only.includes(x.key))) {
    const text = fs.readFileSync(path.join(o.pack, 'essays', e.file), 'utf8').replace(/\r\n/g, '\n').trim()
    for (const lang of o.langs) {
      const runs = e.key === 'A' ? o.repeatA : 1
      for (let run = 1; run <= runs; run++) {
        process.stderr.write(`${e.key} ${lang} #${run}… `)
        try {
          const r = await gradeOnce(tasks[e.task].doc, text, lang)
          process.stderr.write(`${f1(r.overall)}\n`)
          lines.push(row(e, lang, run, r))
          if (e.key === 'A') (spreadA[lang] ||= []).push(r.overall)
        } catch (err) {
          process.stderr.write(`ошибка: ${err?.message || err}\n`)
          lines.push(`| ${e.key} | ${lang} | ${run} | — | ${e.min}–${e.max} | — | — | — | — | — | — | — | ❌ ${String(err?.message || err).slice(0, 80)} |`)
        }
      }
    }
  }
  const spreads = Object.entries(spreadA).filter(([, v]) => v.length > 1)
  if (spreads.length) {
    lines.push('', '**Повтор A (разброс ≤ 0.5):**')
    for (const [lang, v] of spreads) {
      const d = Math.max(...v) - Math.min(...v)
      lines.push(`- ${lang}: ${v.map(f1).join(', ')} → разброс ${f1(d)} ${d <= 0.5 ? '✅' : '❌'}`)
    }
  }
  const md = lines.join('\n')
  console.log(md)
  if (o.out) fs.writeFileSync(o.out, md + '\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
