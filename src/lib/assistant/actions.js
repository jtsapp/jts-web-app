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
import { DESTINATIONS, destinationOf, validAction } from './destinations.js'

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

// Ученик просит тур: «тур» в любом падеже (по-казахски «турды», «турға»),
// «экскурсия», английское «tour» / «walk me through» / «show me around».
// Границы — по буквам: «турнир», «туризм», «турецкий» — не тур.
const TOUR_WORDS = /(?:^|[^\p{L}])(?:тур\p{L}{0,2}|экскурси\p{L}*|tours?|walk me through|show me around)(?=[^\p{L}]|$)/iu
// Согласие на её предложение — короткое «да» в начале ответа.
const AGREE = /^\s*(?:да|давай|давайте|ок|окей|хорошо|конечно|ага|угу|можно|иә|ия|жарайды|болады|yes|yeah|yep|sure|ok|okay|please)(?=[^\p{L}]|$)/iu
// «Не надо тур, просто открой» — тур не навязываем.
const REFUSE = /(?:^|[^\p{L}])(?:нет|не надо|не нужно|не хочу|без тура|без экскурсии|просто открой|жоқ|керек емес|no|don't|without|just open)(?=[^\p{L}]|$)/iu
const MODEL_TOUR_MARK = /\[\[TOUR(?:_NOW)?\s+([a-z0-9-]{1,40})\]\]/i

/**
 * Тур, который Луна предлагала прошлым ответом (метка [[TOUR id]] в её
 * сообщении — виджет возвращает метку в историю, см. AssistantWidget). Смотрим
 * только её последний ответ перед вопросом ученика.
 */
export function offeredTourTarget(messages) {
  const list = Array.isArray(messages) ? messages : []
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.role !== 'assistant') continue
    const m = MODEL_TOUR_MARK.exec(String(list[i].content ?? ''))
    return m ? m[1].toLowerCase() : null
  }
  return null
}

/**
 * Ученик просил тур, а модель поставила «открыть» — делаем тур.
 *
 * Живой прогон 15.10.2026 (Haiku 5.5): «проведи для меня тур по практике» →
 * «открываю Практику и проведу по ней» с меткой [[OPEN_NOW practice]]; раздел
 * открылся, тур — нет. Правило про TOUR_NOW в промпте есть, но 5.5 держит его
 * через раз (зонд 15.10: 8 из 12), поэтому решает код — по словам ученика
 * (userText) или по согласию на тур, который Луна сама предлагала
 * (offeredTour — offeredTourTarget). «Сразу» или «предложить» — как решила модель.
 *
 * Вкладка Практики своего тура не имеет — тур идёт по экрану, где она живёт
 * (тур Практики сам переключает вкладку на первую).
 */
export function preferTour(action, { userText = '', offeredTour = null } = {}) {
  if (!action || action.kind !== 'open') return action
  const dest = destinationOf(action.target)
  if (!dest) return action
  const text = String(userText ?? '')
  if (REFUSE.test(text)) return action
  const onScreen = (d) => d && d.tour && d.screen === dest.screen
  const offered = destinationOf(offeredTour)
  let target = null
  if (onScreen(offered) && AGREE.test(text)) target = offered.id
  else if (TOUR_WORDS.test(text)) {
    target = dest.tour ? dest.id : DESTINATIONS.find(onScreen)?.id || null
  }
  return target ? { kind: 'tour', target, now: action.now } : action
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
