// Срок демо-доступа. Бэкенд ставит `demoExpiresAt` при саморегистрации
// (RegistrationService/AuthService, +demoTrialDays) и отдаёт его в GET /user/me;
// здесь только арифметика остатка — без DOM и без сети, поэтому проверяется
// обычным юнит-тестом.

/**
 * Сколько осталось от демо-доступа.
 *
 * `null`/пустая дата — демо без срока (менеджер выдал доступ вручную): это не
 * «истёк», а «таймера нет», и различать их обязательно — иначе бессрочное демо
 * показало бы «доступ закончился» сразу после входа.
 *
 * @returns {{ endless: boolean, expired: boolean, ms: number, days: number, hours: number, minutes: number }}
 */
export function demoTimeLeft(expiresAt, now = Date.now()) {
  const none = { endless: true, expired: false, ms: 0, days: 0, hours: 0, minutes: 0 }
  if (!expiresAt) return none
  const end = toMs(expiresAt)
  if (end === null) return none
  const ms = end - now
  if (ms <= 0) return { endless: false, expired: true, ms: 0, days: 0, hours: 0, minutes: 0 }
  const totalMinutes = Math.floor(ms / 60000)
  return {
    endless: false,
    expired: false,
    ms,
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  }
}

// Бэкенд отдаёт LocalDateTime без зоны («2026-10-19T03:48:24»), и это МЕСТНОЕ
// время сервера, а не UTC: JVM живёт в Asia/Qyzylorda (-Duser.timezone в
// compose-app.yaml), а в базе Hibernate хранит то же самое как UTC
// (`hibernate.jdbc.time_zone: UTC`) и при чтении переводит обратно в пояс JVM.
//
// Safari такую строку через new Date() разбирает как UTC, а Chrome — как
// местное время: расхождение на пять часов на одном и том же аккаунте.
// Достраиваем смещение сами, чтобы обе платформы считали одинаково.
//
// ДО 08.10.2026 здесь стояло 'Z' с пометкой «сервер живёт в UTC» — это было
// верно, пока пояс JVM не перевели на Qyzylorda (сентябрь), и с тех пор плашка
// завышала остаток ровно на 5 часов: у Тилека в базе срок кончается 19.10 в
// 03:48 по Казахстану, а плашка считала до 08:48. Смещение жёсткое, а не из
// браузера, намеренно: школа в одном поясе (+05:00, без перехода на летнее
// время), а считать нужно по поясу СЕРВЕРА, где бы ни сидел ученик.
export const SERVER_UTC_OFFSET = '+05:00'

function toMs(value) {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  const s = String(value).trim()
  if (!s) return null
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s) ? `${s}${SERVER_UTC_OFFSET}` : s
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

/**
 * Остаток словами для плашки: «осталось 18 ч 24 мин».
 *
 * Дни показываем только когда они есть, минуты — только когда до конца меньше
 * суток: «осталось 6 д 3 ч 41 мин» человек всё равно читает как «ещё долго», а
 * последний час должен быть виден поминутно.
 */
export function formatDemoLeft(t, left) {
  if (!left || left.endless) return ''
  if (left.expired) return t('demo.left.expired')
  const parts = []
  if (left.days > 0) parts.push(t('demo.left.d', { n: String(left.days) }))
  if (left.hours > 0) parts.push(t('demo.left.h', { n: String(left.hours) }))
  if (left.days === 0) parts.push(t('demo.left.m', { n: String(left.minutes) }))
  return t('demo.left.prefix', { rest: parts.join(' ') })
}
