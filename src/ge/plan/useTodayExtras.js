import { useEffect, useMemo, useState } from 'react'
import { getGeProfile } from '../../api.js'
import { levelSkillHighlights, rankLevelSkills } from '../../lib/levelProgress.js'
import { loadLevelSkillStatsRemote, readLocalLevelSkillStats } from '../../practice/skillStats.js'
import { skillLevel } from '../../practice/skillStatsCore.js'
import { baseTargets, materialTargets } from './taskTargets.js'

// Данные «Сегодня», которых нет в самом плане: слабый навык и цель — для строки «Зачем», цели переходов — для «Начать»
// и строки «Откроется» (ТЗ v2.0, 5.2–5.3). Берём их здесь, а не пропсами: «Главной» владеет другая работа, а блоку
// хватает своих хуков.

// Цель — из профиля GE (та же ручка, что у App и блока цели). Запрос один на вкладку и токен: блок перерисовывается при
// каждом перечитывании плана, а цель за это время не меняется.
let goalCache = null
function loadGoal(token) {
  if (!goalCache || goalCache.token !== token) {
    // через then: и синхронный сбой (подменённый api в тестах «Главной») становится «цели нет», а не падением блока
    goalCache = { token, request: Promise.resolve().then(() => getGeProfile(token)).then((p) => p?.targetLevel || null).catch(() => null) }
  }
  return goalCache.request
}

/** Только для тестов: забыть цель прошлого прогона. */
export function resetTodayGoalCache() {
  goalCache = null
}

/**
 * { weakest, target, targets } для GeTodayCard. weakest — самый слабый навык текущего уровня тем же расчётом, что
 * «Сильные и слабые стороны» (levelSkillHighlights поверх навыков уровня), иначе null; target — цель из анкеты GE;
 * targets — { id задачи: цель перехода } (taskTargets).
 */
export function useTodayExtras({ token, level, tasks, courseSteps }) {
  const code = skillLevel(level)
  // сначала то, что знает устройство, ответ сервера — поверх; ответ чужого уровня не берётся
  const local = useMemo(() => (code ? readLocalLevelSkillStats(code) : null), [code])
  const [remote, setRemote] = useState({ code: null, stats: null })
  useEffect(() => {
    if (!token || !code) return undefined
    let alive = true
    loadLevelSkillStatsRemote(token, code).then((stats) => {
      if (alive && stats) setRemote({ code, stats })
    })
    return () => {
      alive = false
    }
  }, [token, code])
  const stats = remote.code === code && remote.stats ? remote.stats : local
  const weakest = useMemo(() => levelSkillHighlights(rankLevelSkills(stats)).weakest, [stats])

  const [target, setTarget] = useState(null)
  useEffect(() => {
    if (!token) return undefined
    let alive = true
    loadGoal(token).then((goal) => {
      if (alive) setTarget(goal)
    })
    return () => {
      alive = false
    }
  }, [token])

  const base = useMemo(() => baseTargets(tasks, { level, courseSteps }), [tasks, level, courseSteps])
  // материалы перечитываются, только когда сменился набор открытых разделов дня или уровень, а не на каждом
  // перечитывании плана (минуты практики растут, а следующий урок воркбука от них не зависит)
  const materialKey = (tasks || [])
    .filter((x) => x.kind === 'practice' && x.status !== 'completed' && x.origin !== 'teacher')
    .map((x) => `${x.id}:${x.module}`)
    .join(',')
  // цели держатся вместе с ключом, по которому собраны: сменился набор разделов — старые не показываем
  const [material, setMaterial] = useState({ key: '', map: {} })
  useEffect(() => {
    if (!materialKey) return undefined
    let alive = true
    const key = `${materialKey}|${level}`
    materialTargets(tasks, { level }).then((map) => {
      if (alive) setMaterial({ key, map })
    })
    return () => {
      alive = false
    }
    // tasks читается внутри по materialKey: свежая ссылка на тот же набор не должна перезапускать загрузку
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialKey, level])
  const fresh = material.key === `${materialKey}|${level}` ? material.map : null
  const targets = useMemo(() => (fresh ? { ...base, ...fresh } : base), [base, fresh])

  return { weakest, target, targets }
}
