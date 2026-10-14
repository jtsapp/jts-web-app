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
 * Цвет пересчитывается в OKLCH и по роли свойства:
 *   фон     — белое → поверхность карточки, почти белое → фон страницы,
 *             пастель → тинт своего семейства бренда, яркое → цвет бренда;
 *   текст   — тёмное → светлое, цветное → цвет бренда;
 *   граница — светлое → тонкая светлая линия на тёмном.
 * Серые и пять семейств бренда (scripts/lib/dark-palette.js) выходят ТОЛЬКО
 * токенами --dk-* (значения — в src/theme-dark.css), поэтому палитра
 * правится в одном месте, без перегенерации.
 *
 * Запуск: node scripts/gen-dark-theme.js
 */
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')

const ROOT = path.join(__dirname, '..')
const LAYOUT = path.join(ROOT, 'src/app/layout.jsx')
const OUT = path.join(ROOT, 'src/theme-dark.generated.css')
const PREFIX = 'html[data-theme="dark"]'

// Порядок файлов — как в layout.jsx: от него зависит каскад.
const files = [...fs.readFileSync(LAYOUT, 'utf8').matchAll(/^import '\.\.\/(.+\.css)'/gm)]
  .map((m) => m[1])
  .filter((f) => !f.startsWith('theme-dark'))

// ---------- цвет ----------

const NAMED = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  orange: [255, 165, 0],
  gold: [255, 215, 0],
  yellow: [255, 255, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  whitesmoke: [245, 245, 245],
}

// Куда уходит каждый цвет (семейства бренда, ступени, токены) — в
// scripts/lib/dark-palette.js, там же почему.
const { NEUTRAL_C, toOklch, toRgb, inGamut, familyOf, bgOf, textOf, lineOf, solidOf } = require('./lib/dark-palette')
const ROLE = { bg: bgOf, text: textOf, border: lineOf }

const r3 = (x) => +x.toFixed(3)

function fmt(target, alpha) {
  if (target == null) return null
  if (typeof target === 'string') {
    const v = `var(--dk-${target})`
    return alpha < 1 ? `color-mix(in oklab, ${v} ${r3(alpha * 100)}%, transparent)` : v
  }
  const [r, g, b] = toRgb(inGamut(target))
  return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${r3(alpha)})` : `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function parseColor(s) {
  let m
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(s))) {
    let h = m[1]
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const n = (i) => parseInt(h.slice(i, i + 2), 16)
    return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) / 255 : 1 }
  }
  if ((m = /^rgba?\(([^)]*)\)$/i.exec(s))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3 || parts.slice(0, 3).some((p) => !/^[\d.]+%?$/.test(p))) return null
    const ch = (p) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p))
    const a = parts[3] == null ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])
    return { rgb: parts.slice(0, 3).map(ch), a }
  }
  const named = NAMED[s.toLowerCase()]
  return named ? { rgb: named, a: 1 } : null
}

// Полупрозрачные цвета — отдельная логика: чёрная дымка на светлом — это
// тень/разделитель/ховер, на тёмном её не видно, она должна стать светлой.
function mapColor(str, role, prop) {
  const c = parseColor(str)
  if (!c) return str
  const lch = toOklch(c.rgb)
  const isShadow = prop === 'box-shadow' || prop === 'text-shadow'
  if (c.a < 1) {
    if (!familyOf(lch)) {
      if (isShadow) return lch.L < 0.5 ? `rgba(0, 0, 0, ${r3(Math.min(c.a * 2, 0.6))})` : str
      if (lch.L < 0.5) {
        if (role === 'text') return fmt(textOf(lch), c.a) || str
        if (role === 'bg' && c.a >= 0.3) return str // скримы модалок
        return `rgba(255, 255, 255, ${r3(Math.min(c.a * (role === 'border' ? 1.4 : 1), 0.5))})`
      }
      // Белое стекло: плотное — это «карточка», тонкое — блик на цветном.
      if (role === 'bg' && c.a >= 0.6) return fmt(bgOf(lch), c.a) || str
      return str
    }
    // Цветная дымка (свечение, обводка, заливка с прозрачностью) — тот же
    // цвет бренда с той же прозрачностью: поверх тёмного она работает так же.
    // Плотная пастель — ступень фона, как у сплошного цвета.
    if (role === 'text' && !isShadow) return fmt(textOf(lch), c.a) || str
    if (role === 'bg' && !isShadow && lch.L >= 0.86) return fmt(bgOf(lch), c.a) || str
    return fmt(solidOf(lch), c.a)
  }
  if (isShadow) {
    // Сплошная обводка-кольцо (0 0 0 4px #fff) отделяет элемент от фона —
    // это фон, а не тень.
    return fmt(bgOf(lch), 1) || str
  }
  return fmt(ROLE[role](lch), 1) || str
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|(?<![\w-])(?:white|black|gray|grey|silver|red|green|blue|orange|gold|yellow|purple|pink|whitesmoke)(?![\w-])/g

function hasColor(value) {
  COLOR_RE.lastIndex = 0
  // Имена цветов внутри var(--purple) или url(...) — не цвета.
  const stripped = value.replace(/var\([^()]*\)/g, '').replace(/url\([^()]*\)/g, '')
  return COLOR_RE.test(stripped)
}

function mapValue(value, role, prop) {
  // url(...) и var(...) защищаем от замены, потом возвращаем.
  const keep = []
  const guarded = value.replace(/url\([^()]*\)|var\([^()]*\)/g, (m) => `\u0000${keep.push(m) - 1}\u0000`)
  const out = guarded.replace(COLOR_RE, (m) => mapColor(m, role, prop))
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i])
}

