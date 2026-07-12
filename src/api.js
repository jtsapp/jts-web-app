// Клиент API регистрации/входа.
// По умолчанию бьём в dev-бэкенд — тот же, что читает dev-админка
// (https://dev-admin.justtostudy.kz → https://dev-server.justtostudy.kz),
// поэтому новые регистрации сразу видны в разделе «Пользователи» админки.
const BASE = import.meta.env.VITE_API_URL || 'https://dev-server.justtostudy.kz'

// Приводим телефон к формату бэкенда: 7XXXXXXXXXX (11 цифр, без "+")
export function normalizePhone(input) {
  const digits = String(input).replace(/\D/g, '')
  const ten = digits.replace(/^[78]/, '').slice(-10)
  return '7' + ten
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

// Шаг 2: проверка кода. В режиме register создаёт пользователя,
// в режиме login — выдаёт JWT существующему.
export async function verifyOtp(phone, code, name, mode) {
  const p = normalizePhone(phone)
  if (mode === 'login') {
    return post('/auth/otp/verify', { phone: p, otp: code })
  }
  return post('/registration/verify', { name: name || 'Гость', phone: p, otp: code })
}
