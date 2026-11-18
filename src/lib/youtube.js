// Загрузка YouTube IFrame API — один раз на вкладку. Общая у Шэдоуинга и Видеодиктанта (до 18.11.2026 жила в
// ShadowingPage.jsx, поведение то же). SSR-гард: на сервере window нет — отдаём null, плеер создаётся уже в эффекте
// после гидратации, иначе первый рендер клиента разошёлся бы с сервером (см. комментарий про hydration mismatch в
// App.jsx). Обработчик onYouTubeIframeAPIReady, поставленный до нас, не теряем — зовём его первым.

let apiPromise = null

export function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev()
        resolve(window.YT)
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    })
  }
  return apiPromise
}
