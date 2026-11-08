// src/app/api/study/review/route.js
// Что пора повторить по расписанию (ТЗ v2.0, 8.3: 1, 3, 7, 14 дней): слова для блока «Повторить по расписанию» в
// «Словаре» — с переводом и примером из строки вещи, чтобы тренировка собиралась без каталога словаря.
// Нет базы или таблицы — пустой список: блок просто не показывается.

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadDueWords } from '@/lib/db/studentModel.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'

export const runtime = 'nodejs'

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ words: [] })
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  const rows = await loadDueWords(resolved.id)
  const words = rows
    .filter((r) => r.title)
    .map((r) => ({
      key: r.item.slice('word:'.length),
      en: r.title,
      ru: r.extra?.ru || '',
      kk: r.extra?.kk || '',
      example: r.extra?.example || '',
    }))
  return Response.json({ words })
}
