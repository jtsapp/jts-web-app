// Лёгкий аналог Flyway для jts-web-app: нумерованные .sql в migrations/,
// таблица schema_migrations трекает, что уже применено, недостающее
// применяется по порядку при каждом старте приложения (см. instrumentation.js).
// Как и getSql() — не бросает наружу при отсутствующей БД, тихо деградирует.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getSql, isDbConfigured } from './db/sql.js'

const MIGRATIONS_DIR = join(process.cwd(), 'src', 'lib', 'migrations')

export async function runMigrations() {
  if (!isDbConfigured()) {
    console.warn('[migrate] DATABASE_URL не задан — пропускаю миграции')
    return
  }
  const sql = getSql()
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

  await sql`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`

  const appliedRows = await sql`select name from schema_migrations`
  const applied = new Set(appliedRows.map((r) => r.name))

  for (const file of files) {
    if (applied.has(file)) continue
    const text = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    console.log(`[migrate] применяю ${file}`)
    await sql.begin(async (tx) => {
      await tx.unsafe(text)
      await tx`insert into schema_migrations (name) values (${file})`
    })
  }
}
