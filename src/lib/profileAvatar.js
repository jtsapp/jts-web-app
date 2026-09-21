// Фото и фон аватара в профиле — веб-аналог настроек мобилки. Серверного поля
// под них нет, поэтому они живут в localStorage, и ключ обязан быть свой у
// каждого пользователя: общий ключ показывал следующему ученику на том же
// компьютере фото предыдущего. Стирать его при выходе нельзя — владелец терял
// бы фото при каждом повторном входе.
import { userIdFromToken } from './jwt.js'

const AVATAR_KEY = 'jts_profile_avatar'
const AVATAR_BG_KEY = 'jts_avatar_bg'

function keyFor(base, token) {
  const uid = userIdFromToken(token)
  return uid ? `${base}:${uid}` : null
}

// Значение из старого общего ключа (до привязки к пользователю) забирает
// первый, кто открыл профиль, — на личном устройстве это и есть владелец.
// Общий ключ при этом стирается, чтобы то же фото не досталось второму.
function read(base, token) {
  const key = keyFor(base, token)
  if (!key) return null
  try {
    const own = localStorage.getItem(key)
    if (own != null) return own
    const legacy = localStorage.getItem(base)
    if (legacy == null) return null
    // Сначала стираем общий ключ, потом пишем свой: фото в пару мегабайт в
    // двух копиях не влезало в квоту, setItem бросал — владелец терял фото, а
    // старая копия так и занимала место навсегда.
    localStorage.removeItem(base)
    try {
      localStorage.setItem(key, legacy)
    } catch {
      // Не влезло и одно — вернём общий ключ на место, пусть фото не пропадёт.
      try { localStorage.setItem(base, legacy) } catch { /* ignore */ }
    }
    return legacy
  } catch {
    return null
  }
}

function write(base, token, value) {
  const key = keyFor(base, token)
  if (!key) return
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* квота или приватный режим — фото проживёт до перезагрузки */
  }
}

export const readAvatar = (token) => read(AVATAR_KEY, token)
export const saveAvatar = (token, url) => write(AVATAR_KEY, token, url)
export const removeAvatar = (token) => write(AVATAR_KEY, token, null)
export const readAvatarBg = (token) => read(AVATAR_BG_KEY, token)
export const saveAvatarBg = (token, color) => write(AVATAR_BG_KEY, token, color)
