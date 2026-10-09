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
 *             пастель → тёмный тон того же оттенка, яркое — как есть;
 *   текст   — тёмное → светлое, белое и яркое — как есть;
 *   граница — светлое → тонкая светлая линия на тёмном.
 * Нейтральные и фиолетовые цвета бренда (оттенок ~282–310°) выходят токенами
 * --dk-* (значения — в src/theme-dark.css), поэтому палитра правится в
 * одном месте, без перегенерации.
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

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const unlin = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function toOklch([r, g, b]) {
  r = lin(r); g = lin(g); b = lin(b)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}

function toRgb({ L, C, H }) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return rgb.map((c) => Math.round(Math.min(255, Math.max(0, unlin(Math.min(1, Math.max(0, c)))))))
}

const lerp = (x, x0, x1, y0, y1) => y0 + ((Math.min(Math.max(x, x0), x1) - x0) / (x1 - x0)) * (y1 - y0)
const NEUTRAL_C = 0.045
const isAccent = ({ C, H }) => C >= 0.08 && H >= 282 && H <= 310

// Нейтральные и фиолетовые цвета квантуются в токены --dk-* (их значения —
// в src/theme-dark.css): так палитра темы правится в одном месте, и сменить
// акцент — значит переписать несколько токенов. Прочие цветные
// (зелёный «верно», красный «ошибка», пастель карточек) считаются по месту:
// токенов на каждый оттенок не напасёшься. Функции возвращают имя токена,
// {L,C,H} или null — «оставить как есть».
function bgOf({ L, C, H }) {
  if (C < NEUTRAL_C) {
    if (L >= 0.99) return 'card'
    if (L >= 0.955) return 'page'
    if (L >= 0.85) return 'chip'
    if (L >= 0.55) return 'raised'
    if (L >= 0.18) return 'ink-bg'
    return null // почти чёрное — видео, тёмные секции, оверлеи
  }
  if (isAccent({ C, H })) {
    if (L >= 0.86) return 'acc-tint'
    if (L >= 0.7) return 'acc-soft'
    if (L >= 0.5) return 'acc'
    return 'acc-strong'
  }
  if (L >= 0.86) return { L: lerp(L, 0.86, 1, 0.27, 0.31), C: Math.min(C * 0.9, 0.05), H }
  if (L >= 0.7) return { L: lerp(L, 0.7, 0.86, 0.44, 0.36), C: Math.min(C, 0.09), H }
  return null
}

function textOf({ L, C, H }) {
  if (C < NEUTRAL_C) {
    if (L < 0.35) return 'text'
    if (L < 0.6) return 'text-2'
    if (L < 0.97) return 'muted'
    return null
  }
  if (isAccent({ C, H })) return L >= 0.85 ? 'acc-on' : 'acc-text'
  if (L < 0.55) return { L: 0.8, C: Math.min(C, 0.14), H }
  if (L < 0.72) return { L: 0.76, C, H }
  return null
}

function lineOf({ L, C, H }) {
  if (C < NEUTRAL_C) return L >= 0.8 ? 'line' : 'line-strong'
  if (isAccent({ C, H })) return L >= 0.8 ? 'acc-line' : 'acc'
  if (L >= 0.8) return { L: 0.42, C: Math.min(C, 0.08), H }
  return null
}

const ROLE = { bg: bgOf, text: textOf, border: lineOf }

const r3 = (x) => +x.toFixed(3)

// Пересчитанный цвет может выйти за sRGB (тёмный насыщенный голубой) —
// тогда снижаем насыщенность, а не режем каналы: обрезка уводит оттенок.
function inGamut({ L, C, H }) {
  for (let c = C; c > 0; c -= 0.005) {
    const a = c * Math.cos((H * Math.PI) / 180)
    const b = c * Math.sin((H * Math.PI) / 180)
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ]
    if (rgb.every((v) => v >= -0.001 && v <= 1.001)) return { L, C: c, H }
  }
  return { L, C: 0, H }
}

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
    if (lch.C < NEUTRAL_C) {
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
    if (isAccent(lch)) {
      if (role === 'text') return fmt(textOf(lch), c.a)
      if (role === 'border') return fmt('acc', c.a)
      return fmt(lch.L >= 0.86 ? 'acc-tint' : 'acc', c.a)
    }
    if (role === 'bg' && !isShadow && lch.L >= 0.86) return fmt(bgOf(lch), c.a) || str
    return str
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
    const onAccent = decls.some(
      (d) => /^background(-color)?$/.test(d.prop) && /^var\(--dk-acc(-strong)?\)|^linear-gradient\([^,]*,\s*var\(--dk-acc/.test(d.value),
    )
    if (onAccent) {
      decls.forEach((d) => {
        if (d.prop !== 'color') return
        const c = parseColor(d.value.trim())
        if (c && c.a === 1 && toOklch(c.rgb).L >= 0.97) d.value = 'var(--dk-on-acc)'
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

const out = postcss.root()
out.append(postcss.comment({ text: ' СГЕНЕРИРОВАНО scripts/gen-dark-theme.js — не править руками ' }))
for (const f of files) {
  const css = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')
  const root = postcss.parse(css, { from: f })
  const block = postcss.root()
  convertContainer(root, block)
  if (!block.nodes.length) continue
  out.append(postcss.comment({ text: ` ${f} ` }))
  block.each((n) => out.append(n.clone()))
}

fs.writeFileSync(OUT, out.toResult().css + '\n')
console.log(`${files.length} файлов → ${rulesOut} правил, ${declsOut} объявлений, ${colorsMapped} пересчитано → ${path.relative(ROOT, OUT)}`)
