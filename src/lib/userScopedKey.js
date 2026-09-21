// Ключ localStorage, свой у каждого вошедшего ученика.
//
// Для прогресса, у которого нет серверной копии (пройденные сценарии
// «Ситуаций», результаты караоке): под общим ключом браузера его после
// «Выйти» видел следующий ученик на том же компьютере, а стереть при выходе
// нельзя — владелец терял бы своё. У гостя ключ общий: он на устройстве один,
// и при входе его прогресс переезжает в аккаунт (как навыки, см. skillStats).
import { loadToken } from './session.js'
import { userIdFromToken } from './jwt.js'

export function userScopedKey(base) {
  const uid = userIdFromToken(loadToken())
  if (!uid) return base
  const own = `${base}:${uid}`
  // Общий ключ забирает первый вошедший — это и гостевой прогресс, и данные,
  // накопленные до привязки к пользователю. Своё при этом не затираем.
  try {
    const shared = localStorage.getItem(base)
    if (shared != null) {
      if (localStorage.getItem(own) == null) localStorage.setItem(own, shared)
      localStorage.removeItem(base)
    }
  } catch {
    /* приватный режим — работаем со своим ключом как есть */
  }
  return own
}
