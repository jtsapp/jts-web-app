// Общий Postgres-клиент для всех db-модулей.
//
// Свой self-host Postgres (DATABASE_URL), драйвер `postgres` (porsager). Ушли с
// Neon serverless: его HTTP-драйвер умеет только endpoint Neon и обычную БД не
// откроет. porsager сохраняет тот же tagged-template API (`sql`…``), поэтому
// db-модули почти не изменились; отличается только merge.js (транзакция).
//
// Намеренно не бросаем на импорте: БД может быть не поднята (dev, preview), и
// остальное приложение должно работать. Вызывающий проверяет getSql() на null и
// тихо деградирует — прогресс тогда живёт только в localStorage клиента.

import postgres from 'postgres'

let cached

function cleanUrl(raw) {
  // BOM/пробелы из env вырезаем: значение из Windows-пайпа приходит с U+FEFF в
  // начале и рвёт подключение (тот же класс бага, что убил Bearer 17.07.2026 —
  // см. auth-server.js). Чистим здесь, раньше это делалось только для BACKEND_URL.
  return raw.replace(/^﻿/, '').trim()
}

export function getSql() {
  if (cached !== undefined) return cached
  const url = process.env.DATABASE_URL ? cleanUrl(process.env.DATABASE_URL) : ''
  // Долгоживущий процесс (self-host, не serverless) — обычный пул. max держим
  // скромным; ssl берётся из строки подключения (sslmode=require) или окружения.
  cached = url
    ? postgres(url, { max: 10, idle_timeout: 30, connect_timeout: 10 })
    : null
  return cached
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL)
}
