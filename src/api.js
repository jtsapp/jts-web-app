// Клиент API регистрации/входа.
// По умолчанию бьём в dev-бэкенд — тот же, что читает dev-админка
// (https://dev-admin.justtostudy.kz → https://dev-server.justtostudy.kz),
// поэтому новые регистрации сразу видны в разделе «Пользователи» админки.
const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz'

// Приводим телефон к формату бэкенда: цифры «код страны + национальный номер»
// без «+» (E.164 без плюса). Бэкенд хранит и ищет номер по точному совпадению
// и шлёт SMS как есть, поэтому важно сохранять код страны выбранной страны.
//
// Единственная нормализация — местная запись кода +7 через «8»: «8XXXXXXXXXX»
// → «7XXXXXXXXXX». Это и держит обратную совместимость: номера Казахстана/России
// остаются «7XXXXXXXXXX», как их регистрировали раньше, — вход по OTP не ломается.
export function normalizePhone(input) {
  let d = String(input).replace(/\D/g, '')
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1)
  return d
}

// Различает почту и телефон во входной строке идентификатора. ВАЖНО: не
// пытаться отличить их через normalizePhone (пустой/не-цифровой результат) —
// email, в котором случайно есть цифры (user2024@mail.com), после зачистки
// нецифровых символов превратился бы в "2024", а не остался бы пустым.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmailIdentifier(input) {
  return EMAIL_RE.test(String(input).trim())
}

