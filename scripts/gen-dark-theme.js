#!/usr/bin/env node
/**
 * Набросок тёмной темы: генерирует src/theme-dark.generated.css из ВСЕХ
 * глобальных CSS-файлов приложения.
 *
 * Почему генератор, а не руками: в 33 файлах ~4700 цветов зашиты литералами,
 * общих переменных почти нет (styles.css держит только --purple/--ink/--muted).
 * Переписать каждый файл на токены — отдельный большой проект; для наброска
 * хватает «перевода» каждого правила: тот же селектор под
 * html[data-theme="dark"], те же свойства, но цвета пересчитаны в тёмные.
 *
 * Префикс добавляет всем правилам одинаковую специфичность (+0,1,1), поэтому
 * взаимный порядок каскада сохраняется — при условии, что дублируются ВСЕ
 * цветовые объявления, в том числе без литералов (background: none,
 * var(--x)): иначе тёмная версия правила A перебьёт исходное правило B,
 * которое в светлой теме стояло выше A.
 *
 * Как пересчитывается цвет — scripts/lib/dark-css.js (тем же правилом
 * красятся разделы Практики в Shadow DOM), куда уходит каждый цвет —
 * scripts/lib/dark-palette.js. Серые и пять семейств бренда выходят ТОЛЬКО
 * токенами --dk-* (значения — в src/theme-dark.css), поэтому палитра
 * правится в одном месте, без перегенерации.
 *
 * Запуск: node scripts/gen-dark-theme.js
 */
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const { collectVars, createConverter } = require('./lib/dark-css')

const ROOT = path.join(__dirname, '..')
const LAYOUT = path.join(ROOT, 'src/app/layout.jsx')
const OUT = path.join(ROOT, 'src/theme-dark.generated.css')
const PREFIX = 'html[data-theme="dark"]'

// Порядок файлов — как в layout.jsx: от него зависит каскад.
const files = [...fs.readFileSync(LAYOUT, 'utf8').matchAll(/^import '\.\.\/(.+\.css)'/gm)]
  .map((m) => m[1])
  .filter((f) => !f.startsWith('theme-dark'))

function prefixSelector(sel) {
  sel = sel.trim()
  if (sel.startsWith(':root')) return PREFIX + sel.slice(5)
  if (/^html(?![\w-])/.test(sel)) return PREFIX + sel.slice(4)
  return `${PREFIX} ${sel}`
}

const parsed = files.map((f) => [f, postcss.parse(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { from: f })])
const { convert, stats } = createConverter({ prefixSelector, vars: collectVars(parsed.map(([, root]) => root)) })

const out = postcss.root()
out.append(postcss.comment({ text: ' СГЕНЕРИРОВАНО scripts/gen-dark-theme.js — не править руками ' }))
for (const [f, root] of parsed) {
  const block = postcss.root()
  convert(root, block)
  if (!block.nodes.length) continue
  out.append(postcss.comment({ text: ` ${f} ` }))
  block.each((n) => out.append(n.clone()))
}

fs.writeFileSync(OUT, out.toResult().css + '\n')
console.log(`${files.length} файлов → ${stats.rules} правил, ${stats.decls} объявлений, ${stats.mapped} пересчитано → ${path.relative(ROOT, OUT)}`)
