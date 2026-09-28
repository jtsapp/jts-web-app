// Снимок экрана для помощника: текст, который ученик видит прямо сейчас, плюс
// то, что он ввёл в поля. Помощнику это заменяет «глаза» — с ним он может
// ответить «почему мой ответ неверный» или «что делать на этой странице», не
// зная устройства каждого плеера по отдельности.
//
// Почему DOM, а не данные экранов. Экранов с заданиями больше десятка (курс,
// уроки, домашка, практика, словарь), и у каждого своё состояние. Снимок видимого
// текста покрывает их все без правки каждого — и даёт главное свойство даром:
// помощник знает ровно то, что знает ученик. Эталон ответа появляется на экране
// только после «Проверить», значит и помощнику он виден только тогда же, и
// подсказать решение непроверенного задания он не может.
//
// Приватность: пароли, файлы, скрытые поля, email и телефон не попадают в
// снимок — только отметка, что поле есть. Всё, что помечено
// data-assistant-ignore, пропускается вместе с потомками (так помощник не
// читает сам себя).

export const SNAPSHOT_MAX_CHARS = 6000
// Одно поле ввода не должно съесть весь снимок (сочинение в «Письме»).
const FIELD_MAX_CHARS = 600

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'CANVAS', 'IFRAME', 'VIDEO', 'AUDIO', 'OBJECT',
])
const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DETAILS', 'DIALOG', 'DIV', 'DL', 'DT',
  'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY', 'TABLE', 'TR', 'UL', 'BR',
])
// Поля, значение которых помощнику не нужно и светить его незачем.
const PRIVATE_INPUT_TYPES = new Set(['password', 'hidden', 'file', 'email', 'tel'])

const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s)

function isHidden(el) {
  if (el.hidden) return true
  if (el.getAttribute('aria-hidden') === 'true') return true
  if (el.hasAttribute('data-assistant-ignore')) return true
  const inline = el.style
  if (inline && (inline.display === 'none' || inline.visibility === 'hidden')) return true
  const view = el.ownerDocument?.defaultView
  if (view?.getComputedStyle) {
    try {
      const cs = view.getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return true
    } catch {
      /* узел вне документа — считаем видимым */
    }
  }
  return false
}

// Плееры помечают проверенное поле классами is-wrong / is-correct (так же их
// красит CSS). Помощнику это важно: «неверным» отмечено именно это поле.
function verdictOf(el) {
  const cls = typeof el.className === 'string' ? el.className : ''
  if (/\bis-wrong\b/.test(cls)) return ' (отмечено как неверное)'
  if (/\bis-correct\b/.test(cls)) return ' (отмечено как верное)'
  return ''
}

function describeField(el) {
  const tag = el.tagName
  if (tag === 'SELECT') {
    const opt = el.options?.[el.selectedIndex]
    return `[выбор: «${squash(opt?.text)}»]`
  }
  const type = (el.getAttribute('type') || 'text').toLowerCase()
  if (tag === 'INPUT' && PRIVATE_INPUT_TYPES.has(type)) return type === 'hidden' ? '' : '[поле ввода]'
  if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio')) {
    return el.checked ? '[отмечено]' : '[не отмечено]'
  }
  if (tag === 'INPUT' && ['button', 'submit', 'reset'].includes(type)) {
    return `[кнопка «${squash(el.value)}»]`
  }
  const value = clip(squash(el.value), FIELD_MAX_CHARS)
  const label = squash(el.getAttribute('aria-label') || el.getAttribute('placeholder'))
  const named = label ? ` ${label}` : ''
  return value
    ? `[поле${named}: ученик ввёл «${value}»${verdictOf(el)}]`
    : `[пустое поле${named}]`
}

function walk(node, out) {
  if (node.nodeType === 3) {
    // Пробел между двумя <span> — тоже текст: без него «и хвост» склеился бы
    // в «ихвост». Лишние пробелы схлопнутся при сборке строк.
    const text = node.nodeValue.replace(/\s+/g, ' ')
    if (text) out.push(text)
    return
  }
  if (node.nodeType !== 1) return
  const el = node
  if (SKIP_TAGS.has(el.tagName) || isHidden(el)) return

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
    const field = describeField(el)
    if (field) out.push(` ${field} `)
    return
  }
  if (el.isContentEditable && el.getAttribute('contenteditable') !== null) {
    const value = clip(squash(el.textContent), FIELD_MAX_CHARS)
    out.push(value ? ` [поле: ученик ввёл «${value}»] ` : ' [пустое поле] ')
    return
  }
  if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
    const label = squash(el.textContent) || squash(el.getAttribute('aria-label') || el.getAttribute('title'))
    if (label) out.push(` [кнопка «${clip(label, 80)}»${el.disabled ? ' неактивна' : ''}] `)
    return
  }
  if (el.tagName === 'IMG') {
    const alt = squash(el.getAttribute('alt'))
    if (alt) out.push(` [картинка: ${alt}] `)
    return
  }

  const block = BLOCK_TAGS.has(el.tagName)
  if (block) out.push('\n')
  for (const child of el.childNodes) walk(child, out)
  if (block) out.push('\n')
}

/**
 * Видимый текст узла `root` в виде строк, с полями ввода и кнопками.
 * Длина ограничена `maxChars`; обрезанный снимок кончается пометкой.
 */
export function snapshotScreen(root, { maxChars = SNAPSHOT_MAX_CHARS } = {}) {
  if (!root) return ''
  const out = []
  walk(root, out)
  const text = out
    .join('')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…[снимок обрезан]` : text
}
