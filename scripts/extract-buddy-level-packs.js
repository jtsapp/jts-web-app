// Режет методички Speaking Buddy по уровням (data/speaking-buddy/<LEVEL>.md —
// клиентские «A0–B2 v2 Pedagogy, Methodology & System Prompt», источник правды)
// в пакеты уровня для голосового агента: agent/level-packs/<level>.md.
//
// Из документа берётся только Part 20 — «production-ready system prompt». Всё
// остальное (профиль ученика, карта курса, примеры, сценарии сессий) — это
// обоснование и материал для тестов, в звонок оно не идёт: документ на 150–270
// КБ, а промпт звонка читается целиком на каждом ходе.
//
// Part 20 написан как ЦЕЛЫЙ промпт со своим характером, а у нас характер — md
// тьютора, и тон обвязке и методичке не принадлежит (решение 25.09.2026). Поэтому:
//   - раздел 1 IDENTITY («warm, patient partner», {{BUDDY_NAME}}) — выкинут;
//   - раздел 15 NATURALNESS ENGINE (реакции «That's fantastic!», «Great job») —
//     выкинут: реакции решает характер;
//   - раздел 17 PROGRESS EVIDENCE — выкинут: таких тулов у агента нет, а
//     лишние поля модель пыталась бы «логировать» текстом;
//   - строка «L1 use: … IF it is empty, do not speak Russian or Kazakh» —
//     заменена ссылкой на блок LANGUAGES обвязки: язык объяснений у нас
//     выбирает ученик, и молчаливый запрет русского спорил бы с ним;
//   - {{BUDDY_NAME}} в примерах реплик → «<your name>», «move on warmly» → «move on».
// Каждая правка проверяется: не нашёлся якорь — скрипт падает. Поменяли
// методичку — лучше узнать это здесь, чем в звонке.
//
// Запуск: node scripts/extract-buddy-level-packs.js

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'data', 'speaking-buddy')
const OUT_DIR = path.join(ROOT, 'agent', 'level-packs')
const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2']

const DROP_SECTIONS = new Set(['1', '15', '17'])

function part20(doc, level) {
  const lines = doc.split(/\r?\n/)
  // В документе заголовок Part 20 встречается дважды: в задании (перечень
  // разделов ответа) и в самом ответе. Нужен последний — он и есть результат.
  const starts = lines.flatMap((l, i) => (/^# .*PART 20 — PRODUCTION/.test(l) ? [i] : []))
  const s = starts[starts.length - 1]
  const e = s == null ? -1 : lines.findIndex((l, i) => i > s && /^# .*PART 21 — /.test(l))
  if (s == null || e < 0) throw new Error(`${level}: Part 20 not found`)
  // Сам промпт — блок кода с отступом в 4 пробела; строка-пояснение перед ним
  // («Copy the block below…») в пакет не идёт.
  const body = lines.slice(s + 1, e)
  const first = body.findIndex((l) => /^ {4}# .*SPEAKING BUDDY — SYSTEM PROMPT/.test(l))
  if (first < 0) throw new Error(`${level}: prompt title not found`)
  return body.slice(first).map((l) => l.replace(/^ {4}/, ''))
}

function splitSections(lines) {
  const out = []
  let cur = null
  for (const l of lines) {
    const m = /^## (\d+)\. /.exec(l) || /^## (TURN DECISION ALGORITHM)/.exec(l)
    if (m) {
      cur = { id: m[1], lines: [l] }
      out.push(cur)
    } else if (cur) {
      cur.lines.push(l)
    }
  }
  return out
}

function edit(text, level, from, to) {
  if (!text.includes(from)) throw new Error(`${level}: anchor missing: ${JSON.stringify(from)}`)
  return text.split(from).join(to)
}

function buildPack(level) {
  const doc = fs.readFileSync(path.join(SRC_DIR, `${level}.md`), 'utf8')
  const sections = splitSections(part20(doc, level))
  const ids = sections.map((x) => x.id)
  for (const need of ['1', '4', '11', '14', '15', '16', '17', 'TURN DECISION ALGORITHM']) {
    if (!ids.includes(need)) throw new Error(`${level}: section ${need} missing (got ${ids.join(',')})`)
  }
  let text = sections
    .filter((x) => !DROP_SECTIONS.has(x.id))
    .map((x) => x.lines.join('\n').trimEnd())
    .join('\n\n')

  // Язык звонка решает обвязка (LANGUAGES), а не пустая политика документа.
  const l1 = /^L1 use: follow L1_HINT_POLICY\..*$/m
  if (!l1.test(text)) throw new Error(`${level}: L1 line missing`)
  text = text.replace(l1, 'L1 use: follow the LANGUAGES section of this prompt.')

  if (text.includes('{{BUDDY_NAME}}')) text = text.split('{{BUDDY_NAME}}').join('<your name>')
  if (/move on warmly/.test(text)) text = edit(text, level, 'move on warmly', 'move on')
  if (/\{\{/.test(text)) throw new Error(`${level}: unresolved {{placeholder}} left`)

  const header = [
    '<!--',
    `Пакет уровня ${level} для Speaking Buddy — СГЕНЕРИРОВАН, руками не править.`,
    `Источник: data/speaking-buddy/${level}.md, Part 20. Скрипт и список правок:`,
    'scripts/extract-buddy-level-packs.js.',
    '-->',
    '',
    `# ${level} LEVEL PACK — JTS course methodology (Speaking Buddy v2, Part 20)`,
    '',
  ].join('\n')
  return header + text.trim() + '\n'
}

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const level of LEVELS) {
  const pack = buildPack(level)
  const out = path.join(OUT_DIR, `${level.toLowerCase()}.md`)
  fs.writeFileSync(out, pack)
  console.log(`${level}: ${pack.length} chars -> ${path.relative(ROOT, out)}`)
}
