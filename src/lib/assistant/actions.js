// Действия Луны: открыть раздел сайта и нажать кнопку экрана.
//
// Модель просит действие меткой в конце ответа (правила — prompt.js):
//   [[OPEN practice-speaking]]      — предложить: под ответом кнопка «Открыть…»
//   [[OPEN_NOW practice-speaking]]  — открыть сразу (ученик попросил или согласился)
//   [[OPEN_NOW course.B1.L5]]       — открыть конкретную вещь по её адресу (items/refs.js;
//   29.10.2026): урок курса, тему, текст… Адрес сверяется с каталогом этого запроса
//   (items/catalog.js) — подпись берётся оттуда, закрытый урок действием не становится;
//   каталога нет (ученик ответил «да» на её «Открыть?») — адрес сверит роут (unresolved).
//   [[FEEDBACK teacher | Преподаватель опоздал на 15 минут]] / [[FEEDBACK_NOW …]] — открыть
//   Feedback с категорией (teacher | manager | platform | review) и черновиком обращения
//   из слов ученика (ТЗ v2.0, этап 1). Отправляет ученик сам: окно только заполняет форму.
//   [[CLICK 7]] / [[CLICK_NOW 7]] — нажать кнопку экрана с номером 7 из снимка
//   (screenSnapshot.snapshotWithRefs; 21.10.2026). Номер сверяется со снимком этого
//   же запроса, подпись берётся оттуда — окно по ней проверит, что жмёт ту же кнопку.
//
// Роут вырезает метку из ответа (ученик её не видит, озвучка не читает) и
// сверяет раздел с белым списком (destinations.js). Клиенту действие уходит
// служебным хвостом стрима — как «отчёт записан»: заголовки HTTP к концу
// ответа уже ушли, а метка в конце ответа приходит последней.
//
// Хвост начинается с SERVICE_PREFIX, и клиент срезает всё от него до конца —
// поэтому служебные метки идут только после всего видимого текста.

import { REPORTED_STREAM_MARKER, createHoldbackFilter } from './report.js'
import { validAction } from './destinations.js'
import { isItemRef } from './items/refs.js'

