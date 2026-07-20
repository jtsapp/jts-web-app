// Клиент API регистрации/входа.
// Адрес бэкенда — единый источник в src/config/backend.js. Дефолт там —
// dev-server (тот же, что читает dev-админка), в проде задаётся NEXT_PUBLIC_API_URL.
import { API_URL as BASE } from './config/backend'

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

// Ролевые сценарии для голосового тьютора — публичный эндпоинт (INK AI tutor,
// раздел «Сценарии» в админке). optional level фильтрует по CEFR; без него —
// все активные. Формат: [{id,slug,emoji,level,titleI18n:{en,ru,kz},setup,orderIndex,isActive}]
export function getInkScenarios(level) {
  const q = level ? `?level=${encodeURIComponent(level)}` : ''
  return get('/ink/practice' + q)
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

// ─── Кэш каталогов Практики (stale-while-revalidate) ─────────────────────────
// Админ-каталоги меняются редко (только правками в dev-admin), поэтому повторные
// открытия страницы отдаются мгновенно из localStorage, а сеть обновляет копию в
// фоне — свежие данные подхватятся при следующем открытии. Первый-в-жизни запрос
// ждёт сеть, как раньше.
const CATALOG_CACHE_VER = 'v1' // поднять при несовместимой смене формы ответа

// Пользовательская часть ключа: sub из JWT (стабилен между сессиями). Ключ
// разделяет пользователей — у ситуативок есть per-user флаг completed — и
// окружения (BASE).
function tokenIdentity(token) {
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1]))
    return payload.sub || payload.userId || payload.phone || 'anon'
  } catch {
    return 'anon'
  }
}

function catalogCacheKey(path, token) {
  return `jts_catalog_${CATALOG_CACHE_VER}:${BASE}:${tokenIdentity(token)}:${path}`
}

async function cachedAuthGet(path, token) {
  if (typeof window === 'undefined') return authGet(path, token) // SSR — без кэша
  const key = catalogCacheKey(path, token)
  let cached = null
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) cached = JSON.parse(raw)
  } catch {
    /* битый кэш → обычный сетевой запрос */
  }
  const refresh = () =>
    authGet(path, token).then((data) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(data))
      } catch {
        /* квота localStorage исчерпана — работаем без кэша */
      }
      return data
    })
  if (cached !== null) {
    refresh().catch(() => {}) // фоновое обновление; его сбой не всплывает в UI
    return cached
  }
  return refresh()
}

// Учебный путь королевства (уроки из dev-admin) по уровню CEFR
export function getLearningPath(level, token) {
  return authGet(`/mobile/learning-paths/by-language-level/${encodeURIComponent(level)}`, token)
}

// Уроки (контент) — опубликованные Speakout-модули из раздела «Уроки (контент)»
// админки (GET /mobile/lesson-modules). Каждый модуль — самодостаточный
// hosted-сайт: его index.html лежит в `indexUrl`. Королевство показывает
// модуль, чей CEFR-уровень совпадает с уровнем королевства (Sunhaven → A1).
export function getLessonModules(token) {
  return authGet('/mobile/lesson-modules', token)
}

