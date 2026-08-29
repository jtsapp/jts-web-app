// Shared monthly IELTS-attempt quota check for the three submit routes
// (assess-writing, assess-speaking, record-section) - each does the same
// "resolve identity once, ask the backend for the configured limit, count
// this month's attempts" before paying for the expensive grading call.
// Anonymous/invalid identity is NOT gated here (matches this app's existing
// tolerance for anonymous IELTS attempts) - only a resolved user can even
// have a quota, since it's keyed by the backend's own User id.
//
// Квота одна на все четыре секции IELTS, а стоят они по-разному: Speaking
// (Azure-распознавание + разбор моделью) и Writing (оценка моделью) - именно
// то дорогое и внешнее, ради чего демо вообще существует. Reading и
// Listening проверяются локально по ключам ответов (key-grading.js), ни в
// один платный API не ходят и ничего не демонстрируют - списывать за них
// единственную демо-попытку значит сжигать её впустую.

import { resolveProfileId, bearerFromRequest, fetchContentQuota } from '../auth-server.js'
import { countIeltsAttemptsSince } from '../db/ielts.js'
// Список платных секций живёт в paidSections.js, а не здесь - это клиентски
// безопасный модуль без auth-server.js/db за спиной, и его же импортирует
// экран IeltsPage.jsx, чтобы решать, какие модули запирать при исчерпанной
// квоте. Дублировать список значений section в двух файлах нельзя: разъедутся.
import { PAID_IELTS_SECTIONS, sectionConsumesQuota } from './paidSections.js'

export { sectionConsumesQuota }

// section передают submit-роуты, которые точно знают, что сдаёт студент.
// Entitlement-роут спрашивает не про конкретную секцию, а про лимит в целом,
// ДО того как студент выбрал раздел - section там undefined, и в этом случае
// мы обязаны посчитать реальную квоту, а не молча ответить "разрешено".
export async function checkIeltsQuota(request, deviceId, section) {
  const resolved = await resolveProfileId(request, deviceId ?? null)
  if ('error' in resolved) return { resolved, blocked: false }

  if (section !== undefined && !sectionConsumesQuota(section)) {
    return { resolved, blocked: false, limit: null, used: 0, source: 'NONE', sourceName: null }
  }

  const quota = await fetchContentQuota(bearerFromRequest(request), 'IELTS')
  const limit = quota?.limit ?? null
  if (limit == null) return { resolved, blocked: false, source: quota?.source || 'NONE', sourceName: null }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  // Считаем попытки только по платным секциям - иначе Reading/Listening,
  // которые сами никогда не блокируются (см. выше), всё равно раздували бы
  // "used" и молча съедали квоту Speaking/Writing при следующей проверке.
  const used = await countIeltsAttemptsSince(resolved.id, startOfMonth, [...PAID_IELTS_SECTIONS])
  return {
    resolved,
    blocked: used >= limit,
    limit,
    used,
    source: quota?.source || 'NONE',
    sourceName: quota?.sourceName || null,
  }
}
