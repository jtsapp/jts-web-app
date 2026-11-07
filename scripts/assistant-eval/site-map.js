// Отчёт «что Луна узнала нового» (ТЗ v2.0, 9.2а, уровень 2 — «при каждом релизе»): карта сайта из кода против снимка
// прошлого релиза и дыры базы знаний.
//
//   node scripts/assistant-eval/site-map.js           # отчёт: новое / изменилось / удалено + дыры базы
//   node scripts/assistant-eval/site-map.js --write   # обновить снимок (после того как статьи дописаны)
//   node scripts/assistant-eval/site-map.js --check   # для CI: код ≠ 1, если карта ушла от снимка или есть дыры
//
// Снимок — scripts/assistant-eval/site-map.snapshot.json, коммитится вместе с правкой экранов и статей: в PR видно,
// что поменялось у Луны. Сам отчёт пока печатается в консоль; канал рассылки ответственному выбирает школа.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSiteMap, diffSnapshots, knowledgeGaps, snapshotOf } from './siteMap.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const SNAPSHOT = path.join(HERE, 'site-map.snapshot.json')

const map = buildSiteMap({
  appSource: readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8'),
  i18nSource: readFileSync(path.join(ROOT, 'src/i18n.jsx'), 'utf8'),
})
const now = snapshotOf(map)
const before = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, 'utf8')) : null
const gaps = knowledgeGaps(map)

const lines = []
if (!before) lines.push('Снимка ещё нет — всё ниже новое.')
const diff = diffSnapshots(before || {}, now)
for (const [title, list] of [['Новое', diff.added], ['Изменилось', diff.changed], ['Удалено', diff.removed]]) {
  if (!list.length) continue
  lines.push(`\n${title} (${list.length}):`, ...list.map((s) => `  - ${s}`))
}
if (!diff.added.length && !diff.changed.length && !diff.removed.length) lines.push('Карта сайта и база знаний совпадают со снимком.')
lines.push(gaps.length ? `\nДыры базы знаний (${gaps.length}):` : '\nДыр в базе знаний нет: каждый экран, карточка и пункт меню описаны.')
for (const g of gaps) lines.push(`  - ${g}`)
console.log(lines.join('\n'))

if (process.argv.includes('--write')) {
  writeFileSync(SNAPSHOT, JSON.stringify(now, null, 2) + '\n')
  console.log(`\nСнимок записан: ${path.relative(ROOT, SNAPSHOT)}`)
}
if (process.argv.includes('--check') && (gaps.length || diff.added.length || diff.changed.length || diff.removed.length)) process.exit(1)
