/**
 * Экраны до входа. Всё остальное — кабинет: без токена его не рисуем,
 * иначе «Выйти» оставляло человека на пустых «Уроках» или SAT.
 */
export const AUTH_SCREENS = new Set([
  'welcome',
  'chat',
  'reg-lang',
  'reg-birth',
  'reg-name',
  'reg-phone',
  'reg-email',
  'reg-contacts',
  'reg-google',
  'phone',
  'otp',
  'login-password',
  'complete-registration',
  'set-password',
  'success',
  // «Аккаунт удалён»: сессию к этому экрану уже сняли (App.handleAccountDeleted), и без этой строки его тут же
  // подменял бы экран входа — человек не увидел бы, что удаление прошло.
  'account-deleted',
])

/** Гостю кабинет не показываем: его место — экран входа. */
export function screenNeedsLogin(screen, token) {
  if (token) return false
  if (typeof screen !== 'string' || !screen) return false
  return !AUTH_SCREENS.has(screen)
}
