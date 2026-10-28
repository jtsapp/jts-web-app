import { useEffect, useState } from 'react'
import { getIeltsMe, getSatMeCached } from '../api.js'
import { areRewardsEnabled, isStudentSectionHidden } from '../config.js'
import { loadToken } from '../lib/session.js'
import { isTeacher } from '../lib/jwt.js'
import { menuItems } from '../lib/navSections.js'
import { useMatching } from '../matching/matchingStore.js'
import { matchingView } from '../matching/matchingState.js'
import { useStudentSections } from '../lib/studentSections.js'
import { useContractsBadge } from '../contracts/useContracts.js'

// Подбора учителя на стенде нет или он ещё не ответил — «Мой учитель» в меню не ставим.
const MATCHING_HIDDEN = new Set(['idle', 'loading', 'unavailable'])

/**
 * Меню этого ученика — одно на сайдбар, нижнюю панель телефона и «Сервисы» (lib/navSections.js). Роль читается из
 * токена; аккаунт IELTS и подписки на экзамены — у бэкенда (ответ помнится по токену в api.js, поэтому переход между
 * экранами запроса не стоит). До ответа экзаменов в меню нет: ученик General не должен видеть их даже на мгновение,
 * а у ученика IELTS меню сменится с первым ответом. Бейдж «Мой учитель» — когда от ученика ждут действия
 * (matchingView).
 */
export function useMenuItems(token) {
  const teacher = isTeacher(token)
  const rewards = areRewardsEnabled()
  const [ieltsAccount, setIeltsAccount] = useState(false)
  const [exams, setExams] = useState({ ielts: false, sat: false })
  useEffect(() => {
    const authToken = token || loadToken()
    if (!authToken || teacher) return
    let alive = true
    getIeltsMe(authToken).then((m) => {
      if (!alive) return
      if (m.ieltsAccount) setIeltsAccount(true)
      setExams((prev) => ({ ...prev, ielts: !!(m.purchased || m.ieltsAccount) }))
    })
    getSatMeCached(authToken).then((m) => {
      if (alive) setExams((prev) => ({ ...prev, sat: !!m?.purchased }))
    })
    return () => {
      alive = false
    }
  }, [token, teacher])
  const studentToken = teacher ? null : token || loadToken()
  const sections = useStudentSections(studentToken)
  const matching = matchingView(useMatching(isStudentSectionHidden('my-teacher') ? null : studentToken))
  const myTeacher = !teacher && !MATCHING_HIDDEN.has(matching.status)
  const contractsToSign = useContractsBadge(isStudentSectionHidden('contracts') ? null : studentToken)
  const badges = { 'my-teacher': matching.badge || 0, contracts: contractsToSign }
  return { items: menuItems({ teacher, ieltsAccount, exams, rewards, myTeacher, sections }), teacher, ieltsAccount, badges }
}
