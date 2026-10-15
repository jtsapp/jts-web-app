/**
 * Палитра тёмной темы: куда уходит каждый цвет светлой темы. Логика вынесена
 * из scripts/gen-dark-theme.js, чтобы её можно было накрыть тестом.
 *
 * Правило «по брендбуку» (JustToStudy_Guide_1.0, 2.1 «Палитра», 13.10.2026):
 * у бренда пять цветов — фиолетовый, голубой, зелёный, оранжевый, жёлтый —
 * и серые без оттенка. Первый набросок (09.10) пересчитывал каждую пастель «по
 * месту» — тот же оттенок, только темнее, — и рядом вставали бурый, оливковый
 * и серо-синий: руководство отклонило тему словами «не сочетались цвета».
 * Поэтому теперь любой цветной цвет притягивается к ближайшему семейству
 * бренда, а внутри семейства — к одной из немногих ступеней (тинт, мягкий,
 * сплошной, глубокий). Ступени — токены --dk-* из src/theme-dark.css, и доля
 * цвета у тинтов всех семейств одна: поэтому они сочетаются.
 *
 * Функции возвращают имя токена (без --dk-), {L,C,H} или null — «оставить
 * как есть».
 */

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

function oklabToLinear({ L, C, H }) {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function toRgb(lch) {
  return oklabToLinear(lch).map((c) => Math.round(Math.min(255, Math.max(0, unlin(Math.min(1, Math.max(0, c)))))))
}

// Пересчитанный цвет может выйти за sRGB (тёмный насыщенный голубой) —
// тогда снижаем насыщенность, а не режем каналы: обрезка уводит оттенок.
function inGamut({ L, C, H }) {
  for (let c = C; c > 0; c -= 0.005) {
    if (oklabToLinear({ L, C: c, H }).every((v) => v >= -0.001 && v <= 1.001)) return { L, C: c, H }
  }
  return { L, C: 0, H }
}

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))

// Насыщенность, ниже которой цвет считается серым. Сюда попадают и
// серо-синие slate (#64748b, C≈0.03): в теме по брендбуку серые без оттенка.
const NEUTRAL_C = 0.045
// У почти белых насыщенность мала сама по себе, поэтому порог ниже: пастель
// «верно» #e6f6ec — это C 0.021, а лавандовые подложки светлой темы
// (#ececf3, #f3f0fa, C ≤ 0.018) — её серые, они уходят в графит.
const NEUTRAL_C_LIGHT = 0.02
const isNeutral = ({ L, C }) => C < (L >= 0.9 ? NEUTRAL_C_LIGHT : NEUTRAL_C)

// Опорные цвета семейств — HEX из брендбука (2.1). Красного у бренда нет, но
// «неверно» оранжевым спуталось бы с карточкой «Чтение», поэтому ошибкам
// оставлен один свой красный (#ff5a4e). Пурпурный и розовый уходят к
// ближайшему по оттенку — красному или фиолетовому.
const FAMILIES = {
  acc: '#874bf8',
  blue: '#0aafff',
  green: '#00d441',
  orange: '#ff7d1d',
  yellow: '#ffad00',
  red: '#ff5a4e',
}
const ANCHORS = Object.entries(FAMILIES).map(([name, h]) => ({ name, H: toOklch(hex(h)).H }))

const hueDist = (a, b) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// Семейство бренда для цвета или null — серый.
function familyOf(lch) {
  if (isNeutral(lch)) return null
  const { H } = lch
  let best = ANCHORS[0]
  for (const a of ANCHORS) if (hueDist(H, a.H) < hueDist(H, best.H)) best = a
  return best.name
}

// Ступени фона. Насыщенность разводит «пастель» и «яркую кнопку» с одной
// светлотой: #bbf7d0 (C 0.09) — мягкий фон, #22c55e (C 0.19) — заливка.
function stepOf({ L, C }) {
  if (L >= 0.9) return 'tint'
  if (L >= 0.75 && C < 0.12) return 'soft'
  if (L >= 0.35) return 'solid'
  return 'deep'
}

function bgOf(lch) {
  const { L } = lch
  const fam = familyOf(lch)
  if (!fam) {
    if (L >= 0.99) return 'card'
    if (L >= 0.955) return 'page'
    if (L >= 0.85) return 'chip'
    if (L >= 0.55) return 'raised'
    if (L >= 0.18) return 'ink-bg'
    return null // почти чёрное — видео, тёмные секции, оверлеи
  }
  const step = stepOf(lch)
  if (fam === 'acc') {
    if (step === 'solid') return L >= 0.5 ? 'acc' : 'acc-strong'
    return `acc-${step}`
  }
  return step === 'solid' ? fam : `${fam}-${step}`
}

function textOf(lch) {
  const { L } = lch
  const fam = familyOf(lch)
  if (!fam) {
    if (L < 0.35) return 'text'
    if (L < 0.6) return 'text-2'
    if (L < 0.97) return 'muted'
    return null
  }
  if (fam === 'acc') return L >= 0.85 ? 'acc-on' : 'acc-text'
  // Светлый цветной текст стоит на цветных баннерах — его не трогаем.
  // Остальной — сплошной цвет бренда: на тёмной карточке все пять читаются
  // (контраст проверяет dark-palette.test.js).
  return L < 0.72 ? fam : null
}

function lineOf(lch) {
  const fam = familyOf(lch)
  if (!fam) return lch.L >= 0.8 ? 'line' : 'line-strong'
  if (lch.L >= 0.8) return `${fam}-line`
  return fam
}

// Сплошной цвет семейства — для цветных теней и свечения.
const solidOf = (lch) => familyOf(lch)

module.exports = {
  NEUTRAL_C,
  isNeutral,
  FAMILIES,
  toOklch,
  toRgb,
  inGamut,
  familyOf,
  bgOf,
  textOf,
  lineOf,
  solidOf,
}
