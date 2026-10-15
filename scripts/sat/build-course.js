#!/usr/bin/env node
// Курс «36 юнитов» SAT для веба (фаза 8 docs/sat/PLAN.md) — из выгрузки прототипа, не руками.
//
//   node scripts/sat/export-sat.js          # сначала выгрузка: build/sat/reference/programme.json
//   node scripts/sat/build-course.js [--build build/sat]
//
// Пишет:
//   src/sat/data/course.json        — каркас курса: месяцы, юниты, официальные тесты, домашка после юнита (~30 КБ,
//                                     его читают «Материалы» и страница юнита);
//   public/sat/course/<код>.json    — письменный урок юнита (lead + части), грузится только на его странице: 24 урока
//                                     весят ~150 КБ, и в общий бандл им незачем.
// Правки текста идут в прототип (jts-sat-platform, tools/html2teach.py → js/data/programme-teach.js), затем обе команды.
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const i = process.argv.indexOf('--build')
const BUILD = path.resolve(ROOT, i > 0 ? process.argv[i + 1] : 'build/sat')
const SRC = path.join(BUILD, 'reference', 'programme.json')
if (!fs.existsSync(SRC)) {
  console.error(`Нет ${SRC} — сначала node scripts/sat/export-sat.js`)
  process.exit(1)
}
const p = JSON.parse(fs.readFileSync(SRC, 'utf8'))

// в вебе расписание одно — три юнита в неделю (у прототипа n2 давно совпадает с n3 и не используется)
const lessons = p.lessons.map((l) => ({
  code: l.code,
  unit: l.unit,
  n: l.n3,
  week: l.week,
  ...(l.diagnostic ? { diagnostic: true } : {}),
  ...(p.drills?.[l.code]?.hard ? { hard: true } : {}),
  t: l.t,
  skills: l.skills,
}))
const teach = {}
for (const [code, x] of Object.entries(p.teach || {})) {
  teach[code] = { parts: x.parts.length, minutes: x.parts.reduce((s, part) => s + (Number((part.mins || '').match(/\d+/)?.[0]) || 0), 0) }
}

const course = {
  lessonsTotal: p.lessonsTotal,
  wordsPerLesson: p.wordsPerLesson,
  schedule: { perWeek: p.schedules[0].perWeek, weeks: p.schedules[0].weeks, tests: p.schedules[0].tests },
  phases: p.phases.map((ph) => ({ id: ph.id, weeks: ph.weeks3, from: ph.from3, to: ph.to3, name: ph.name, lead: ph.lead })),
  officialTests: p.officialTests,
  gates: p.gates.map((g) => ({ n: g.n, afterLesson: g.afterLesson3, name: g.name })),
  gateRule: p.gateRule,
  homework: p.homework,
  units: p.units,
  lessons,
  teach,
}

const dataFile = path.join(ROOT, 'src', 'sat', 'data', 'course.json')
fs.writeFileSync(dataFile, JSON.stringify(course, null, 1) + '\n')

const outDir = path.join(ROOT, 'public', 'sat', 'course')
fs.mkdirSync(outDir, { recursive: true })
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f))
for (const [code, x] of Object.entries(p.teach || {})) {
  fs.writeFileSync(path.join(outDir, `${code}.json`), JSON.stringify({ code, lead: x.lead || '', parts: x.parts }) + '\n')
}
console.log(`course.json: ${lessons.length} юнитов, ${course.phases.length} месяца; уроков: ${Object.keys(teach).length} → public/sat/course/`)
