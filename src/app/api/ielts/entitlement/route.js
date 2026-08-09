// "Остались ли у меня попытки IELTS в этом месяце" — спрашивается ДО того, как
// студент начнёт секцию, в отличие от checkIeltsQuota внутри submit-роутов,
// который срабатывает уже после сдачи. Раньше предпроверки не было вовсе:
// студент проходил тест целиком и лишь потом упирался в 429 (а Reading/
// Listening глотали его молча — результат показывался, но не сохранялся).
//
// Считает то же самое, что и submit-роуты (тот же checkIeltsQuota), поэтому
// разъехаться они не могут.

import { checkIeltsQuota } from '@/lib/ielts/quota.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'

export const runtime = 'nodejs'

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const quota = await checkIeltsQuota(request, searchParams.get('deviceId'))

  // Неразрешённая личность (гость) — квоты не касаются, как и в submit-роутах.
  if ('error' in quota.resolved) {
    return Response.json({ allowed: true, limit: null, used: 0 })
  }

  return Response.json({
    allowed: !quota.blocked,
    limit: quota.limit ?? null,
    used: quota.used ?? 0,
  })
}
