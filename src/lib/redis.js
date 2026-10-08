// Общий клиент Redis. Пока в нём живёт только кэш озвучки /api/tts
// (src/lib/soniox-tts.js): дисковый кэш в /tmp контейнера умирал на каждом
// деплое (CI делает `up --force-recreate`), и всё синтезировалось и
// оплачивалось заново. Redis со своим volume переживает пересоздание.
//
// Как getSql(): без REDIS_URL — null, и вызывающий тихо обходится без Redis.
// На импорте не бросаем.
//
// Redis — кэш, а не хранилище: если он лёг, запрос должен идти дальше в Soniox,
// а не ждать. Поэтому офлайн-очередь выключена (команда падает сразу, а не
// копится до переподключения), а время на команду ограничено.

import Redis from 'ioredis'

let cached

export function getRedis() {
  if (cached !== undefined) return cached
  // BOM из Windows-пайпа рвёт разбор адреса — тот же класс бага, что в sql.js.
  const url = (process.env.REDIS_URL ?? '').replace(/^\uFEFF/, '').trim()
  if (!url) return (cached = null)
  const client = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 1000,
    // Переподключаемся бесконечно, но не реже раза в 10 с: после деплоя Redis
    // может подняться чуть позже сайта.
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  })
  // Без слушателя ioredis пишет в лог каждую неудачную попытку. Одной строки в
  // минуту хватает, чтобы заметить, и лог не забивается.
  let lastWarn = 0
  client.on('error', (e) => {
    const now = Date.now()
    if (now - lastWarn < 60_000) return
    lastWarn = now
    console.warn('[redis]', e?.message || e)
  })
  return (cached = client)
}
