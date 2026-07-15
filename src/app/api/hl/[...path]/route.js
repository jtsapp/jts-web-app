// Прокси hosted-Speakout-страниц (тропа index.html + страницы уроков).
//
// Зачем: курс хостится на files-api.iqra.space (cross-origin), поэтому из iframe
// туда нельзя внедрить CSS, чтобы убрать нижний «бренд-футер» тропы (brandbar +
// «Just To Study · …» + кнопка «Сбросить прогресс»). Роут отдаёт те же
// страницы с нашего origin, дописав в <head>:
//   • <base href="/api/hl/{dir}/"> — относительные ссылки навигации
//     (уроки lessons/*.html, «назад» ../index.html, next-урок Lxx.html)
//     резолвятся снова на прокси, т.е. вся навигация остаётся на нашем origin
//     и футер скрыт на КАЖДОЙ странице, а не только на первой;
//   • <style>div.wrap{display:none}</style> — прячет футер. Именно скрываем,
//     а не вырезаем: кнопка #btnReset остаётся в DOM, её JS-обработчик не
//     падает. На тропе `div.wrap` бьёт только по футеру (сама тропа —
//     <main class="wrap" id="path">); у страниц урока div.wrap нет — no-op.
//
// Ассеты проксировать не нужно: аудио уроков встроено как data:base64, CSS/JS
// инлайновые, внешний только абсолютный Google-шрифт — всё грузится напрямую.

export const runtime = 'nodejs'

const UPSTREAM = 'https://files-api.iqra.space'
// Ограничиваем прокси только Speakout-курсами и только .html (SSRF-защита).
const ALLOWED_PREFIX = 'development/speakout/'

export async function GET(request, { params }) {
  const { path } = await params
  const rel = (Array.isArray(path) ? path : []).join('/')

  if (
    !rel.startsWith(ALLOWED_PREFIX) ||
    !rel.endsWith('.html') ||
    rel.includes('..')
  ) {
    return new Response('forbidden', { status: 403 })
  }

  const upstreamUrl = `${UPSTREAM}/${rel}`
  let html
  try {
    const res = await fetch(upstreamUrl, { headers: { Accept: 'text/html' } })
    if (!res.ok) return new Response(`upstream ${res.status}`, { status: 502 })
    html = await res.text()
  } catch {
    return new Response('upstream fetch failed', { status: 502 })
  }

  // База = директория текущей страницы В ПРОСТРАНСТВЕ ПРОКСИ, чтобы вся
  // относительная навигация оставалась на /api/hl/… (и футер был скрыт везде).
  const dir = rel.slice(0, rel.lastIndexOf('/') + 1)
  const inject =
    `<base href="/api/hl/${dir}">` +
    `<style>div.wrap{display:none!important}</style>`

  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => m + inject)
    : inject + html

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
