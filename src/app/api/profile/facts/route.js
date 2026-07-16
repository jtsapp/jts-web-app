// Факты об ученике, которые запомнил тьютор («работает врачом», «хочет в Лондон»).
// Пишет голосовой агент через tool. Порт felix app/api/profile/facts/route.ts.

import { appendFacts } from '@/lib/db/profile.js'
import { itemsRoute } from '../_items-route.js'

export const runtime = 'nodejs'

export const POST = itemsRoute({ append: appendFacts, cap: 30, label: 'facts' })
