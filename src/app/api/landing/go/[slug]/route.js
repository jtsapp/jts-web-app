// Короткая ссылка рекламы: justtostudy-english.kz/имя приходит сюда из proxy
// (routeLanding) и уводит на лендинг с UTM-метками ссылки. Ключ бэкенда
// (X-Landing-Key) живёт только на сервере, поэтому это роут, а не браузер.
// Ссылки нет или бэкенд молчит — всё равно на лендинг, без меток: человек
// пришёл по рекламе, и тупик хуже потерянной метки.
import { BACKEND_URL } from '../../../../../lib/auth-server.js'
import { leadKey } from '../../../../../landing/leadServer.js'
import { resolveShortLink, shortLinkTarget } from '../../../../../landing/shortLink.js'

export async function GET(request, { params }) {
  const { slug } = await params
  const utm = await resolveShortLink(slug, { backendUrl: BACKEND_URL, key: leadKey() })
  if (!utm) console.warn(`[short-link] /${slug}: меток нет — лендинг без них`)
  // Адрес относительный: браузер останется на том же домене, порту и протоколе,
  // что бы ни передал nginx. 307 и no-store: ссылку могут выключить или
  // поменять метки — браузер не должен запоминать старый адрес, и каждый
  // переход доходит до счётчика.
  const to = shortLinkTarget(utm, new URL(request.url).search)
  return new Response(null, { status: 307, headers: { Location: to, 'Cache-Control': 'no-store' } })
}
