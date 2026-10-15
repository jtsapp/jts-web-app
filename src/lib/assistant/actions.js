// Действия Луны: открыть раздел сайта и провести тур по экрану.
//
// Модель просит действие меткой в конце ответа (правила — prompt.js):
//   [[OPEN practice-speaking]]      — предложить: под ответом кнопка «Открыть…»
//   [[OPEN_NOW practice-speaking]]  — открыть сразу (ученик попросил или согласился)
//   [[TOUR practice]] / [[TOUR_NOW practice]] — то же для тура по экрану
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

// Форму модель местами путает (живой прогон 15.10.2026: «[[OPEN id="practice-listening"]]»),
// поэтому двоеточие, «id=» и кавычки вокруг id прощаем — раздел всё равно сверяется со списком.
const MODEL_MARK = /^\[\[(OPEN|TOUR)(_NOW)?(?:\s+|\s*:\s*)(?:id\s*=\s*)?["'«]?([A-Za-z0-9_-]{1,40})["'»]?\s*\]\]$/
// Длиннее этого метка модели не бывает: «[[» без закрытия дальше — просто текст.
const MAX_MARK = 56

export const SERVICE_PREFIX = '[[ASST_'
const ACTION_TAIL = /\[\[ASST_ACTION (open|tour) ([a-z0-9-]+) (now|offer)\]\]/

/** Метка действия в формате модели — для истории разговора (см. AssistantWidget). */
export function actionMarker(action) {
  if (!action) return ''
  return `[[${action.kind.toUpperCase()}${action.now ? '_NOW' : ''} ${action.target}]]`
}

/** Служебный хвост стрима с действием. */
export function actionTail(action) {
  return action ? `[[ASST_ACTION ${action.kind} ${action.target} ${action.now ? 'now' : 'offer'}]]` : ''
}

/**
 * Фильтр ответа модели на сервере: вырезает метки действий, первую годную
 * запоминает. Метка раздела не из белого списка тоже вырезается — показывать
 * ученику «[[OPEN что-то]]» незачем, — но действием не становится.
 *
 * Кусок стрима может оборвать метку посередине («[[OPE» + «N practice]]»),
 * поэтому всё от «[[» держится, пока метка не закроется или не станет ясно,
 * что это обычный текст.
 */
export function createActionFilter() {
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
          if (s.length < MAX_MARK) {
            hold = s
            return out
          }
          out += '[['
          s = s.slice(2)
          continue
        }
        const mark = s.slice(0, j + 2)
        s = s.slice(j + 2)
        const m = MODEL_MARK.exec(mark)
        if (!m) {
          out += mark
          continue
        }
        if (!action) action = validAction(m[1].toLowerCase(), m[3].toLowerCase(), Boolean(m[2]))
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
      const m = ACTION_TAIL.exec(tail())
      return m ? validAction(m[1], m[2], m[3] === 'now') : null
    },
  }
}