// ---------- роли свойств ----------

function roleOf(prop) {
  if (prop.startsWith('--')) {
    const p = prop.toLowerCase()
    if (/border|line|stroke|divider|ring|outline/.test(p)) return 'border'
    if (/text|ink|fg|muted|color-text|label|title|heading/.test(p)) return 'text'
    if (/bg|surface|card|fill|panel|back|track|chip|tile|paper|page/.test(p)) return 'bg'
    return 'auto'
  }
  if (prop === 'color' || prop === 'fill' || prop === 'stroke' || prop === 'caret-color' ||
      prop === 'text-decoration-color' || prop === '-webkit-text-fill-color' || prop === 'accent-color') return 'text'
  if (prop.startsWith('background') || prop === 'box-shadow' || prop === 'text-shadow') return 'bg'
  if (prop.startsWith('border') || prop.startsWith('outline') || prop === 'column-rule' ||
      prop === 'column-rule-color' || prop === 'scrollbar-color') return 'border'
  return null
}

const COLOR_PROPS = (prop) =>
  roleOf(prop) !== null &&
  // border-radius/width/style цвет не несут и каскад цвета не задевают.
  !/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?-(radius|width|style|image|spacing|collapse)$/.test(prop) &&
  !/^border-(top|bottom)-(left|right)-radius$/.test(prop) &&
  !/^border-(start|end)-(start|end)-radius$/.test(prop) &&
  !/^background-(size|position|repeat|attachment|clip|origin|blend-mode|position-x|position-y)$/.test(prop) &&
  !/^outline-(width|style|offset)$/.test(prop)

function prefixSelector(sel) {
  sel = sel.trim()
  if (sel.startsWith(':root')) return PREFIX + sel.slice(5)
  if (/^html(?![\w-])/.test(sel)) return PREFIX + sel.slice(4)
  return `${PREFIX} ${sel}`
}

// Неизвестная по имени переменная: светлое значение — скорее фон, тёмное —
// скорее текст (так у --ink/--muted и --blue-soft в styles.css).
function autoRole(value) {
  const m = value.match(COLOR_RE)
  if (!m) return 'bg'
  const c = parseColor(m[0])
  if (!c) return 'bg'
  const lch = toOklch(c.rgb)
  // Насыщенный цвет (--d-accent, --purple) — это заливка кнопок и плашек; как
  // текст он на тёмном и так читается. Иначе кнопка получала бы светлый
  // «текстовый» оттенок акцента и белая подпись на ней пропадала.
  if (lch.C >= NEUTRAL_C) return 'bg'
  return lch.L < 0.6 ? 'text' : 'bg'
}

// ---------- обход ----------

const SKIP_AT = new Set(['keyframes', '-webkit-keyframes', 'font-face', 'property', 'page', 'import', 'charset', 'counter-style'])
let rulesOut = 0
let declsOut = 0
let colorsMapped = 0

