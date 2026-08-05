// Минимальный HTML-санитайзер для info-блоков живых уроков. block.html
// приходит с публичного files-api (jsonUrl из loadLiveLesson) без подписи —
// перед dangerouslySetInnerHTML режем исполняемое содержимое: теги
// <script>/<style>/<iframe>/<object>/<embed>, on*-обработчики и
// javascript:-ссылки в href/src. Не полноценный HTML-sanitizer (DOMPurify) —
// content уже проходит через контролируемый extractor-пайплайн, это защита
// «на всякий случай», не барьер против произвольного враждебного HTML.
//
// DOMParser — браузерный API, поэтому вызывается только на клиенте. В этом
// приложении LessonWorkspacePage рендерится исключительно после гидратации
// (см. App.jsx: ?screen применяется эффектом, SSR всегда отдаёт 'welcome'),
// так что к моменту вызова window/DOMParser уже есть — но на случай другого
// пути рендера возвращаем исходную строку как safe-фолбэк вместо краша.

const STRIPPED_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base']

export function sanitizeHtml(html) {
  const source = String(html || '')
  if (!source.trim()) return ''
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return source

  const doc = new DOMParser().parseFromString(source, 'text/html')

  STRIPPED_TAGS.forEach((tag) => {
    doc.body.querySelectorAll(tag).forEach((el) => el.remove())
  })

  doc.body.querySelectorAll('*').forEach((el) => {
    ;[...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim()
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
      } else if ((name === 'href' || name === 'src') && /^javascript:/i.test(value)) {
        el.removeAttribute(attr.name)
      }
    })
  })

  return doc.body.innerHTML
}
