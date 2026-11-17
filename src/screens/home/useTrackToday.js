import { useEffect, useState } from 'react'
import { getIeltsDashboard, getIeltsMe, getSatMeCached, getSatRoadmap, getSatSchedule, getSatTodayTasks } from '../../api.js'
import { currentLesson, readWords } from '../../sat/today/todayTasks.js'
import { iso } from '../../sat/model/plan.js'

// Данные секций IELTS и SAT карточки «Задачи на сегодня» (todayTracks.js). Только существующими ручками разделов —
// теми же, что у их вкладок «Сегодня»: своего учёта задач у «Главной» нет. Запросы идут, только когда направление у
// ученика есть (on): у остальных «Главная» в сеть за чужим разделом не ходит. Ответ — с владельцем-токеном: смена
// аккаунта во вкладке не покажет чужие задачи ни на кадр.

/** IELTS: { me, programme, failed } или null, пока в пути. Дашборд закрыт замком до доступа — тогда не спрашиваем. */
export function useIeltsToday(token, on) {
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!on || !token) return
    let alive = true
    getIeltsMe(token)
      .then(async (me) => {
        if (!me?.onboarded || me.access === false) return { me, programme: null, failed: false }
        const dash = await getIeltsDashboard(token).catch(() => null)
        return { me, programme: dash?.programme ?? null, failed: !dash }
      })
      .catch(() => ({ me: null, programme: null, failed: true }))
      .then((data) => alive && setState({ owner: token, data }))
    return () => {
      alive = false
    }
  }, [token, on])
  return on && state?.owner === token ? state.data : null
}

/**
 * SAT: { me, roadmap, schedule, tasks, words, todayIso, failed } или null. Задания дня зависят от занятия группы (его
 * навыки и секция — как у вкладки «Сегодня»), поэтому сначала роадмап и расписание, потом /today-tasks; в фазе
 * самоподготовки задания дня не нужны — у неё свой список дел из роадмапа.
 */
export function useSatToday(token, on) {
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!on || !token) return
    let alive = true
    const todayIso = iso(new Date())
    const load = async () => {
      const me = await getSatMeCached(token)
      if (!me?.access) return { me, todayIso }
      const [roadmap, schedule] = await Promise.all([
        getSatRoadmap(token).catch(() => null),
        getSatSchedule(token).catch(() => ({ inGroup: false, lessons: [] })),
      ])
      const r = roadmap?.roadmap
      if (r?.phases?.find((p) => p.n === r.active)?.kind === 'self') return { me, roadmap, schedule, todayIso }
      const lesson = currentLesson(schedule, todayIso)
      const section = lesson?.section === 'MATH' ? 'math' : 'rw'
      const tasks = await getSatTodayTasks(token, lesson?.skillIds || [], section).catch(() => undefined)
      return { me, roadmap, schedule, tasks: tasks ?? null, words: readWords(todayIso), todayIso, failed: tasks === undefined }
    }
    load()
      .catch(() => ({ me: { access: true }, failed: true, todayIso }))
      .then((data) => alive && setState({ owner: token, data }))
    return () => {
      alive = false
    }
  }, [token, on])
  return on && state?.owner === token ? state.data : null
}
