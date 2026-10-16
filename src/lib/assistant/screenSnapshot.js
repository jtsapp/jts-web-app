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
//
// Слепые зоны обёртки экрана. Часть того, что ученик видит, лежит вне `.scr-in`:
// окна, уведённые порталом в body (плеер караоке, карточка перевода слова, выбор
// цели — у обёртки есть transform, и fixed-окно внутри неё съезжало), и Shadow
// DOM движков-прототипов (SpeakSpin, «Числа»). Портал помечает свой корень
// data-assistant-overlay="<что это за окно>" — снимок читает такие окна первыми:
// ученик смотрит на них, а не на экран под ними, и обрезка длинного снимка не
// должна съесть именно окно. Открытый shadowRoot снимок проходит как обычных
// детей узла.

export const SNAPSHOT_MAX_CHARS = 6000
// Одно поле ввода не должно съесть весь снимок (сочинение в «Письме»).
const FIELD_MAX_CHARS = 600
// Эталон задания (data-assistant-expected): у «разложи по колонкам» и «соедини пары» он длинный, а у экрана воркбука —
// ключ всех пунктов разом (шесть предложений «собери фразу» — уже ~300 знаков).
const EXPECTED_MAX_CHARS = 800

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

// Блоком элемент бывает и по стилю: у плашки разбора <span class="cp-fb__why"> — display:block, и без перевода строки
// «Неверный ответ» склеивался с объяснением в «Неверный ответRain в этом уроке…».
const BLOCK_DISPLAYS = new Set(['block', 'flex', 'grid', 'list-item', 'table', 'table-row', 'flow-root'])

const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s)

// Прозрачное (opacity 0) тоже не видно: сообщение «Чисел» гаснет прозрачностью, а текст прошлого раунда остаётся в
// разметке, и помощник читал бы его как свежий. Не для корня — обёртка экрана в первый кадр анимации входа прозрачна,
// — и не для полей: самодельные флажки прячут настоящий <input> прозрачностью, а отметка в нём нужна.
const FIELD_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA'])

function isHidden(el, isRoot = false) {
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
      if (!isRoot && !FIELD_TAGS.has(el.tagName) && cs.opacity !== '' && Number(cs.opacity) === 0) return true
    } catch {
      /* узел вне документа — считаем видимым */
    }
  }
  return false
}

// Плееры помечают проверенный ответ классами is-wrong / is-right / is-correct
// (так же их красит CSS) — и у полей ввода, и у кнопок-вариантов (курс A0:
// `.cp-choice.is-wrong`). Без пометки на кнопке снимок выглядел бы как три
// одинаковых «favourite / like / don't like», и помощник путал выбор ученика
// с текстом объяснения в плашке.
//
// Разделы Практики писались в разное время и красят вердикт по-своему: воркбук и «Письмо» — is-no / is-ok, а
// раскрытый ответ — is-rev («Слушай и выбирай» — is-revealed), «Грамматика» — wrong / correct / picked-no,
// «Аудирование» — data-state="ok|no". Голые ok / no сюда не берём: слишком общие имена.
const WRONG_RE = /\b(is-wrong|is-no|wrong|picked-no)\b/
const RIGHT_RE = /\b(is-right|is-correct|is-ok|correct|picked-ok)\b/
const SHOWN_RE = /\b(is-rev|is-revealed)\b/

function verdictOf(el) {
  const cls = typeof el.className === 'string' ? el.className : ''
  const state = el.getAttribute('data-state')
  if (WRONG_RE.test(cls) || state === 'no' || state === 'wrong') return ' (отмечено как неверное)'
  if (RIGHT_RE.test(cls) || state === 'ok' || state === 'correct') return ' (отмечено как верное)'
  if (SHOWN_RE.test(cls)) return ' (верный ответ показал сайт)'
  if (/\bis-missed\b/.test(cls)) return ' (верный вариант, не выбран)'
  if (/\b(is-sel|is-on|is-set|sel)\b/.test(cls)) return ' (выбрано)'
  // Выбор до проверки «Чтение» отмечает только aria-checked: без этого Луна не знала, какой вариант ученик нажал.
  if (['aria-checked', 'aria-pressed', 'aria-selected'].some((a) => el.getAttribute(a) === 'true')) return ' (выбрано)'
  return ''
}

