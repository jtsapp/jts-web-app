// Еженедельный разбор ответов Луны (ТЗ v2.0, 8.5: «разбор 50 случайных диалогов по чек-листу: факты верны, язык
// верный, „зачем“ есть, ответа в домашке нет, тон»; раздел 1: «доля полезных ответов (оценка 👍/👎 и ручной разбор)
// ≥ 85 %»). Спека — docs/superpowers/specs/2026-11-08-luna-answer-rating-design.md.
//
//   INTERNAL_API_KEY=… node scripts/assistant-eval/weekly-review.js --url https://dev-tutor.justtostudy.kz
//   node scripts/assistant-eval/weekly-review.js --in rows.json          # из сохранённой выгрузки, без сети
//
// Флаги: --url стенд (журнал берётся служебным GET /api/assistant/rating с x-internal-key = INTERNAL_API_KEY стенда;
// ключ — из --key или окружения, в лист он не пишется); --days за сколько дней (7); --to по какой день (сегодня);
// --n сколько диалогов в выборку (50); --seed число для выборки (по умолчанию от даты начала — та же неделя даёт ту
// же выборку); --out файл листа; --save сохранить выгрузку json рядом с листом (для --in).
//
// Лист — build/assistant-eval/weekly-<с>_<по>.md: в git он не идёт, там ответы учеников (без имён и контактов —
// их вычищает роут записи). Итог считает скрипт, чек-лист по диалогам заполняет человек.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { phraseLang } from '../../src/lib/assistant/phraseLang.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const DAY_MS = 24 * 60 * 60 * 1000

/** Цель ТЗ, раздел 1. */
export const TARGET = 0.85
export const SAMPLE = 50
export const CHECKLIST = ['Факты верны', 'Язык верный', '«Зачем» есть', 'Ответа в домашке нет', 'Тон']

const MODE_NAME = { teacher: 'учитель', site: 'сайт', event: 'событие', hint: 'подсказка' }
const CHANNEL_NAME = { text: 'текст', voice: 'голос', call: 'звонок' }
const REASON_NAME = { wrong: 'неверно', offtarget: 'не то', unclear: 'непонятно', lang: 'не тот язык' }
const PERSONA_NAME = { luna: 'Луна', aizere: 'Айзере' }

/** Повторяемый генератор: одна неделя — одна выборка, пока не задан другой seed. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedOf(text) {
  let h = 2166136261
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619)
  return h >>> 0
}

/** Ответы → диалоги: разговор во вкладке (chat), ответы по номеру. */
export function groupDialogs(rows) {
  const by = new Map()
  for (const r of rows) {
    if (!by.has(r.chat)) by.set(r.chat, [])
    by.get(r.chat).push(r)
  }
  return [...by.entries()]
    .map(([chat, turns]) => {
      turns.sort((a, b) => a.turn - b.turn || String(a.createdAt).localeCompare(String(b.createdAt)))
      const first = turns[0]
      return { chat, student: first.student || '', screen: first.screen, lang: first.lang, persona: first.persona, startedAt: first.createdAt, turns }
    })
    .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
}

/** n случайных диалогов, в порядке начала — читать подряд удобнее. */
export function pickDialogs(dialogs, n, seed) {
  const rnd = mulberry32(seed)
  const idx = dialogs.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.slice(0, n).sort((a, b) => a - b).map((i) => dialogs[i])
}

function quantile(values, q) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil(q * v.length) - 1))]
}

const tally = () => ({ answers: 0, up: 0, down: 0 })
const bump = (map, key, r) => {
  const t = (map[key] ||= tally())
  t.answers += 1
  if (r.rating === 1) t.up += 1
  if (r.rating === -1) t.down += 1
}
/** Доля 👍 среди оценённых; оценок нет — null. */
export const upShare = (t) => (t.up + t.down ? t.up / (t.up + t.down) : null)

/** Итог по журналу — то, что лист показывает числами. */
export function summarize(rows) {
  const s = {
    answers: rows.length,
    dialogs: new Set(rows.map((r) => r.chat)).size,
    students: new Set(rows.map((r) => r.student).filter(Boolean)).size,
    rated: 0,
    up: 0,
    down: 0,
    byMode: {},
    byLang: {},
    byChannel: {},
    reasons: {},
    comments: 0,
    offered: 0,
    clicked: 0,
    latency: {},
    soundMs: null,
  }
  for (const r of rows) {
    if (r.rating === 1) s.up += 1
    if (r.rating === -1) s.down += 1
    if (r.rating != null) s.rated += 1
    if (r.comment) s.comments += 1
    // Причины — только у 👎: после смены на 👍 их уже нет, но старая выгрузка могла их нести.
    if (r.rating === -1) for (const why of r.reasons || []) s.reasons[why] = (s.reasons[why] || 0) + 1
    bump(s.byMode, r.mode || 'site', r)
    bump(s.byLang, r.lang || 'ru', r)
    bump(s.byChannel, r.channel || 'text', r)
    if (r.actions?.length) {
      s.offered += 1
      if (r.clicked) s.clicked += 1
    }
  }
  for (const ch of Object.keys(s.byChannel)) {
    const ms = rows.filter((r) => (r.channel || 'text') === ch).map((r) => r.firstMs)
    s.latency[ch] = { median: quantile(ms, 0.5), p90: quantile(ms, 0.9), n: ms.filter(Number.isFinite).length }
  }
  const sound = rows.map((r) => r.soundMs)
  if (sound.some(Number.isFinite)) s.soundMs = { median: quantile(sound, 0.5), p90: quantile(sound, 0.9) }
  return s
}

