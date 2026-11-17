import { isStudentSectionHidden } from '../config.js'
import { isTeacher } from '../lib/jwt.js'
import { studentSectionStatus, useStudentSections } from '../lib/studentSections.js'
import { useMatching } from './matchingStore.js'
import { matchingView } from './matchingState.js'

// «Мой учитель» — вкладка «Уроков» сразу после «Онлайн-уроки» (задача 219 доски, 17.11.2026), а не пункт меню. Видна
// по тем же правилам, по которым был виден пункт: только ученику, не на прод-домене (isStudentSectionHidden), при
// открытом разделе тарифа и когда на стенде есть подбор учителя (карточка бэкенда).
//
// 'pending' — ответа ещё нет. Показать вкладку заранее нельзя: она мигнёт у того, кому её нет; решить, что её нет,
// тоже нельзя: переход «Мой учитель» из окна подбора или уведомления открыл бы расписание.
const MATCHING_PENDING = new Set(['idle', 'loading'])

/** Есть ли вкладка: 'pending' | 'yes' | 'no' — по роли, скрытию на проде, разделам тарифа и статусу подбора. */
export function myTeacherTabState({ teacher = false, hidden = false, sections = null, status = 'idle' } = {}) {
  if (teacher || hidden) return 'no'
  const section = studentSectionStatus(sections, 'my-teacher')
  if (section === 'closed' || section === 'error') return 'no'
  if (MATCHING_PENDING.has(status)) return 'pending'
  // Подбора на стенде нет (404) — пункта меню не было и раньше: вкладка вела бы на «раздел скоро появится».
  if (status === 'unavailable') return 'no'
  if (section === 'loading') return 'pending'
  return 'yes'
}

/** Вкладка «Мой учитель» этого аккаунта и её бейдж — сколько ждёт действия ученика (тот же, что был у пункта меню). */
export function useMyTeacherTab(token) {
  const teacher = isTeacher(token)
  const hidden = isStudentSectionHidden('my-teacher')
  const off = teacher || hidden || !token
  const sections = useStudentSections(off ? null : token)
  const view = matchingView(useMatching(off ? null : token))
  const state = off ? 'no' : myTeacherTabState({ sections, status: view.status })
  return { state, badge: state === 'yes' ? view.badge || 0 : 0 }
}
