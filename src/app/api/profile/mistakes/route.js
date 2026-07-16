// Ошибки ученика, замеченные тьютором. loadProfile отдаёт их обратно в промпт,
// чтобы тьютор их дорабатывал. Порт felix app/api/profile/mistakes/route.ts.

import { appendMistakes } from '@/lib/db/profile.js'
import { itemsRoute } from '../_items-route.js'

export const runtime = 'nodejs'

export const POST = itemsRoute({ append: appendMistakes, cap: 30, label: 'mistakes' })
