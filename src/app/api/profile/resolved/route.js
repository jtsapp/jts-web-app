// Ошибки, которые ученик перерос (использовал верно 2+ раза). loadProfile
// вычитает их из активного списка, чтобы тьютор перестал их долбить.
// Порт felix app/api/profile/resolved/route.ts.

import { appendResolved } from '@/lib/db/profile.js'
import { itemsRoute } from '../_items-route.js'

export const runtime = 'nodejs'

// Лимит 20, а не 30: у felix этот роут режет пачку короче остальных.
export const POST = itemsRoute({ append: appendResolved, cap: 20, label: 'resolved' })
