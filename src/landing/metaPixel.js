// Meta Pixel лендинга justtostudy-english.kz.
//
// Отдельный пиксель сайта-платформы: данные не смешиваются со старым Tilda-сайтом (пиксель 5929087943811963).
// ID — публичный идентификатор, не секрет; META_PIXEL_ID в окружении сервера его переопределяет без пересборки.
// Токен доступа клиентскому коду не нужен. Пиксель грузится только на домене лендинга (см. app/landing/page.jsx):
// приложение для учеников ai-tutor.justtostudy.kz с личными экранами в рекламную аудиторию не попадает.

export const DEFAULT_META_PIXEL_ID = '1639157507717823'

// ID пикселя — только цифры: он подставляется в код страницы, лишнего туда пускать нельзя.
export function metaPixelId(raw) {
  const id = String(raw ?? '').replace(/^\uFEFF/, '').trim()
  return /^\d{8,20}$/.test(id) ? id : DEFAULT_META_PIXEL_ID
}

// Стандартный загрузчик пикселя Meta + PageView.
export function pixelBootstrap(id) {
  return `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${id}');
fbq('track','PageView');`
}

export function pixelNoscriptSrc(id) {
  return `https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`
}

/**
 * Конверсия Lead: заявка принята сервером. Зовётся строго после успешного ответа и ДО перехода в приложение.
 * Возвращает eventID (для будущей дедупликации с Conversions API) или null, если пикселя на странице нет —
 * на dev и на чужих доменах он не загружается, и событие уходить некуда.
 */
export function trackLead(win = typeof window === 'undefined' ? null : window) {
  if (!win || typeof win.fbq !== 'function') return null
  const eventID = win.crypto?.randomUUID?.() ?? `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    win.fbq('track', 'Lead', { content_name: 'trial_form' }, { eventID })
  } catch {
    /* реклама не должна ломать отправку заявки */
    return null
  }
  return eventID
}
