// Роль пользователя из JWT.
//
// Бэкенд кладёт её в payload (`role: 'TEACHER' | 'STUDENT' | …`), но приложение
// её никогда не читало — и потому показывало преподавателю ученический
// интерфейс целиком: уровень, роль в королевстве, стрик, монеты и разделы
// Практики с Тьютором.
//
// Это разбор, а не проверка: подпись здесь не валидируется и не может — секрета
// у клиента нет и быть не должно (см. lib/auth-server.js). Роль отсюда годится
// только на то, чтобы решить, что показать. Всё, что важно, бэкенд проверяет у
// себя: подменённый токен даст другой интерфейс, но не доступ.

/** Роль из токена в верхнем регистре, либо null — если токена нет или он битый. */
export function roleFromToken(token) {
  const payload = decodePayload(token)
  const role = payload?.role
  return typeof role === 'string' && role ? role.toUpperCase() : null
}

/** Преподаватель ли это. Отдельной функцией — проверка встречается в разметке. */
export function isTeacher(token) {
  return roleFromToken(token) === 'TEACHER'
}

function decodePayload(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    // base64url → base64, и добиваем padding: atob к нему придирчив.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    // Проценты-хак: payload может содержать не-ASCII (имя, телефон), а atob
    // отдаёт байты по одному символу.
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}
