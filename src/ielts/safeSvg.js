import DOMPurify from 'dompurify'

// Схемы к вопросам Reading и графики Writing приходят SVG-строкой из банка и вставляются через innerHTML. Банк
// заводит методист через админку, но токен ученика лежит в localStorage — одна испорченная картинка увела бы его у
// всех, кто откроет задание. Прежние регулярки ловили только «пробел + on…=» и пропускали `<svg/onload=…>`,
// закодированный javascript: и <iframe srcdoc>, поэтому чистит DOMPurify: он разбирает разметку тем же парсером,
// что и браузер, и оставляет только элементы и атрибуты SVG.
//
// Без DOM (рендер на сервере) DOMPurify не чистит, а возвращает строку как есть — там отдаём пусто: экраны IELTS
// открываются после гидратации, и до браузера сырой SVG так не доедет никогда.
export function safeSvg(svg) {
  const src = String(svg || '')
  if (!src || typeof window === 'undefined' || !DOMPurify.isSupported) return ''
  return DOMPurify.sanitize(src, { USE_PROFILES: { svg: true, svgFilters: true } })
}