// Что читается как кнопка, кроме самого <button>: варианты «Чтения» — role="radio", вкладки — role="tab".
const PRESSABLE_ROLES = new Set(['button', 'radio', 'checkbox', 'option', 'switch', 'tab', 'menuitem'])

function isBlockByStyle(el) {
  const view = el.ownerDocument?.defaultView
  if (!view?.getComputedStyle) return false
  try {
    return BLOCK_DISPLAYS.has(view.getComputedStyle(el).display)
  } catch {
    return false
  }
}

function describeField(el) {
  const tag = el.tagName
  if (tag === 'SELECT') {
    const opt = el.options?.[el.selectedIndex]
    // Вердикт и у списка: в воркбуке после «Показать ответ» список сам встаёт на верный вариант (is-rev), и без
    // пометки это читалось бы как выбор ученика.
    return `[выбор: «${squash(opt?.text)}»${verdictOf(el)}]`
  }
  const type = (el.getAttribute('type') || 'text').toLowerCase()
  if (tag === 'INPUT' && PRIVATE_INPUT_TYPES.has(type)) return type === 'hidden' ? '' : '[поле ввода]'
  if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio')) {
    return el.checked ? '[отмечено]' : '[не отмечено]'
  }
  if (tag === 'INPUT' && ['button', 'submit', 'reset'].includes(type)) {
    return `[кнопка «${squash(el.value)}»]`
  }
  // После неверного ответа плеер подставляет в поле ВЕРНЫЙ ответ (так ученик его видит), а то, что он ввёл на самом
  // деле, кладёт в data-assistant-entered. Без этого снимок говорил «ученик ввёл «understand» (отмечено как неверное)»
  // про верное слово — и помощник переворачивал ответ ровно так же, как раньше с like / don't like.
  const entered = el.getAttribute('data-assistant-entered')
  const shown = clip(squash(el.value), FIELD_MAX_CHARS)
  const value = entered !== null ? clip(squash(entered), FIELD_MAX_CHARS) : shown
  const label = squash(el.getAttribute('aria-label') || el.getAttribute('placeholder'))
  const named = label ? ` ${label}` : ''
  const substituted = entered !== null && shown && shown !== value ? `; в поле сайт показал верный ответ «${shown}»` : ''
  if (value) return `[поле${named}: ученик ввёл «${value}»${verdictOf(el)}${substituted}]`
  // Воркбук по «Показать ответ» ставит ключ и в поле, которое ученик так и не заполнил: «пустое поле» соврало бы
  // о том, что видно на экране.
  return substituted ? `[поле${named}: ученик ничего не ввёл${substituted}]` : `[пустое поле${named}]`
}

// Что отрисовано внутри узла. У хоста Shadow DOM видно содержимое тени, а не
// светлые дети (их показывает только <slot>); у <slot> — то, что в него
// вставлено, иначе его запасное содержимое. Закрытая тень (mode: 'closed')
// снаружи недоступна — её экраны держат открытой.
function childrenOf(el) {
  if (el.shadowRoot) return el.shadowRoot.childNodes
  if (el.tagName === 'SLOT' && typeof el.assignedNodes === 'function') {
    const assigned = el.assignedNodes({ flatten: true })
    if (assigned.length) return assigned
  }
  return el.childNodes
}

