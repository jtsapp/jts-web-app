/** @type {import('next').NextConfig} */

// Next отдаёт всё из /public с `Cache-Control: public, max-age=0`, а nginx перед
// ним заголовки не переписывает. На проде это значило: при каждом переходе между
// экранами браузер заново спрашивал КАЖДУЮ картинку. На 4G это 150–400 мс на
// запрос, соединение HTTP/1.1 (максимум 6 параллельных) — отсюда жалоба клиента
// «даже на 4g очень долго грузит все фотки, все экраны».
//
// Сроки разные по смыслу файла: арт правится редко и переименовывается при
// замене, поэтому месяц; JSON уроков перегоняется экстрактором поверх старого
// имени, поэтому час. stale-while-revalidate отдаёт из кэша мгновенно и
// обновляет в фоне, так что просроченный файл всё равно не блокирует отрисовку.
const ART = 'public, max-age=2592000, stale-while-revalidate=604800'
const DATA = 'public, max-age=3600, stale-while-revalidate=86400'

const cache = (source, value) => ({ source, headers: [{ key: 'Cache-Control', value }] })

const nextConfig = {
  // Секреты читаются серверными route-handlers через process.env — в клиент
  // уходят только NEXT_PUBLIC_*.

  // Самодостаточный `.next/standalone` (сервер + только нужные node_modules)
  // для self-host в Docker — без этого Vercel-сборка тащит весь node_modules.
  output: 'standalone',

  async headers() {
    return [
      cache('/assets/:path*', ART),
      // Медиа перенесённого курса: правки контента идут в разметку, а картинки и
      // аудио к ней не переписываются.
      cache('/course/:level/img/:path*', ART),
      cache('/course/:level/audio/:path*', ART),
      cache('/tutor/:path*', ART),
      cache('/practice/:path*', ART),
      // JSON уроков «Обучения» — a1.json это 780 КБ, и он тянулся заново на
      // каждый вход в королевство. Шаги перенесённого курса лежат уровнем ниже
      // (:file — ровно один сегмент, поэтому img/ и audio/ сюда не попадают и
      // остаются на «арт»-сроке выше).
      cache('/learning/:path*', DATA),
      cache('/course/:level/:file', DATA),
    ]
  },
}

export default nextConfig