// Форму модель местами путает (живой прогон 15.10.2026: «[[OPEN id="practice-listening"]]»),
// поэтому двоеточие, «id=» и кавычки вокруг id прощаем — раздел всё равно сверяется со списком.
// «#» перед номером кнопки — тоже: в снимке номер так и написан («[кнопка #7 …]»).
// TOUR — метка прежнего тура «от Луны» (убран 28.10.2026): её ещё может написать модель
// по старой истории разговора. Ученику её не показываем, а делаем из неё «открыть» —
// тур раздела выйдет там сам (первый заход) или по «?».
// Точка — в адресе вещи (course.B1.L5): он длиннее id раздела, отсюда и длина.
const MODEL_MARK = /^\[\[(OPEN|TOUR|CLICK)(_NOW)?(?:\s+|\s*:\s*)(?:id\s*=\s*)?["'«#]?([A-Za-z0-9_.-]{1,56})["'»]?\s*\]\]$/
// Длиннее этого метка модели не бывает: «[[» без закрытия дальше — просто текст.
const MAX_MARK = 72

// Обращение в Feedback: черновик — свободный текст, поэтому метка длиннее остальных. Квадратных скобок в черновике нет:
// «]]» закрыл бы метку раньше времени.
const FEEDBACK_MARK = /^\[\[FEEDBACK(_NOW)?\s+(teacher|manager|platform|review)\b\s*(?:\|\s*([^[\]]*?))?\s*\]\]$/i
const FEEDBACK_HEAD = '[[FEEDBACK'
// Держим до конца ответа (800 токенов модели): длинный черновик иначе вылез бы ученику текстом метки.
const MAX_FEEDBACK_MARK = 2400
export const FEEDBACK_CATEGORIES = ['teacher', 'manager', 'platform', 'review']
// Поле формы — до 2000 символов; черновик Луны — несколько предложений, длиннее — уже пересказ разговора.
const MAX_DRAFT = 600

/** Черновик обращения: одна строка без служебных скобок, не длиннее MAX_DRAFT. */
export function cleanDraft(text) {
  return String(text ?? '')
    .replace(/[[\]«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DRAFT)
}

function feedbackAction(category, draft, now) {
  const cat = String(category || '').toLowerCase()
  if (!FEEDBACK_CATEGORIES.includes(cat)) return null
  return { kind: 'open', target: 'feedback', now: Boolean(now), feedback: { category: cat, draft: cleanDraft(draft) } }
}

// Хвост обращения: черновик закодирован (encodeURIComponent не оставляет ни пробелов, ни скобок, ни «»).
const FEEDBACK_TAIL = /\[\[ASST_ACTION feedback (teacher|manager|platform|review) (now|offer)(?: ([A-Za-z0-9%._~!*'()-]+))?\]\]/

export const SERVICE_PREFIX = '[[ASST_'
const ACTION_TAIL = /\[\[ASST_ACTION (open|click) ([A-Za-z0-9_.-]+) (now|offer)(?: «([^«»[\]]{1,80})»)?\]\]/

/** Подпись кнопки с номером ref в снимке экрана; нет такой кнопки — null. */
export function buttonOnScreen(screenText, ref) {
  const n = Number(ref)
  if (!Number.isInteger(n) || n < 1) return null
  const m = new RegExp(`\\[кнопка #${n} «(.+?)»(?= неактивна| \\(|\\])`).exec(String(screenText ?? ''))
  return m ? m[1] : null
}

function clickAction(ref, now, screenText) {
  const label = buttonOnScreen(screenText, ref)
  return label ? { kind: 'click', target: String(Number(ref)), label, now: Boolean(now) } : null
}

// Вещь по адресу: из каталога запроса — с подписью (закрытая — не действие); без
// каталога или не нашлась в нём — на сверку роуту (unresolved).
function itemAction(ref, now, items) {
  const it = items?.get(ref)
  if (!it) return { kind: 'open', target: ref, now, item: true, unresolved: true }
  return it.locked ? null : { kind: 'open', target: ref, now, item: true, label: it.label }
}

// В хвосте подпись — в «»: скобки и кавычки из неё убраны, чтобы не сломать разбор.
const tailLabel = (s) => String(s ?? '').replace(/[«»[\]]/g, '').slice(0, 80)

/** Метка действия в формате модели — для истории разговора (см. AssistantWidget). */
export function actionMarker(action) {
  if (!action) return ''
  if (action.feedback) {
    const { category, draft } = action.feedback
    return `[[FEEDBACK${action.now ? '_NOW' : ''} ${category}${draft ? ` | ${draft}` : ''}]]`
  }
  return `[[${action.kind.toUpperCase()}${action.now ? '_NOW' : ''} ${action.target}]]`
}

/** Служебный хвост стрима с действием. */
export function actionTail(action) {
  if (!action) return ''
  const mode = action.now ? 'now' : 'offer'
  if (action.feedback) {
    const draft = action.feedback.draft ? ` ${encodeURIComponent(action.feedback.draft)}` : ''
    return `[[ASST_ACTION feedback ${action.feedback.category} ${mode}${draft}]]`
  }
  return action.kind === 'click' || action.label
    ? `[[ASST_ACTION ${action.kind} ${action.target} ${mode} «${tailLabel(action.label)}»]]`
    : `[[ASST_ACTION ${action.kind} ${action.target} ${mode}]]`
}

/**
 * Фильтр ответа модели на сервере: вырезает метки действий, первую годную
 * запоминает. Метка раздела не из белого списка тоже вырезается — показывать
 * ученику «[[OPEN что-то]]» незачем, — но действием не становится.
 *
 * Кусок стрима может оборвать метку посередине («[[OPE» + «N practice]]»),
 * поэтому всё от «[[» держится, пока метка не закроется или не станет ясно,
 * что это обычный текст.
 *
 * screenText — снимок экрана этого запроса: по нему сверяется номер кнопки метки
 * нажатия (номера нет — метка вырезается, действия нет).
 */
export function createActionFilter({ screenText = '', items = null } = {}) {
  let hold = ''
  let action = null
  return {
    push(chunk) {
      let s = hold + String(chunk ?? '')
      hold = ''
      let out = ''
      for (;;) {
        const i = s.indexOf('[[')
        if (i < 0) {
          // Одиночная «[» в конце может оказаться началом метки.
          if (s.endsWith('[')) {
            out += s.slice(0, -1)
            hold = '['
          } else out += s
          return out
        }
        out += s.slice(0, i)
        s = s.slice(i)
        const j = s.indexOf(']]', 2)
        if (j < 0) {
          if (s.length < (s.startsWith(FEEDBACK_HEAD) ? MAX_FEEDBACK_MARK : MAX_MARK)) {
            hold = s
            return out
          }
          out += '[['
          s = s.slice(2)
          continue
        }
        const mark = s.slice(0, j + 2)
        s = s.slice(j + 2)
        const fb = FEEDBACK_MARK.exec(mark)
        if (fb) {
          if (!action) action = feedbackAction(fb[2], fb[3], Boolean(fb[1]))
          continue
        }
        const m = MODEL_MARK.exec(mark)
        if (!m) {
          out += mark
          continue
        }
        if (!action) {
          const kind = m[1].toLowerCase()
          action =
            kind === 'click'
              ? clickAction(m[3], Boolean(m[2]), screenText)
              : isItemRef(m[3])
                ? itemAction(m[3], Boolean(m[2]), items)
                : validAction('open', m[3].toLowerCase(), Boolean(m[2]))
        }
      }
    },
    flush() {
      const out = hold
      hold = ''
      return out
    },
    action() {
      return action
    },
  }
}

/**
 * Фильтр стрима на клиенте: срезает служебный хвост ([[ASST_…]]) и разбирает
 * его — записана ли поломка и какое действие предлагает Луна.
 */
export function createServiceTailFilter() {
  const inner = createHoldbackFilter(SERVICE_PREFIX)
  const tail = () => (inner.found() ? SERVICE_PREFIX + (inner.after() || '') : '')
  return {
    push: inner.push,
    flush: inner.flush,
    get reported() {
      return tail().includes(REPORTED_STREAM_MARKER)
    },
    get action() {
      const fb = FEEDBACK_TAIL.exec(tail())
      if (fb) {
        let draft = ''
        try {
          draft = fb[3] ? decodeURIComponent(fb[3]) : ''
        } catch {
          draft = ''
        }
        return feedbackAction(fb[1], draft, fb[2] === 'now')
      }
      const m = ACTION_TAIL.exec(tail())
      if (!m) return null
      if (m[1] === 'click') return m[4] ? { kind: 'click', target: m[2], label: m[4], now: m[3] === 'now' } : null
      if (isItemRef(m[2])) return { kind: 'open', target: m[2], now: m[3] === 'now', item: true, label: m[4] || '' }
      return validAction(m[1], m[2], m[3] === 'now')
    },
  }
}
