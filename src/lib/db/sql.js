// Общий клиент Neon для всех db-модулей.
//
// Намеренно не бросаем на импорте: Neon может быть не поднят (dev, preview), и
// остальное приложение должно работать. Вызывающий проверяет getSql() на null и
// тихо деградирует — прогресс тогда живёт только в localStorage клиента.
//
// Порт felix lib/db/sql.ts.

import { neon } from '@neondatabase/serverless'

let cached

export function getSql() {
  if (cached !== undefined) return cached
  const url = process.env.DATABASE_URL
  cached = url ? neon(url) : null
  return cached
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL)
}
