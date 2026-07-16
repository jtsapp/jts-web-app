// Google Sign-In (Google Identity Services).
// Кнопку рисует сам Google (renderButton) — это единственный поддерживаемый
// способ получить id_token по клику без redirect-флоу и client secret на
// фронте. Свою кнопку-стилизацию Google для id_token не разрешает.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export function isGoogleAuthEnabled() {
  return Boolean(GOOGLE_CLIENT_ID)
}

// Скрипт GIS грузим один раз и лениво — только когда пользователь дошёл до
// кнопок входа. Кэшируем промис, чтобы параллельные вызовы не плодили теги.
let _gisPromise = null
function loadGis() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (!_gisPromise) {
    _gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = () => resolve(window.google)
      s.onerror = () => {
        _gisPromise = null // дать шанс повторной загрузке
        reject(new Error('Не удалось загрузить Google Sign-In.'))
      }
      document.head.appendChild(s)
    })
  }
  return _gisPromise
}

// Рисует официальную кнопку Google в container. onCredential получает id_token,
// который бэкенд проверяет в POST /auth/google. lang — 'ru' | 'en' | 'kk'.
export async function renderGoogleButton(container, onCredential, lang = 'ru') {
  if (!GOOGLE_CLIENT_ID || !container) return false
  const google = await loadGis()
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      if (resp?.credential) onCredential(resp.credential)
    },
  })
  container.innerHTML = '' // повторный рендер (смена языка) не должен дублировать кнопку
  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    locale: lang,
    width: 220,
  })
  return true
}