// Аудиокниги (GET /mobile/audio-lessons) — каталог «Книжек» из dev-admin.
// Отдаёт [{id,title,author,description,level,topic,genre,year,coverImageUrl,
// durationLabel,audioUrl,tracks,...}] с настоящими обложками (coverImageUrl).
export function getAudiobooks(token) {
  return cachedAuthGet('/mobile/audio-lessons', token)
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

// Вход: запрашиваем код сразу, без /registration/initiate — иначе незнакомый
// номер молча зарегистрировался бы «Гостем». Незарегистрированный номер здесь
// даёт 400 «User with this phone not found», и мы показываем это пользователю.
export async function requestLoginOtp(phone) {
  await post('/auth/otp/request', { phone: normalizePhone(phone) })
  return 'login'
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

// Вход через Google: id_token из Google Identity Services → LoginResponse
// с accessToken. Бэкенд сам создаёт пользователя при первом входе.
export function loginWithGoogle(idToken) {
  return post('/auth/google', { idToken })
}

// Вход по OTP → accessToken. Используется после регистрации, чтобы получить JWT.
// В dev-окружении код всегда '0000' (запрос генерирует свежий код).
export async function loginWithOtp(phone, otp = '0000') {
  const p = normalizePhone(phone)
  await post('/auth/otp/request', { phone: p })
  const res = await post('/auth/otp/verify', { phone: p, otp })
  return res?.accessToken || null
}

// ─────────────────────────────────────────────────────────────────────────
// Практика: контент из dev-admin (mobile-эндпоинты бэкенда, требуют Bearer).
// dev-admin.justtostudy.kz читает из того же dev-server, поэтому всё, что
// заведено в админке, приходит сюда.
// ─────────────────────────────────────────────────────────────────────────

// Вход по телефону + паролю (тот же логин, что у dev-админки) → accessToken.
export async function loginWithPassword(phone, password) {
  const p = normalizePhone(phone)
  const res = await post('/auth/login', { phone: p, password })
  return res?.accessToken || null
}

// Демо-доступ для витрины «Практика», когда пользователь ещё не залогинен
// (флоу Skip). Кэшируем промис, чтобы не логиниться повторно.
const DEMO_PHONE = process.env.NEXT_PUBLIC_DEMO_PHONE || '+7 (777) 123-45-67'
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'password123'
let _demoTokenPromise = null
export function getPracticeToken(token) {
  if (token) return Promise.resolve(token)
  if (!_demoTokenPromise) {
    _demoTokenPromise = loginWithPassword(DEMO_PHONE, DEMO_PASSWORD).catch((e) => {
      _demoTokenPromise = null // дать шанс на повторную попытку
      throw e
    })
  }
  return _demoTokenPromise
}

// Мемы и рилсы (GET /mobile/media-clips) → [{title,mediaUrl,thumbnailUrl,kind,mediaType,durationLabel,views,level}]
export function getMediaClips(token) {
  return cachedAuthGet('/mobile/media-clips', token)
}

// Ситуации (GET /mobile/situativki?level=) → [{title,coverUrl,videoUrl,level,category,completed}]
export function getSituativki(token, level) {
  const q = level ? `?level=${encodeURIComponent(level)}` : ''
  return cachedAuthGet('/mobile/situativki' + q, token)
}

// Словарь пользователя (GET /mobile/saved-words) → [{word,translation,learned,correctCount,language}]
export function getSavedWords(token) {
  return authGet('/mobile/saved-words', token)
}

// Сохранить слово из тап-перевода читалки (POST /mobile/saved-words).
// alternates — строка «через запятую», language — язык перевода ("ru"/"kk"),
// source — откуда слово (название книги). Возвращает SavedWordResponse.
export async function saveWord(token, { word, translation, alternates, language = 'ru', source }) {
  let res
  try {
    res = await fetch(`${BASE}/mobile/saved-words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ word, translation, alternates, language, source }),
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) throw new Error(`Не удалось сохранить слово (${res.status})`)
  return res.json().catch(() => ({}))
}

// Уровень CEFR из профиля пользователя (GET /user/language-level).
// Бэкенд отдаёт enum как JSON-строку ("A1"); подстраховываемся и на объект.
export async function getLanguageLevel(token) {
  const data = await authGet('/user/language-level', token)
  if (typeof data === 'string') return data
  return data?.languageLevel || data?.level || data?.value || null
}

// Обновление профиля (PUT /user/update, Bearer). Тело — как UpdateUserRequest
// мобилки: name обязателен, остальные поля шлём только если заданы, чтобы не
// затирать то, что уже хранит бэкенд. Возвращает обновлённый UserInfo.
export async function updateUser(token, { name, email, city, gender, birthDate }) {
  const payload = { name }
  if (email) payload.email = email
  if (city) payload.city = city
  if (gender) payload.gender = gender
  if (birthDate) payload.birthDate = birthDate
  let res
  try {
    res = await fetch(`${BASE}/user/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (Array.isArray(data?.messages) && data.messages[0]) ||
      data?.message ||
      `Не удалось сохранить профиль (${res.status})`
    throw new Error(msg)
  }
  return data
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
