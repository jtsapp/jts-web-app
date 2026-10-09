// Откуда пришёл человек — для заявки менеджеру в amoCRM: с лендинга
// (from=landing → тег «Лендинг») и с какой рекламы (UTM-метки).
//
// Лендинг и приложение живут на разных доменах, поэтому метка едет в адресе
// ссылки «Начать обучение», а приложение запоминает её в localStorage: между
// заходом и регистрацией может пройти и минута, и неделя. При регистрации
// поля уходят в /registration/* (бэкенд: RegistrationRequest.from/utm*), и
// после успешной регистрации метка стирается.

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

// Имя метки в адресе → поле запроса бэкенда (RegistrationRequest, LandingLeadRequest).
const UTM_FIELDS = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
}

const STORAGE_KEY = 'jts_attribution'
// Окно, в котором регистрация засчитывается рекламе/лендингу: обычное для
// маркетинга «последнее касание за 30 дней».
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000
// Метку пишет кто угодно; длиннее — мусор, а не кампания (бэкенд режет так же).
const MAX = 200

/** UTM-метки из URLSearchParams или простого объекта; пустые выкинуты, длина обрезана. */
export function pickUtm(params) {
  const get = (k) => (typeof params?.get === 'function' ? params.get(k) : params?.[k])
  const out = {}
  for (const key of UTM_KEYS) {
    const value = String(get(key) ?? '').trim().slice(0, MAX)
    if (value) out[key] = value
  }
  return out
}

/** Метки → поля запроса бэкенда ({ utmSource, … }). */
export function utmFields(utm) {
  const out = {}
  for (const [key, field] of Object.entries(UTM_FIELDS)) if (utm?.[key]) out[field] = utm[key]
  return out
}

/**
 * Путь в приложение с лендинга: from=landing и метки той рекламы, что привела
 * на лендинг, — иначе они остались бы на домене лендинга.
 */
export function landingAppPath(path, utm = {}) {
  const [base, query = ''] = path.split('?')
  const sp = new URLSearchParams(query)
  sp.set('from', 'landing')
  for (const [key, value] of Object.entries(utm)) sp.set(key, value)
  return `${base}?${sp}`
}

/** localStorage или null: в приватном режиме и при запрете cookies сам доступ к нему бросает. */
export function safeStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Запомнить, откуда пришёл, если в адресе есть что запоминать. Последний
 * заход с меткой перекрывает прошлый; заход без меток прошлый не стирает.
 */
export function captureAttribution(search, storage, now = Date.now()) {
  const params = new URLSearchParams(search)
  const fromLanding = params.get('from') === 'landing'
  const utm = pickUtm(params)
  if (!fromLanding && !Object.keys(utm).length) return null
  const record = { from: fromLanding ? 'landing' : null, utm, at: now }
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Квота (её съедает кэш каталогов) или запрет хранилища — метка просто не
    // доедет до CRM; ломать из-за неё вход нельзя.
  }
  return record
}

/** Запомненная метка, если она не старше окна; иначе null. */
export function readAttribution(storage, now = Date.now()) {
  try {
    const record = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')
    if (!record || typeof record.at !== 'number' || now - record.at > ATTRIBUTION_TTL_MS) return null
    return record
  } catch {
    return null
  }
}

export function clearAttribution(storage) {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // нечего чистить
  }
}

/** Поля для /registration/initiate и /verify; меток нет — пустой объект. */
export function registrationFields(record) {
  if (!record) return {}
  return { ...(record.from === 'landing' ? { from: 'landing' } : {}), ...utmFields(record.utm) }
}
