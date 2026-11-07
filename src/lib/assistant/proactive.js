// Трекер «Луна пишет первой» (ТЗ v2.0, 7.1, 7.2, 7.2г, 7.4): решает, какое событие сейчас и можно ли о нём сказать.
// Только счёт, без DOM, таймеров и сети — их приносит useProactive.js; события и их пометки — events.js.
//
// Что помнится и где:
//  - на устройстве, по аккаунту (localStorage): когда ученик был здесь последний раз и какой день уже начат приветствием.
//    Нужно через перезагрузки и вкладки: «первое открытие за день», «не заходил 2 дня», «вход тем же днём после
//    30 минут». Чужое устройство вчерашний заход не видит — для «не заходил 2 дня» это допущение: своего «последнего
//    захода» у бэкенда нет;
//  - на вкладку (sessionStorage): лимиты 7.4 — когда было последнее сообщение, сколько раз подряд плашку закрыли, было ли
//    уже предложение пробного урока. «До конца сессии» = пока жива вкладка: перезагрузка лимиты не сбрасывает;
//  - в памяти: переходы последних минут (для wandering).
//
// Пороги — PROACTIVE. Два своих решения сверх ТЗ: (1) любые два сообщения — не ближе минуты (события 7.1 от «раза в 3
// минуты» освобождены, но «вернулся на вкладку» сразу за «шаг закрыт» — это два окна подряд); (2) «вернулся на Главную»
// — если ученик был вне Главной хотя бы 3 минуты и не чаще раза в 15 минут: ТЗ зовёт её «каждый раз», а переход на
// Главную бывает и мимоходом, и каждый — платный ответ модели и окно поверх экрана.

import { ARRIVAL_EVENTS, SURVIVE_DISMISS } from './events.js'

export const PROACTIVE = {
  pauseMs: 5 * 60_000, // вкладка снова видна после стольких — «вернулся после перерыва»
  sameDayPauseMs: 30 * 60_000, // вход (перезагрузка, новая вкладка) тем же днём после стольких
  gapDays: 2, // не заходил столько дней — «без упрёков, один короткий шаг»
  intervalMs: 3 * 60_000, // не больше одного проактивного за 3 минуты (кроме 7.1)
  floorMs: 60_000, // любые два — не ближе минуты (см. шапку)
  homeAwayMs: 3 * 60_000, // «вернулся на Главную» — после стольких вне её
  homeEveryMs: 15 * 60_000, // и не чаще
  dismissLimit: 3, // закрыл плашку подряд — проактивные выключены до конца сессии
  wanderMs: 120_000, // «3+ раздела за 2 минуты без начала шага»
  wanderScreens: 3,
  wanderEveryMs: 10 * 60_000,
  manyTasks: 5, // «задач на день больше 5»
  eveningHour: 18, // «вечером»
}

// Настройка в Профиле «Подсказки Луны» (proactiveSetting.js). «Иногда» — то, что важно раз-два в день: начало дня, вечер,
// возвращение после долгого перерыва, закрытый план; «только по запросу» — ничего, кроме конца перерыва: таймер ученик
// поставил сам, и «перерыв кончился» — ответ на его действие.
const LEVEL_EVENTS = {
  often: null, // все
  sometimes: new Set(['day_start', 'return_after_gap', 'evening_entry', 'plan_completed', 'break_over', 'demo_trial']),
  manual: new Set(['break_over']),
}

/** Можно ли событие при этой настройке. */
export function levelAllows(level, type) {
  const set = LEVEL_EVENTS[level] === undefined ? LEVEL_EVENTS.often : LEVEL_EVENTS[level]
  return !set || set.has(type)
}

