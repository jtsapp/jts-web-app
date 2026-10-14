#!/usr/bin/env node
// Словарь и гид по Desmos SAT для веба (фаза 9 docs/sat/PLAN.md) — из выгрузки прототипа, не руками.
//
//   node scripts/sat/export-sat.js            # build/sat/reference/{vocab,vocab-games,desmos-guide}.json
//   node scripts/sat/build-reference.js [--build build/sat] [--src ../jts-sat-platform]
//
// Пишет:
//   public/sat/vocab/deck.json    — 514 карточек JTS (~150 КБ, грузится вкладкой «Словарь», в бандл ей незачем);
//   public/sat/vocab/games.json   — пропуск (cloze) и регистр (register), игры словаря;
//   src/sat/data/desmosGuide.json — 23 урока гида по Desmos с названиями en/ru/kk (названия прототип держит в своём
//                                   словаре интерфейса — i18n/<язык>.js, ключи desmos.section.<id>).
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.resolve(__dirname, '..', '..')
const arg = (name, def) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : def
}
const BUILD = path.resolve(ROOT, arg('--build', 'build/sat'))
const SRC = path.resolve(ROOT, arg('--src', '../jts-sat-platform'))
const ref = (f) => {
  const p = path.join(BUILD, 'reference', f)
  if (!fs.existsSync(p)) {
    console.error(`Нет ${p} — сначала node scripts/sat/export-sat.js`)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

const vocab = ref('vocab.json')
const games = ref('vocab-games.json')
const guide = ref('desmos-guide.json')

// названия уроков гида — из словарей интерфейса прототипа (исполняем файл, а не режем регуляркой)
const dict = {}
for (const lang of ['en', 'ru', 'kk']) {
  const ctx = { window: {} }
  ctx.window.JTS = { dict: {} }
  ctx.JTS = ctx.window.JTS
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'i18n', `${lang}.js`), 'utf8'), ctx)
  dict[lang] = ctx.JTS.dict[lang]
}
const title = (id) => Object.fromEntries(['en', 'ru', 'kk'].map((l) => [l, dict[l][`desmos.section.${id}`] || dict.en[`desmos.section.${id}`] || id]))

const out = path.join(ROOT, 'public', 'sat', 'vocab')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'deck.json'), JSON.stringify({ meta: vocab.meta, cards: vocab.cards }) + '\n')
fs.writeFileSync(path.join(out, 'games.json'), JSON.stringify({ meta: games.meta, cloze: games.cloze, register: games.register }) + '\n')

const sections = guide.map((s) => ({
  id: s.id,
  lesson: s.lesson,
  title: title(s.id),
  ...(s.lead ? { lead: s.lead } : {}),
  ...(s.steps ? { steps: s.steps } : {}),
  ...(s.tryIt ? { tryIt: s.tryIt } : {}),
  video: s.video || null,
  videoCredit: s.videoCredit || null,
  exercises: s.exercises || [],
}))
fs.writeFileSync(path.join(ROOT, 'src', 'sat', 'data', 'desmosGuide.json'), JSON.stringify({ sections }, null, 1) + '\n')
console.log(`словарь: ${vocab.cards.length} карточек, игры: ${games.cloze.length} + ${games.register.length}; гид Desmos: ${sections.length} уроков`)
