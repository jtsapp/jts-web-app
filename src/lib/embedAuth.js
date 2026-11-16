// Вход кабинета, открытого рамкой в уроке. Своей сессии у рамки нет: её хранилище браузер держит отдельно от вкладки
// кабинета, а у преподавателя кабинета нет вовсе. Токен есть у страницы урока — спрашиваем его у окна-родителя и
// принимаем ответ только от него и только с origin бэкенда (страницу урока отдаёт он).
export function requestEmbedToken({ win = window, parent = window.parent, apiOrigin, timeoutMs = 3000 }) {
  return new Promise((resolve) => {
    if (!parent || parent === win || !apiOrigin) {
      resolve(null)
      return
    }
    let timer = null
    const done = (token) => {
      clearTimeout(timer)
      win.removeEventListener('message', onMessage)
      resolve(token)
    }
    function onMessage(event) {
      const data = event.data
      if (event.origin !== apiOrigin || event.source !== parent) return
      if (!data || data.source !== 'jts-lesson' || data.type !== 'practice-auth' || typeof data.token !== 'string' || !data.token) return
      done(data.token)
    }
    timer = setTimeout(() => done(null), timeoutMs)
    win.addEventListener('message', onMessage)
    parent.postMessage({ source: 'jts-practice', type: 'auth-request' }, apiOrigin)
  })
}