/** Календарный день устройства: 'YYYY-MM-DD'. */
export function localDay(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Сколько календарных дней между двумя 'YYYY-MM-DD' (b позже a). */
export function daysBetween(a, b) {
  if (!a || !b) return 0
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

/**
 * Хранилище-заглушка: get() → объект, set(obj). Реальные — localStorage и sessionStorage в useProactive.js.
 * @returns {{ get: () => object, set: (v: object) => void }}
 */
export function memoryStore(init = {}) {
  let v = { ...init }
  return { get: () => v, set: (next) => (v = { ...next }) }
}

/**
 * Сводка дня плана для решений — её считает planSteps.daySummary по свежему /mobile/ge/plan.
 * @typedef {{ ready: boolean, total?: number, done?: number, left?: number, min?: number, started?: boolean,
 *            next?: object|null, nextKind?: string|null, completed?: Set<string>, kinds?: Map<string, string> }} DaySummary
 */

/** Параметры пометки из сводки дня: свежие цифры плана (events.js, planFacts). */
export function planParams(summary) {
  if (!summary?.ready) return { plan: 'none' }
  return { plan: 'ready', total: summary.total, done: summary.done, left: summary.left, min: summary.min, next: summary.nextKind, nmin: summary.nextMin, dmin: summary.doneMin || null }
}

/**
 * @param {{ store?: ReturnType<typeof memoryStore>, session?: ReturnType<typeof memoryStore>, opts?: Partial<typeof PROACTIVE> }} [args]
 */
export function createProactiveTracker({ store = memoryStore(), session = memoryStore(), opts = {} } = {}) {
  const o = { ...PROACTIVE, ...opts }
  let visits = [] // { screen, at, task } — переходы последних минут
  let leftHomeAt = null

  const get = () => store.get() || {}
  const put = (patch) => store.set({ ...get(), ...patch })
  const sess = () => session.get() || {}
  const putSess = (patch) => session.set({ ...sess(), ...patch })

  // Будний день — про ночное списание токенов вечером (events.js): решает код, модель путала субботу с будним.
  const weekday = (now) => ![0, 6].includes(new Date(now).getDay())

  // Вечер, а сегодня ни шага: план есть, открытое есть, ничего не сделано и не начато.
  const isEvening = (hour, summary, day) =>
    hour >= o.eveningHour && summary?.ready && summary.left > 0 && !summary.done && !summary.started && get().eveningDay !== day
  const isMany = (summary, day) => summary?.ready && summary.total > o.manyTasks && summary.left > 0 && get().manyDay !== day

  // Первое за день: «не заходил 2 дня», вечер без шагов, много задач — или обычное начало дня.
  function firstOfDay({ now, day, hour, summary }) {
    const s = get()
    const gap = s.lastDay ? daysBetween(s.lastDay, day) : 0
    if (gap >= o.gapDays) return { type: 'return_after_gap', params: { days: gap, ...planParams(summary) } }
    if (isEvening(hour, summary, day)) return { type: 'evening_entry', params: { first: true, wd: weekday(now), ...planParams(summary) } }
    if (isMany(summary, day)) return { type: 'many_tasks', params: { first: true, ...planParams(summary) } }
    return { type: 'day_start', params: planParams(summary) }
  }

  // Тот же день после перерыва: вечер без шагов важнее «с возвращением».
  function sameDayReturn({ now, day, hour, summary, awayMs }) {
    if (isEvening(hour, summary, day)) return { type: 'evening_entry', params: { wd: weekday(now), ...planParams(summary) } }
    return { type: 'return_after_pause', params: { away: Math.round(awayMs / 60_000), ...planParams(summary) } }
  }

  return {
    /**
     * Ученик пришёл: страница открылась (mount) или вкладка снова видна (visible, awayMs — сколько была скрыта).
     * Вызывать ДО seen(): решение — по прошлому заходу.
     */
    arrival({ now, hour = new Date(now).getHours(), summary = null, kind = 'mount', awayMs = 0 }) {
      const day = localDay(now)
      const s = get()
      if (s.startDay !== day) return firstOfDay({ now, day, hour, summary })
      if (kind === 'mount') {
        const away = s.lastAt ? now - s.lastAt : 0
        return away >= o.sameDayPauseMs ? sameDayReturn({ now, day, hour, summary, awayMs: away }) : null
      }
      return awayMs >= o.pauseMs ? sameDayReturn({ now, day, hour, summary, awayMs }) : null
    },

    /** Ученик здесь (действие, вкладка видна): помним время и день — для следующего прихода. */
    seen(now) {
      put({ lastAt: now, lastDay: localDay(now) })
    },

    /**
     * Переход на экран (уже нарисованный: task — на нём задание). Вернёт return_same_day или wandering, иначе null.
     */
    visit({ now, screen, task = false, summary = null }) {
      const prev = visits[visits.length - 1]
      if (prev?.screen === 'home' && screen !== 'home') leftHomeAt = now
      visits = [...visits.filter((v) => now - v.at <= o.wanderMs), { screen, at: now, task }]
      if (screen === 'home') {
        const away = leftHomeAt != null ? now - leftHomeAt : 0
        const lastHome = sess().homeAt || 0
        const ready = prev && prev.screen !== 'home' && away >= o.homeAwayMs && now - lastHome >= o.homeEveryMs
        return ready && summary?.ready && summary.left > 0 ? { type: 'return_same_day', params: planParams(summary) } : null
      }
      // Блуждает: 3+ разных раздела (не Главная) за 2 минуты, и ни на одном не начато задание.
      const recent = visits.filter((v) => v.screen !== 'home')
      const distinct = new Set(recent.map((v) => v.screen))
      if (distinct.size < o.wanderScreens || recent.some((v) => v.task) || task) return null
      if (now - (sess().wanderAt || 0) < o.wanderEveryMs) return null
      if (summary?.ready && summary.left === 0) return null
      return { type: 'wandering', params: planParams(summary) }
    },

    /** Свежий план против прежнего: шаг закрыт по фактам — step_completed, закрыт последний — plan_completed. */
    planChanged({ prev, next }) {
      if (!prev?.ready || !next?.ready || !next.completed) return null
      const fresh = [...next.completed].filter((id) => !prev.completed?.has(id))
      if (!fresh.length) return null
      if (next.left === 0 && next.total > 0) return { type: 'plan_completed', params: planParams(next) }
      return { type: 'step_completed', params: { step: next.kinds?.get(fresh[0]) || null, ...planParams(next) } }
    },

    /** Урок курса пройден. Демо — предложение пробного урока, не чаще раза за сессию (7.2г). */
    lessonDone({ demo, first = false }) {
      if (!demo || sess().trialOffered) return null
      return { type: 'demo_trial', params: { first } }
    },

    /** Перерыв кончился. */
    breakOver({ summary = null } = {}) {
      return { type: 'break_over', params: planParams(summary) }
    },

    /** Можно ли сейчас сказать о событии: настройка Профиля и лимиты 7.4. */
    allow(ev, { now, level = 'often' }) {
      if (!ev || !levelAllows(level, ev.type)) return false
      const s = sess()
      if (s.off && !SURVIVE_DISMISS.has(ev.type)) return false
      const since = now - (s.lastAt || 0)
      if (since < o.floorMs) return false
      if (!ARRIVAL_EVENTS.has(ev.type) && since < o.intervalMs) return false
      if (ev.type === 'demo_trial' && s.trialOffered) return false
      return true
    },

    /** Сообщение по событию ушло (или встало точкой на кнопке на телефоне): лимиты и отметки дня. */
    shown(ev, now) {
      const day = localDay(now)
      const patch = { lastAt: now }
      if (ev.type === 'return_same_day') patch.homeAt = now
      if (ev.type === 'wandering') patch.wanderAt = now
      if (ev.type === 'demo_trial') patch.trialOffered = true
      putSess(patch)
      const mark = {}
      // День начат приветствием: «первое открытие за день» больше не повторится.
      // У demo_trial first — «первый урок», а не «первый вход»: день он не начинает.
      const greets = ev.type === 'day_start' || ev.type === 'return_after_gap'
      if (greets || ((ev.type === 'evening_entry' || ev.type === 'many_tasks') && ev.params?.first)) mark.startDay = day
      if (ev.type === 'evening_entry') mark.eveningDay = day
      if (ev.type === 'many_tasks') mark.manyDay = day
      if (Object.keys(mark).length) put(mark)
    },

    /** Ученик закрыл плашку, не ответив: 3 раза подряд — проактивные выключены до конца сессии. */
    dismissed() {
      const n = (sess().dismissInRow || 0) + 1
      putSess({ dismissInRow: n, off: Boolean(sess().off) || n >= o.dismissLimit })
    },

    /** Ученик ответил на сообщение (кнопкой или словами): счёт «подряд» сначала. */
    engaged() {
      putSess({ dismissInRow: 0 })
    },

    isOff: () => Boolean(sess().off),
  }
}