const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`)
const sec = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1).replace('.', ',')} с` : '—')
const day = (iso) => String(iso).slice(0, 10)

/**
 * Где проверяющему смотреть внимательнее: ответ на экране домашки (пункт «ответа в домашке нет») и язык ответа не тот,
 * что у интерфейса (английский в ответе учителя — примеры, поэтому английским считается только ответ без кириллицы).
 */
export function flagsOf(r) {
  const out = []
  if (/homework/i.test(r.screen || '')) out.push('домашка — нет ли готового ответа')
  const said = phraseLang(r.answer)
  if (r.answer && said !== (r.lang || 'ru')) out.push(`язык: ответ ${said}, интерфейс ${r.lang || 'ru'}`)
  if (r.offtopic) out.push('отказ «не по теме»')
  return out
}

// Служебный ход окна («[ученик открыл окно]», «[событие: day_start]») — не слова ученика.
const isServiceTurn = (q) => /^\[[^\]]+\]$/.test(String(q || '').trim())
const quote = (text) =>
  String(text || '—')
    .trim()
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')

function renderTurn(r) {
  const out = []
  const q = String(r.question || '').trim()
  out.push(isServiceTurn(q) ? `*Служебный ход окна:* \`${q}\`` : `**Ученик:**\n${quote(q)}`)
  const mark = r.rating === 1 ? ' · 👍' : r.rating === -1 ? ' · 👎' : ''
  const head = [
    PERSONA_NAME[r.persona] || 'Луна',
    MODE_NAME[r.mode] || r.mode,
    CHANNEL_NAME[r.channel] || r.channel,
    r.model || 'модель ?',
    sec(r.firstMs),
  ].join(' · ')
  out.push(`**${head}${mark}**\n${quote(r.answer)}`)
  if (r.actions?.length) out.push(`Кнопки: ${r.actions.map((a) => `\`${a}\`${a === r.clicked ? ' — нажата' : ''}`).join(', ')}`)
  if (r.rating === -1 && (r.reasons?.length || r.comment)) {
    const why = (r.reasons || []).map((x) => REASON_NAME[x] || x).join(', ')
    out.push(`Причина 👎: ${why || '—'}${r.comment ? ` — «${r.comment}»` : ''}`)
  }
  const flags = flagsOf(r)
  if (flags.length) out.push(`🔎 ${flags.join('; ')}`)
  return out.join('\n\n')
}

function dialogHead(d, i) {
  return `### ${i}. Экран \`${d.screen || '?'}\` · ${PERSONA_NAME[d.persona] || 'Луна'} · ${d.lang} · ответов ${d.turns.length} · ${day(d.startedAt)}${d.student ? ` · ученик ${d.student}` : ''}`
}

function breakdown(title, map, names) {
  const lines = [`| ${title} | ответов | 👍 | 👎 | доля 👍 |`, '|---|---:|---:|---:|---:|']
  for (const [k, t] of Object.entries(map).sort((a, b) => b[1].answers - a[1].answers)) {
    lines.push(`| ${names[k] || k} | ${t.answers} | ${t.up} | ${t.down} | ${pct(upShare(t))} |`)
  }
  return lines.join('\n')
}

