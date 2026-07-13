// Клиент API регистрации/входа.
// По умолчанию бьём в dev-бэкенд — тот же, что читает dev-админка
// (https://dev-admin.justtostudy.kz → https://dev-server.justtostudy.kz),
// поэтому новые регистрации сразу видны в разделе «Пользователи» админки.
const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz'

// Приводим телефон к формату бэкенда: 7XXXXXXXXXX (11 цифр, без "+")
export function normalizePhone(input) {
  let d = String(input).replace(/\D/g, '')
  // если введён код страны (11 цифр с ведущей 7/8) — убираем его
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1)
  return '7' + d.slice(-10) // 7 + 10 цифр национального номера
}

async function get(path) {
  let res
  try {
    res = await fetch(BASE + path)
  } catch (e) {
    throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
  }
  if (!res.ok) throw new Error(`Ошибка сервера (${res.status})`)
  return res.json()
}

// CEFR-тест: банк вопросов (публичный эндпоинт, адаптивная логика — на клиенте)
export function getAdaptiveQuestions() {
  return get('/adaptive-test/questions')
}

async function authGet(path, token) {
  let res
  try {
    res = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) throw new Error(`Ошибка сервера (${res.status})`)
  return res.json()
}

// Учебный путь королевства (уроки из dev-admin) по уровню CEFR
export function getLearningPath(level, token) {
  return authGet(`/mobile/learning-paths/by-language-level/${encodeURIComponent(level)}`, token)
}

// Баланс: монеты и стрик (для HUD)
export function getBalance(token) {
  return authGet('/mobile/balance/info', token)
}

// Считает уроки/пройдено по LearningPathModel (modules -> sections -> activities)
const LESSON_TYPES = new Set(['LESSON', 'QUIZ', 'PRACTICE', 'REVIEW', 'ASSESSMENT', 'ORDINARY', 'MNEMOTECHNIC'])
export function countProgress(path) {
  let total = 0
  let done = 0
  const modules = path?.modules || []
  for (const m of modules) {
    for (const s of m.sections || []) {
      for (const a of s.activities || []) {
        if (LESSON_TYPES.has((a.activityType || '').toUpperCase())) {
          total += 1
          if (a.completed) done += 1
        }
      }
    }
  }
  return { total, done }
}

async function post(path, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (Array.isArray(data?.messages) && data.messages[0]) ||
      data?.message ||
      data?.error ||
      `Ошибка сервера (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

// Шаг 1: отправка кода. Возвращает режим — 'register' или 'login'
// (если телефон уже зарегистрирован, переходим на вход по OTP).
export async function sendOtp(phone, name) {
  const p = normalizePhone(phone)
  try {
    await post('/registration/initiate', { name: name || 'Гость', phone: p })
    return 'register'
  } catch (e) {
    if ((e.message || '').toLowerCase().includes('exist')) {
      await post('/auth/otp/request', { phone: p })
      return 'login'
    }
    throw e
  }
}

// Шаг 2: проверка кода. В режиме register создаёт пользователя (без токена),
// в режиме login — возвращает LoginResponse с accessToken.
export async function verifyOtp(phone, code, name, mode) {
  const p = normalizePhone(phone)
  if (mode === 'login') {
    return post('/auth/otp/verify', { phone: p, otp: code })
  }
  return post('/registration/verify', { name: name || 'Гость', phone: p, otp: code })
}

// Вход по OTP → accessToken. Используется после регистрации, чтобы получить JWT.
// В dev-окружении код всегда '0000' (запрос генерирует свежий код).
export async function loginWithOtp(phone, otp = '0000') {
  const p = normalizePhone(phone)
  await post('/auth/otp/request', { phone: p })
  const res = await post('/auth/otp/verify', { phone: p, otp })
  return res?.accessToken || null
}

// Сохранить уровень CEFR в профиль пользователя (query-param + Bearer).
export async function saveLanguageLevel(token, level) {
  const url = `${BASE}/user/language-level?languageLevel=${encodeURIComponent(level)}`
  let res
  try {
    res = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } })
  } catch (e) {
    throw new Error('Нет связи с сервером при сохранении уровня.')
  }
  if (!res.ok) throw new Error(`Не удалось сохранить уровень (${res.status})`)
  return res.json().catch(() => ({}))
}
