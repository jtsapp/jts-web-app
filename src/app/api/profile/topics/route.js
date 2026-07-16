// Темы, которые ученик уже обсуждал. Тьютор смотрит их, чтобы не повторяться.
// Порт felix app/api/profile/topics/route.ts.

import { appendTopics } from '@/lib/db/profile.js'
import { itemsRoute } from '../_items-route.js'

export const runtime = 'nodejs'

export const POST = itemsRoute({ append: appendTopics, cap: 30, label: 'topics' })
