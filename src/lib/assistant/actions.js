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
//   [[REPLAN 20]] / [[REPLAN_NOW 20]] — «У меня мало времени»: пересобрать сегодняшний план
//   под 20 минут (ТЗ v2.0, 5.2; 0 — вернуть обычный план). Делает окно ручкой бэкенда,
//   итог пишет само по ответу сервера (ge/plan/replan.js): модель новый день не видит.
//   [[BREAK 10]] / [[BREAK_NOW 5]] — перерыв: таймер у кнопки Луны на 5, 10 или 15 минут (ТЗ v2.0, 7.4; решение владельца 2),
//   работает, пока сайт открыт; по концу Луна сама пишет следующий шаг (событие break_over, events.js). Делает окно.
//   [[STOP_DAY]] / [[STOP_DAY_NOW]] — «На сегодня всё»: бэкенд засчитывает сделанное, оставшиеся свои задачи дня переносит
//   на следующий учебный день (lib/assistant/stopDay.js); итог пишет окно по ответу сервера, как у REPLAN.
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

// «Мало времени»: минуты числом; «мин» после числа модель иногда дописывает — прощаем.
const REPLAN_MARK = /^\[\[REPLAN(_NOW)?\s*:?\s*(\d{1,3})\s*(?:мин\S*|min\S*)?\s*\]\]$/i
const REPLAN_TAIL = /\[\[ASST_ACTION replan (\d{1,3}) (now|offer)\]\]/
// Границы — как у бэкенда (GePlanShortDay): 0 — обычный план.
export const REPLAN_MIN = 5
export const REPLAN_MAX = 180

function replanAction(minutes, now) {
  const n = Number(minutes)
  if (!Number.isInteger(n) || (n !== 0 && (n < REPLAN_MIN || n > REPLAN_MAX))) return null
  return { kind: 'replan', target: 'plan', minutes: n, now: Boolean(now) }
}

// Перерыв: минуты числом, только из белого списка — таймер на экране, а не «перерыв на час».
const BREAK_MARK = /^\[\[BREAK(_NOW)?\s*:?\s*(\d{1,3})\s*(?:мин\S*|min\S*)?\s*\]\]$/i
const BREAK_TAIL = /\[\[ASST_ACTION break (\d{1,2}) (now|offer)\]\]/
export const BREAK_MINUTES = [5, 10, 15]

export function breakAction(minutes, now) {
  const n = Number(minutes)
  return BREAK_MINUTES.includes(n) ? { kind: 'break', target: 'timer', minutes: n, now: Boolean(now) } : null
}

const STOP_MARK = /^\[\[STOP_DAY(_NOW)?\s*\]\]$/i
const STOP_TAIL = /\[\[ASST_ACTION stop (now|offer)\]\]/
export const stopAction = (now) => ({ kind: 'stop', target: 'plan', now: Boolean(now) })

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
  if (action.kind === 'replan') return `[[REPLAN${action.now ? '_NOW' : ''} ${action.minutes}]]`
  if (action.kind === 'break') return `[[BREAK${action.now ? '_NOW' : ''} ${action.minutes}]]`
  if (action.kind === 'stop') return `[[STOP_DAY${action.now ? '_NOW' : ''}]]`
  // Шаг плана (кнопка события, окно): в истории — раздел шага, чтобы «да» модель поняла как «открой его».
  if (action.kind === 'step') return action.dest ? `[[OPEN ${action.dest}]]` : ''
  // Остальные кнопки окна (закрыть, «мало времени», пробный урок) модели нечего повторять.
  if (action.kind !== 'open' && action.kind !== 'click') return ''
  return `[[${action.kind.toUpperCase()}${action.now ? '_NOW' : ''} ${action.target}]]`
}

/**
 * Метки всех кнопок ответа — для истории разговора (AssistantWidget): у ответа на событие их до трёх (Начать,
 * Перерыв 10 мин, На сегодня всё), и на «давай перерыв» модель должна видеть, что перерыв предлагался. Модель сама
 * ставит одну метку (RULES), лишние в её ответе роут вырезает — история с тремя метками ей не вредит.
 */
export function messageMarkers(m) {
  const list = m?.actions?.length ? m.actions : m?.action ? [m.action] : []
  return list.map(actionMarker).filter(Boolean).join('\n')
}

/** Служебный хвост стрима с действием. */
export function actionTail(action) {
  if (!action) return ''
  const mode = action.now ? 'now' : 'offer'
  if (action.feedback) {
    const draft = action.feedback.draft ? ` ${encodeURIComponent(action.feedback.draft)}` : ''
    return `[[ASST_ACTION feedback ${action.feedback.category} ${mode}${draft}]]`
  }
  if (action.kind === 'replan') return `[[ASST_ACTION replan ${action.minutes} ${mode}]]`
  if (action.kind === 'break') return `[[ASST_ACTION break ${action.minutes} ${mode}]]`
  if (action.kind === 'stop') return `[[ASST_ACTION stop ${mode}]]`
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
        const rp = REPLAN_MARK.exec(mark)
        if (rp) {
          if (!action) action = replanAction(rp[2], Boolean(rp[1]))
          continue
        }
        const br = BREAK_MARK.exec(mark)
        if (br) {
          if (!action) action = breakAction(br[2], Boolean(br[1]))
          continue
        }
        const st = STOP_MARK.exec(mark)
        if (st) {
          if (!action) action = stopAction(Boolean(st[1]))
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
      const rp = REPLAN_TAIL.exec(tail())
      if (rp) return replanAction(rp[1], rp[2] === 'now')
      const br = BREAK_TAIL.exec(tail())
      if (br) return breakAction(br[1], br[2] === 'now')
      const st = STOP_TAIL.exec(tail())
      if (st) return stopAction(st[1] === 'now')
      const m = ACTION_TAIL.exec(tail())
      if (!m) return null
      if (m[1] === 'click') return m[4] ? { kind: 'click', target: m[2], label: m[4], now: m[3] === 'now' } : null
      if (isItemRef(m[2])) return { kind: 'open', target: m[2], now: m[3] === 'now', item: true, label: m[4] || '' }
      return validAction(m[1], m[2], m[3] === 'now')
    },
  }
}