function walk(node, out, isRoot = false) {
  if (node.nodeType === 3) {
    // Пробел между двумя <span> — тоже текст: без него «и хвост» склеился бы
    // в «ихвост». Лишние пробелы схлопнутся при сборке строк.
    const text = node.nodeValue.replace(/\s+/g, ' ')
    if (text) out.push(text)
    return
  }
  if (node.nodeType !== 1) return
  const el = node
  if (SKIP_TAGS.has(el.tagName) || isHidden(el, isRoot)) return

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
  if (el.tagName === 'BUTTON' || PRESSABLE_ROLES.has(el.getAttribute('role'))) {
    // Подпись — из видимого содержимого, а не из textContent: у плитки «Слушай и выбирай» внутри спрятана галочка
    // верного ответа, и textContent читал все плитки как «1✓», «2✓» ещё до ответа.
    const inner = []
    for (const child of childrenOf(el)) walk(child, inner)
    const label = squash(inner.join('')) || squash(el.getAttribute('aria-label') || el.getAttribute('title'))
    if (label) {
      const idle = el.disabled || el.getAttribute('aria-disabled') === 'true' ? ' неактивна' : ''
      out.push(` [кнопка «${clip(label, 80)}»${idle}${verdictOf(el)}] `)
    }
    return
  }
  // Полоса прогресса текста не несёт (дорожка и заливка — пустые span), всё — в aria. Без этого полоса чтения книги
  // выходила из снимка пустой.
  if (el.getAttribute('role') === 'progressbar') {
    const label = squash(el.getAttribute('aria-label'))
    const now = el.getAttribute('aria-valuenow')
    const max = Number(el.getAttribute('aria-valuemax')) || 100
    const value = squash(el.getAttribute('aria-valuetext')) || (now !== null && now !== '' ? `${Math.round((Number(now) / max) * 100)}%` : '')
    if (label || value) out.push(` [индикатор${label ? ` «${label}»` : ''}${value ? `: ${value}` : ''}] `)
    return
  }
  if (el.tagName === 'IMG') {
    const alt = squash(el.getAttribute('alt'))
    if (alt) out.push(` [картинка: ${alt}] `)
    return
  }

  const block = BLOCK_TAGS.has(el.tagName) || isBlockByStyle(el)
  if (block) out.push('\n')
  for (const child of childrenOf(el)) walk(child, out)
  // Плеер кладёт на плашку неверного ответа то, что задание считало верным (у половины шагов курса разбора нет, и
  // помощник иначе угадывал верный вариант — и называл верным «like» для «I ___ rain.»). Только после проверки.
  const expected = squash(el.getAttribute('data-assistant-expected'))
  if (expected) out.push(`\n [верный ответ по заданию: «${clip(expected, EXPECTED_MAX_CHARS)}»] \n`)
  if (block) out.push('\n')
}

/**
 * Видимый текст узла `root` в виде строк, с полями ввода и кнопками.
 * Длина ограничена `maxChars`; обрезанный снимок кончается пометкой.
 */
export function snapshotScreen(root, { maxChars = SNAPSHOT_MAX_CHARS } = {}) {
  if (!root) return ''
  const overlays = overlaysOutside(root)
    .map((el) => {
      const text = collect(el)
      if (!text) return ''
      const name = squash(el.getAttribute('data-assistant-overlay'))
      return `[поверх экрана открыто${name ? `: ${name}` : ' окно'}]\n${text}`
    })
    .filter(Boolean)
  const screen = collect(root)
  const text = overlays.length
    ? [...overlays, screen && `[экран под окном]\n${screen}`].filter(Boolean).join('\n')
    : screen
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…[снимок обрезан]` : text
}

function collect(node) {
  const out = []
  walk(node, out, true)
  return out
    .join('')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

// Окна-порталы текущего экрана: помечены data-assistant-overlay и лежат вне корня (внутри корня их и так прочтёт
// обход). Окно внутри другого окна читается вместе с внешним — второй раз его не берём.
function overlaysOutside(root) {
  const doc = root.ownerDocument
  if (!doc?.querySelectorAll) return []
  const marked = [...doc.querySelectorAll('[data-assistant-overlay]')]
  return marked.filter(
    (el) =>
      !root.contains(el) &&
      !el.contains(root) &&
      !el.closest('[data-assistant-ignore]') &&
      !marked.some((other) => other !== el && other.contains(el)),
  )
}