/** Лист разбора — чистая функция: её же сверяет тест. */
export function renderReview({ rows, from, to, n = SAMPLE, seed, source = '' }) {
  const s = summarize(rows)
  const dialogs = groupDialogs(rows)
  const sample = pickDialogs(dialogs, n, seed)
  const share = upShare(s)
  const out = [
    `# Разбор ответов Луны: ${day(from)} — ${day(to)}`,
    '',
    `Источник: ${source || 'выгрузка'}. Выборка: ${sample.length} из ${dialogs.length} диалогов, seed ${seed}. ` +
      'Сгенерировано `scripts/assistant-eval/weekly-review.js` (ТЗ v2.0, 8.5).',
    '',
    '## Итог',
    '',
    `- Ответов: ${s.answers}, диалогов: ${s.dialogs}${s.students ? `, учеников: ${s.students}` : ''}.`,
    `- Оценено: ${s.rated} (${pct(s.answers ? s.rated / s.answers : null)}): 👍 ${s.up}, 👎 ${s.down}, комментариев ${s.comments}.`,
    `- **Доля 👍: ${pct(share)}** — цель ТЗ ≥ ${pct(TARGET)}: ${share == null ? 'оценок нет' : share >= TARGET ? 'да' : 'нет'}.`,
    `- Кнопки под ответом: предложены в ${s.offered} ответах, нажаты в ${s.clicked} (${pct(s.offered ? s.clicked / s.offered : null)}).`,
    `- Задержка первой фразы (медиана / p90): ${Object.entries(s.latency)
      .map(([ch, l]) => `${CHANNEL_NAME[ch] || ch} ${sec(l.median)} / ${sec(l.p90)}`)
      .join(', ') || '—'}${s.soundMs ? `; первый звук голосом ${sec(s.soundMs.median)} / ${sec(s.soundMs.p90)}` : ''}.`,
    '',
    breakdown('Режим', s.byMode, MODE_NAME),
    '',
    breakdown('Язык', s.byLang, {}),
    '',
    breakdown('Канал', s.byChannel, CHANNEL_NAME),
    '',
    `Причины 👎: ${Object.entries(s.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${REASON_NAME[k] || k} ${v}`).join(', ') || 'не указаны'}.`,
  ]

  const downs = rows.filter((r) => r.rating === -1)
  out.push('', `## Все 👎 (${downs.length})`, '')
  if (!downs.length) out.push('Нет.')
  const byChat = new Map(dialogs.map((d) => [d.chat, d]))
  downs.forEach((r, i) => {
    const d = byChat.get(r.chat)
    // Контекст — до двух ответов перед оценённым: без него «не то» не понять.
    const before = (d?.turns || []).filter((x) => x.turn < r.turn).slice(-2)
    out.push(`### 👎 ${i + 1}. Экран \`${r.screen || '?'}\` · ${r.lang} · ${day(r.createdAt)}`, '')
    for (const x of [...before, r]) out.push(renderTurn(x), '')
  })

  out.push('', `## ${sample.length} случайных диалогов`, '', `Чек-лист на каждый диалог: ${CHECKLIST.join(' · ')}.`, '')
  sample.forEach((d, i) => {
    out.push(dialogHead(d, i + 1), '')
    for (const r of d.turns) out.push(renderTurn(r), '')
    out.push(...CHECKLIST.map((c) => `- [ ] ${c}`), '- Полезен: да / нет', '')
  })

  const need = Math.ceil(TARGET * sample.length)
  out.push(
    '## Итог ручного разбора',
    '',
    '| Пункт | Да | Нет |',
    '|---|---:|---:|',
    ...CHECKLIST.map((c) => `| ${c} |  |  |`),
    '',
    `Полезных диалогов: __ из ${sample.length} (цель ТЗ ≥ ${pct(TARGET)} — не меньше ${need}).`,
    '',
  )
  return out.join('\n')
}

/** Журнал за период со стенда — служебным GET роута оценок. */
export async function fetchRows({ url, key, from, to, fetchImpl = fetch }) {
  const u = new URL('/api/assistant/rating', url)
  u.searchParams.set('from', from.toISOString())
  u.searchParams.set('to', to.toISOString())
  const res = await fetchImpl(u, { headers: { 'x-internal-key': key } })
  if (res.status === 401) throw new Error('стенд не принял ключ (INTERNAL_API_KEY)')
  if (!res.ok) throw new Error(`стенд ответил ${res.status}`)
  const body = await res.json()
  return Array.isArray(body?.rows) ? body.rows : []
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const next = argv[i + 1]
    args[a.slice(2)] = next && !next.startsWith('--') ? (i++, next) : true
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const days = Number(args.days) || 7
  const to = args.to ? new Date(`${args.to}T23:59:59.999Z`) : new Date()
  const from = new Date(to.getTime() - days * DAY_MS)
  const n = Number(args.n) || SAMPLE
  const seed = args.seed != null && args.seed !== true ? Number(args.seed) : seedOf(day(from.toISOString()))
  let rows
  let source
  if (args.in) {
    const data = JSON.parse(readFileSync(path.resolve(String(args.in)), 'utf8'))
    rows = Array.isArray(data) ? data : data.rows || []
    source = `файл ${path.basename(String(args.in))}`
  } else {
    const url = args.url && args.url !== true ? String(args.url) : process.env.REVIEW_URL
    const key = args.key && args.key !== true ? String(args.key) : process.env.INTERNAL_API_KEY
    if (!url || !key) {
      console.error('Нужны --url стенда и ключ (--key или INTERNAL_API_KEY), либо --in выгрузка.json')
      process.exit(2)
    }
    rows = await fetchRows({ url, key: key.replace(/^﻿/, '').trim(), from, to })
    source = new URL(url).host
  }
  const md = renderReview({ rows, from: from.toISOString(), to: to.toISOString(), n, seed, source })
  const out = path.resolve(args.out && args.out !== true ? String(args.out) : path.join(ROOT, 'build/assistant-eval', `weekly-${day(from.toISOString())}_${day(to.toISOString())}.md`))
  mkdirSync(path.dirname(out), { recursive: true })
  writeFileSync(out, md)
  if (args.save) writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify({ rows }, null, 1))
  const s = summarize(rows)
  console.log(`Лист: ${out}\nОтветов ${s.answers}, диалогов ${s.dialogs}, 👍 ${s.up} / 👎 ${s.down} — доля 👍 ${pct(upShare(s))}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err?.message || err)
    process.exit(1)
  })
}
