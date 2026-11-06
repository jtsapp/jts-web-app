// Передаёт тему приложения рамкам живых уроков.
//
// Файл урока при старте сам просит тему сообщением, поэтому адрес рамки не меняется: смена src перезагрузила бы рамку
// и обнулила несохранённые ответы (см. lessonMaterialRenderUrl). Тему получают только запросившие её рамки; сторонние
// рамки (видео, Wordwall) про неё не узнают.
export function createLessonFrameTheme(host, currentTheme) {
  const frames = new Set()
  const send = (frame) => frame.postMessage({ source: 'jts-workspace', type: 'theme', theme: currentTheme() }, '*')

  const onMessage = (event) => {
    if (event.data?.source !== 'jts-theme' || event.data?.type !== 'request' || !event.source) return
    frames.add(event.source)
    send(event.source)
  }
  host.addEventListener('message', onMessage)

  return {
    themeChanged() {
      frames.forEach((frame) => {
        if (frame.closed) frames.delete(frame)
        else send(frame)
      })
    },
    stop() {
      host.removeEventListener('message', onMessage)
    },
  }
}

export function appTheme(root) {
  return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}
