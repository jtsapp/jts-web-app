import { areRewardsEnabled, isStudentSectionHidden } from '../config.js'
import { loadToken } from '../lib/session.js'
import { isTeacher } from '../lib/jwt.js'
import { menuItems } from '../lib/navSections.js'
import { useMatching } from '../matching/matchingStore.js'
import { matchingView } from '../matching/matchingState.js'
import { useStudentSections, refreshStudentSections } from '../lib/studentSections.js'
import { useStudentExams } from '../lib/useStudentExams.js'
import { useContractsBadge } from '../contracts/useContracts.js'
import { useHomeworkBadge } from '../lib/myHomework.js'

// Подбора учителя на стенде нет или он ещё не ответил — «Мой учитель» в меню не ставим.
const MATCHING_HIDDEN = new Set(['idle', 'loading', 'unavailable'])

/**
 * Меню этого ученика — одно на сайдбар, нижнюю панель телефона и «Сервисы» (lib/navSections.js). Роль читается из
 * токена; разделы по тарифу — из общего обновляемого снимка, доступы к экзаменам перепроверяются вместе с ним.
 * До ответа ограниченные вкладки скрыты. Бейдж «Мой учитель» — когда от ученика ждут действия (matchingView).
 */
export function useMenuItems(token) {
  const teacher = isTeacher(token)
  const rewards = areRewardsEnabled()
  const studentToken = teacher ? null : token || loadToken()
  const sections = useStudentSections(studentToken)
  const exams = useStudentExams(studentToken, sections)
  const ieltsAccount = exams.ieltsAccount
  const matching = matchingView(useMatching(isStudentSectionHidden('my-teacher') ? null : studentToken))
  const myTeacher = !teacher && !MATCHING_HIDDEN.has(matching.status)
  const contractsToSign = useContractsBadge(isStudentSectionHidden('contracts') ? null : studentToken)
  // «Домашняя работа» — сколько работ ждут ученика (ТЗ v2.0, 5.4); у кого раздела в меню нет, значок не виден.
  const homeworkWaiting = useHomeworkBadge(teacher || isStudentSectionHidden('homework') ? null : studentToken, { ielts: ieltsAccount })
  const badges = { 'my-teacher': matching.badge || 0, contracts: contractsToSign, homework: homeworkWaiting }
  return { items: menuItems({ teacher, ieltsAccount, exams, rewards, myTeacher, sections }), teacher, ieltsAccount, badges,
    sections, retrySections: () => refreshStudentSections(studentToken) }
}
