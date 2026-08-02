// Next.js вызывает register() один раз при поднятии сервера — и в `next dev`,
// и в проде (`next start`). Аналог того, как Spring Boot прогоняет Flyway при
// старте контекста: миграции применяются сами, без ручного psql на деплое.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { runMigrations } = await import('./lib/migrate.js')
  try {
    await runMigrations()
  } catch (err) {
    console.error('[migrate] не применились:', err)
  }
}
