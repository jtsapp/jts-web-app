// Ключ отметки «тур показан» и имя тура — общие для браузера (lib/tourMarks.js) и сервера
// (/api/profile/tours): сервер принимает только то, что клиент сумеет из ключа собрать обратно.
//
// Ключ — `jts_tour_<экран>:<владелец>[:<вариант>]`: владелец — `user-<id>` аккаунта или device-id гостя,
// вариант — редакция тура того же экрана («Главная» общего курса — `:ge`, у неё свой тур). Имя тура для
// сервера — ключ без владельца: `home:ge`, `practice`. Прежние ключи строились так же, поэтому отметки,
// поставленные до сервера, читаются тем же разбором.

const PART = '[a-z0-9_-]'
const NAME_RE = new RegExp(`^${PART}{1,24}(?::${PART}{1,16})?$`)
const KEY_RE = new RegExp(`^jts_tour_(${PART}{1,24}):([^:]+)(?::(${PART}{1,16}))?$`)

// scope разводит туры разных экранов; у дашборда тьютора он остался 'dash', поэтому
// старые отметки в силе и второй раз тьюторский тур никому не выпадет.
export function tourKeyFor(owner, scope = 'dash') {
  return `jts_tour_${scope}:${owner || 'anon'}`
}

/** Имя тура, которое можно хранить на сервере: `home`, `home:ge`. */
export function isTourName(name) {
  return typeof name === 'string' && NAME_RE.test(name)
}

/**
 * Разбор ключа: { scope, owner, variant, name } или null. Ключ не по схеме (у Shadowing IELTS он
 * без владельца — `jts_tour_ielts_shadowing`) остаётся только в браузере.
 */
export function parseTourKey(key) {
  const m = typeof key === 'string' ? KEY_RE.exec(key) : null
  if (!m) return null
  const [, scope, owner, variant = null] = m
  return { scope, owner, variant, name: variant ? `${scope}:${variant}` : scope }
}

/** Тот же тур у другого владельца — так находится отметка, поставленная под device-id до входа. */
export function tourKeyForOwner(parsed, owner) {
  const base = tourKeyFor(owner, parsed.scope)
  return parsed.variant ? `${base}:${parsed.variant}` : base
}