// Приводит идентификатор (телефон или email, с логина/регистрации) к телу
// запроса { phone } или { email } — бэкенд принимает ровно один из двух.
function identifierBody(identifier) {
  return isEmailIdentifier(identifier)
    ? { email: String(identifier).trim() }
    : { phone: normalizePhone(identifier) }
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

async function authPut(path, token, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json().catch(() => null)
}

async function authPost(path, token, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json().catch(() => null)
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

// onFresh (опционально) вызывается со свежими данными, когда фоновое обновление
// закончилось ПОСЛЕ того, как вызвавший уже получил кэшированный ответ. Это
// позволяет кэшировать и изменяемые данные (баланс, прогресс, словарь):
// экран мгновенно рисует кэш и тихо перерисовывается, когда приходит сеть.
async function cachedAuthGet(path, token, onFresh) {
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
    refresh()
      .then((data) => onFresh?.(data))
      .catch(() => {}) // фоновое обновление; его сбой не всплывает в UI
    return cached
  }
  return refresh()
}

// Учебный путь королевства (уроки из dev-admin) по уровню CEFR.
// SWR-кэш: прогресс меняется после уроков, поэтому передавайте onFresh —
// он донесёт обновлённые счётчики, когда фоновый запрос завершится.
export function getLearningPath(level, token, onFresh) {
  return cachedAuthGet(`/mobile/learning-paths/by-language-level/${encodeURIComponent(level)}`, token, onFresh)
}

// Уроки (контент) — опубликованные Speakout-модули из раздела «Уроки (контент)»
// админки (GET /mobile/lesson-modules). Каждый модуль — самодостаточный
// hosted-сайт: его index.html лежит в `indexUrl`. Королевство показывает
// модуль, чей CEFR-уровень совпадает с уровнем королевства (Sunhaven → A1).
export function getLessonModules(token) {
  return authGet('/mobile/lesson-modules', token)
}

// Живой урок (новый admin-пайплайн «live lessons»): метаданные урока,
// включая jsonUrl — публичную files-api ссылку на расширенный JSON
// (steps/blocks/questions + info/match/gap.open), который сам контент
// грузит отдельным fetch без авторизации (см. loadLiveLesson).
export function getLiveLesson(id, token) {
  return authGet(`/mobile/live-lessons/${id}`, token)
}

// Каталог живых уроков (уровень → юнит → урок), опубликованное дерево для пикера
// учителя. SWR-кэш: структура меняется редко (админ регистрирует уровень), так
// что отдаём мгновенно из кэша и обновляем в фоне через onFresh.
export function getCourseCatalog(token, onFresh) {
  return cachedAuthGet('/mobile/course-catalog', token, onFresh)
}

// Один урок каталога: fileUrl (сырой L*.html на files-api) + type/title. Сам
// контент извлекается на клиенте из fileUrl (см. loadCatalogLesson).
export function getCourseCatalogLesson(id, token) {
  return authGet(`/mobile/course-catalog/lessons/${id}`, token)
}

// Расписание вошедшего пользователя. Бэкенд скоупит /admin/lessons* под личность
// токена: ученик/учитель получают только СВОИ занятия (чужие → 400).
export function getMyLessonOccurrences(token) {
  return authGet('/admin/lessons/occurrences', token)
}

export function getLessonsSummary(token) {
  return authGet('/admin/lessons/summary', token)
}

// Живой урок: загрузка одного урока и управление жизненным циклом (учитель/админ).
// Бэкенд скоупит /admin/lessons/{id} под личность токена.
export function getLessonById(token, id) {
  return authGet(`/admin/lessons/${id}`, token)
}

export function startLiveLesson(token, id) {
  return authPut(`/admin/lessons/${id}/start`, token)
}

// Учитель/админ вписывает или меняет ссылку на видеозвонок (Google Meet или
// любую другую) для этого занятия. wholeSeries=true проставляет её сразу на
// все будущие занятия той же еженедельной серии.
export function setLessonMeetingUrl(token, id, meetingUrl, wholeSeries = false) {
  return authPut(`/admin/lessons/${id}/meeting-url`, token, { meetingUrl, wholeSeries })
}

export function pauseLiveLesson(token, id, minutes) {
  return authPut(`/admin/lessons/${id}/pause?minutes=${encodeURIComponent(minutes)}`, token)
}

export function resumeLiveLesson(token, id) {
  return authPut(`/admin/lessons/${id}/resume`, token)
}

export function completeLiveLesson(token, id) {
  return authPut(`/admin/lessons/${id}/complete`, token)
}

// Живой урок — доска (Fabric). REST только для начальной гидрации; дальнейшие
// изменения летят по STOMP (см. useLessonBoard). Возвращает список объектов
// { id, objectId, type, json }, где json — непрозрачная сериализация Fabric-объекта.
export function getBoardObjects(token, id) {
  return authGet(`/admin/lessons/${id}/board/objects`, token)
}

// Живой урок — разделы (Разделы/«Маршрут урока») с прикреплёнными материалами.
// Путь начинается с /admin/, но это общий эндпоинт воркспейса — доступен и
// ученику (LESSON_JOIN), и учителю (LESSON_CONDUCT); скрытые от ученика
// материалы и служебный раздел «Дополнительно» бэкенд уже фильтрует сам.
export function getLessonSections(token, lessonId) {
  return authGet(`/admin/lessons/${lessonId}/sections`, token)
}

export function getLessonMessages(token, lessonId) {
  return authGet(`/admin/lessons/${lessonId}/messages`, token)
}

export function sendLessonMessage(token, lessonId, body) {
  return authPost(`/admin/lessons/${lessonId}/messages`, token, { body })
}

// URL интерактивного материала с внедрённым бридж-скриптом (сохранение/восстановление
// ответов + живой follow-me), см. LessonMaterialProgressController на бэкенде.
// GET идёт по iframe-навигации (не fetch), поэтому токен передаётся в query,
// а не в заголовке — тот же приём, что и в web-admin (buildProgressRenderUrl).
// forceReload добавляет nonce, чтобы iframe гарантированно перезагрузился
// (нужно студенту, догоняющему учителя через follow=1).
export function lessonMaterialRenderUrl(lessonId, materialId, token, { mode = 'live', follow = false, forceReload = false, studentId } = {}) {
  const params = new URLSearchParams({ mode, access_token: token || '' })
  if (follow) params.set('follow', '1')
  if (studentId != null) params.set('studentId', String(studentId))
  if (forceReload) params.set('_r', String(Date.now()))
  return `${BASE}/student/lessons/${lessonId}/materials/${materialId}/render?${params.toString()}`
}

// «Настройки учеников» доски: начальная загрузка. Живые переключения приходят по
// STOMP-топику board-settings (см. useLessonBoard).
export function getBoardSettings(token, id) {
  return authGet(`/admin/lessons/${id}/board/settings`, token)
}

// Учитель меняет ограничения доски (частичный патч, напр. { drawingDisabled: true });
// сервер сохраняет и ретранслирует настройки всем участникам по STOMP.
export function updateBoardSettings(token, id, patch) {
  return authPut(`/admin/lessons/${id}/board/settings`, token, patch)
}

// Начисляет награду за завершённый урок практики: xp → монеты/XP + стрик на
// бэкенде (тот же эндпоинт, что мобилка зовёт на завершении урока). Возвращает
// свежий баланс. Best-effort — осечка не должна ломать финальный экран урока.
export async function completeLessonModule(token, xp) {
  const res = await fetch(`${BASE}/mobile/lesson-modules/complete?xp=${encodeURIComponent(xp)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`complete failed: ${res.status}`)
  return res.json().catch(() => null)
}

// Per-lesson прогресс модуля «Обучения» (нативные уроки). Бэкенд помнит, какие
// уроки модуля пройдены — синхрон между устройствами/мобилкой (раньше жило
// только в localStorage). Отметка идемпотентна; xp начисляет монеты/стрик как
// completeLessonModule.
export async function getLessonProgress(token, moduleId) {
  const res = await fetch(`${BASE}/mobile/lesson-modules/${encodeURIComponent(moduleId)}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`progress failed: ${res.status}`)
  return res.json() // { done: [<code>], total }
}

export async function completeLesson(token, moduleId, code, xp = 0) {
  const res = await fetch(
    `${BASE}/mobile/lesson-modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(code)}/complete?xp=${encodeURIComponent(xp)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`lesson complete failed: ${res.status}`)
  return res.json().catch(() => null) // { done: [<code>], total, balance? }
}

// Аудиокниги (GET /mobile/audio-lessons) — каталог «Книжек» из dev-admin.
// Отдаёт [{id,title,author,description,level,topic,genre,year,coverImageUrl,
// durationLabel,audioUrl,tracks,...}] с настоящими обложками (coverImageUrl).
export function getAudiobooks(token) {
  return cachedAuthGet('/mobile/audio-lessons', token)
}

// Баланс: монеты и стрик (для HUD). SWR-кэш: сайдбар перемонтируется на каждом
// переходе между экранами (key={screen} в App.jsx), кэш убирает и повторный
// запрос в блокирующем пути, и «мигание» нулей; свежее значение — через onFresh.
export function getBalance(token, onFresh) {
  return cachedAuthGet('/mobile/balance/info', token, onFresh)
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

// Шаг 1 (регистрация): отправка кода на телефон ИЛИ email. Возвращает режим
// 'register'. Если идентификатор уже занят — НЕ уводим молча в вход, а
// помечаем ошибку кодом USER_EXISTS, и UI просит пользователя войти или взять
// другой телефон/email (см. handlePhoneSubmit).
export async function sendOtp(identifier, name) {
  try {
    await post('/registration/initiate', { name: name || 'Гость', ...identifierBody(identifier) })
    return 'register'
  } catch (e) {
    if ((e.message || '').toLowerCase().includes('exist')) {
      e.code = 'USER_EXISTS'
    }
    throw e
  }
}

// Вход: запрашиваем код сразу, без /registration/initiate — иначе незнакомый
// телефон/email молча зарегистрировался бы «Гостем». Незарегистрированный
// идентификатор здесь даёт 400 — помечаем кодом USER_NOT_FOUND, чтобы UI
// показал «Пользователь не существует» вместо сырого текста бэкенда.
export async function requestLoginOtp(identifier) {
  try {
    await post('/auth/otp/request', identifierBody(identifier))
    return 'login'
  } catch (e) {
    const msg = (e.message || '').toLowerCase()
    if (msg.includes('not found') || msg.includes('no account')) {
      e.code = 'USER_NOT_FOUND'
    }
    throw e
  }
}

// Шаг 2: проверка кода. В режиме register создаёт пользователя (без токена),
// в режиме login — возвращает LoginResponse с accessToken.
export async function verifyOtp(identifier, code, name, mode) {
  const body = identifierBody(identifier)
  if (mode === 'login') {
    return post('/auth/otp/verify', { ...body, otp: code })
  }
  return post('/registration/verify', { name: name || 'Гость', ...body, otp: code })
}

// Вход через Google: id_token из Google Identity Services → LoginResponse
// с accessToken. Бэкенд сам создаёт пользователя при первом входе.
export function loginWithGoogle(idToken) {
  return post('/auth/google', { idToken })
}

// Вход по OTP → accessToken. Используется после регистрации, чтобы получить JWT.
// В dev-окружении код всегда '0000' (запрос генерирует свежий код).
export async function loginWithOtp(identifier, otp = '0000') {
  const body = identifierBody(identifier)
  await post('/auth/otp/request', body)
  const res = await post('/auth/otp/verify', { ...body, otp })
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
const DEMO_TOKEN_KEY = 'jts_demo_token'

let _demoTokenPromise = null

// Жив ли JWT (exp с запасом marginSec); битый токен считаем мёртвым.
function jwtAlive(token, marginSec = 60) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + marginSec * 1000
  } catch {
    return false
  }
}

export function getPracticeToken(token) {
  if (token) return Promise.resolve(token)
  // Демо-токен переживает перезагрузку в localStorage: без этого каждый визит
  // гостя в Практику начинался с полноценного login-запроса.
  if (!_demoTokenPromise && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(DEMO_TOKEN_KEY)
      if (saved && jwtAlive(saved)) _demoTokenPromise = Promise.resolve(saved)
    } catch {
      /* localStorage недоступен — просто логинимся */
    }
  }
  if (!_demoTokenPromise) {
    _demoTokenPromise = loginWithPassword(DEMO_PHONE, DEMO_PASSWORD)
      .then((tok) => {
        if (tok) {
          try {
            window.localStorage.setItem(DEMO_TOKEN_KEY, tok)
          } catch {
            /* квота/приватный режим — работаем без кэша */
          }
        }
        return tok
      })
      .catch((e) => {
        _demoTokenPromise = null // дать шанс на повторную попытку
        throw e
      })
  }
  return _demoTokenPromise
}

// Мемы и рилсы (GET /mobile/media-clips) → [{title,mediaUrl,thumbnailUrl,kind,mediaType,durationLabel,views,level}]
export function getMediaClips(token, onFresh) {
  return cachedAuthGet('/mobile/media-clips', token, onFresh)
}

// Ситуации (GET /mobile/situativki?level=) → [{title,coverUrl,videoUrl,level,category,completed}]
export function getSituativki(token, level, onFresh) {
  const q = level ? `?level=${encodeURIComponent(level)}` : ''
  return cachedAuthGet('/mobile/situativki' + q, token, onFresh)
}

// Словарь пользователя (GET /mobile/saved-words) → [{word,translation,learned,correctCount,language}]
// SWR-кэш: слова добавляются из читалки — свежий список приходит через onFresh.
export function getSavedWords(token, onFresh) {
  return cachedAuthGet('/mobile/saved-words', token, onFresh)
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

// Удаление сохранённого слова (DELETE /mobile/saved-words/{id}, Bearer).
export async function deleteSavedWord(token, id) {
  let res
  try {
    res = await fetch(`${BASE}/mobile/saved-words/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) throw new Error(`Не удалось удалить слово (${res.status})`)
  return true
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