function convertContainer(src, dst) {
  src.each((node) => {
    if (node.type === 'atrule') {
      if (SKIP_AT.has(node.name.toLowerCase()) || !node.nodes) return
      const at = postcss.atRule({ name: node.name, params: node.params })
      convertContainer(node, at)
      if (at.nodes && at.nodes.length) dst.append(at)
      return
    }
    if (node.type !== 'rule') return
    const decls = []
    let colorful = false
    node.each((d) => {
      if (d.type !== 'decl') return
      const prop = d.prop.toLowerCase()
      if (!COLOR_PROPS(prop)) return
      if (prop.startsWith('--') && !hasColor(d.value)) return
      let value = d.value
      if (hasColor(value)) {
        let role = roleOf(prop)
        if (role === 'auto') role = autoRole(value)
        const mapped = mapValue(value, role, prop)
        if (mapped !== value) { colorful = true; colorsMapped++ }
        value = mapped
      }
      decls.push(postcss.decl({ prop: d.prop, value, important: d.important }))
    })
    // Копируем и правила без единого литерала (.btn--primary { background:
    // var(--purple) }): иначе тёмная копия .btn { background:#fff } с
    // поднятой специфичностью перебьёт их, и кнопка станет серой.
    if (!decls.length) return
    // Белый текст на заливке акцентом — отдельный токен: на светлом акценте
    // (оранжевый так и сравнивали) белый не дотягивает по контрасту, и
    // подпись нужно перекрасить вместе с заливкой.
    // Из цветов бренда белую подпись держит только фиолетовый (4.8:1). На
    // неоновых зелёном, голубом, оранжевом, жёлтом и красном белый текст
    // даёт 2–3:1 (плашка «верно» не читалась), поэтому на них подпись тёмная
    // (--dk-on-bright). Заливка бывает и локальной переменной
    // (.wb-tok.is-ok { background: var(--wb-green) }) — её раскрываем по
    // предпроходу.
    const fill = resolveVar(decls.find((d) => /^background(-color)?$/.test(d.prop))?.value || '')
    const BRIGHT = '(?:green|blue|orange|yellow|red)'
    const onToken = /^var\(--dk-acc(-strong)?\)|^linear-gradient\([^,]*,\s*var\(--dk-acc/.test(fill)
      ? 'on-acc'
      : new RegExp(`^var\\(--dk-${BRIGHT}\\)|^linear-gradient\\([^,]*,\\s*var\\(--dk-${BRIGHT}\\)`).test(fill)
        ? 'on-bright'
        : null
    if (onToken) {
      decls.forEach((d) => {
        if (d.prop !== 'color') return
        const c = parseColor(d.value.trim())
        if (c && c.a === 1 && toOklch(c.rgb).L >= 0.97) d.value = `var(--dk-${onToken})`
      })
    }
    let selectors
    try {
      selectors = node.selectors.map(prefixSelector)
    } catch {
      return
    }
    const rule = postcss.rule({ selectors })
    decls.forEach((d) => rule.append(d))
    dst.append(rule)
    rulesOut++
    declsOut += decls.length
  })
}

const parsed = files.map((f) => [f, postcss.parse(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { from: f })])

// Предпроход: во что в тёмной теме превращается каждая цветовая переменная
// (--wb-green: #22c55e → var(--dk-green)). Нужен только для выбора цвета
// подписи на заливке; одноимённые переменные разных разделов здесь
// склеиваются (последняя побеждает) — для этой цели достаточно.
const VARS = new Map()
for (const [, root] of parsed) {
  root.walkDecls((d) => {
    if (!d.prop.startsWith('--') || !hasColor(d.value)) return
    let role = roleOf(d.prop.toLowerCase())
    if (role === 'auto') role = autoRole(d.value)
    VARS.set(d.prop, mapValue(d.value, role, d.prop.toLowerCase()).trim())
  })
}
function resolveVar(value) {
  const m = /^var\((--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim())
  return m && VARS.has(m[1]) ? VARS.get(m[1]) : value
}

const out = postcss.root()
out.append(postcss.comment({ text: ' СГЕНЕРИРОВАНО scripts/gen-dark-theme.js — не править руками ' }))
for (const [f, root] of parsed) {
  const block = postcss.root()
  convertContainer(root, block)
  if (!block.nodes.length) continue
  out.append(postcss.comment({ text: ` ${f} ` }))
  block.each((n) => out.append(n.clone()))
}

fs.writeFileSync(OUT, out.toResult().css + '\n')
console.log(`${files.length} файлов → ${rulesOut} правил, ${declsOut} объявлений, ${colorsMapped} пересчитано → ${path.relative(ROOT, OUT)}`)
