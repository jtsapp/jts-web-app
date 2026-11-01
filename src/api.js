// Клиент API регистрации/входа.
// По умолчанию бьём в dev-бэкенд — тот же, что читает dev-админка
// (https://dev-admin.justtostudy.kz → https://dev-server.justtostudy.kz),
// поэтому новые регистрации сразу видны в разделе «Пользователи» админки.
import { payloadOf } from './lib/jwt.js'
import { reportUnauthorized } from './lib/session.js'
import { rememberDemoDeadline } from './lib/demoAccess.js'
import { CATALOG_KEY_PREFIX, CATALOG_STORE_MAX_CHARS } from './lib/catalogCacheKeys.js'
import { clearAttribution, readAttribution, registrationFields, safeStorage } from './lib/attribution.js'
import { API_BASE } from './lib/apiBase.js'
import { attemptKey, deletePendingTakes, savePendingTakes } from './ielts/speaking/pendingTakes.js'

const BASE = API_BASE

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
  const trimmed = String(identifier).trim()
  return isEmailIdentifier(trimmed)
    ? { email: trimmed.toLowerCase() }
    : { phone: normalizePhone(trimmed) }
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

// CEFR-тест. Проверка ответов и оценка уровня живут на сервере: банк вопросов
// публичный, поэтому вместе с вопросами уезжал и ключ, а посчитанный на клиенте
// уровень был не измерением, а утверждением клиента. Теперь сервер выдаёт по
// одному вопросу за раз и сам считает θ.
//
// Токен необязателен: сайт тестирует посетителя до регистрации. Если он есть —
// прогон привязывается к аккаунту и уровень сохраняется в профиль.
export function startAdaptiveSession(token) {
  return authPost('/adaptive-test/sessions', token, {})
}

export function submitAdaptiveAnswer({ sessionToken, questionId, optionId, token }) {
  return authPost(`/adaptive-test/sessions/${encodeURIComponent(sessionToken)}/answers`, token, {
    questionId,
    optionId,
  })
}

// Ролевые сценарии для голосового тьютора — публичный эндпоинт (INK AI tutor,
// раздел «Сценарии» в админке). optional level фильтрует по CEFR; без него —
// все активные. Формат: [{id,slug,emoji,level,titleI18n:{en,ru,kz},setup,orderIndex,isActive}]
export function getInkScenarios(level) {
  const q = level ? `?level=${encodeURIComponent(level)}` : ''
  return get('/ink/practice' + q)
}

async function authGet(path, token, options = {}) {
  let res
  try {
    res = await fetch(BASE + path, { ...options, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    // 401 у запроса с токеном — возможно, сессия кончилась (см. reportUnauthorized
    // в lib/session.js: он сам отличит срок от прав и от гостевого токена).
    if (res.status === 401) reportUnauthorized(token)
    // Код нужен вызывающему: 404 у профильных полей означает «не заполнено»,
    // а не поломку — отличать это от сетевой осечки приходится по нему.
    const err = new Error(`Ошибка сервера (${res.status})`)
    err.status = res.status
    // 403 у GET — это либо замок доступа, либо исчерпанная демо-квота (GET /mobile/sat/weekly): тело различает их
    if (res.status === 403) err.serverMessage = await rejectionText(res, err)
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

// Баланс токенов, действующие призы и собственные заявки ученика. Источник
// баланса — серверный журнал начислений, поэтому экран не пересчитывает его
// из локального прогресса.
export function getMyTokens(token) {
  return authGet('/cabinet/my-tokens', token)
}

// Разделы кабинета, открытые ученику по тарифу и формату (ТЗ кабинетов, 14е): { known, tariff, format, allowed }.
// Готовые права не кэшируем: тариф или настройки координатора могут измениться без смены токена.
// Одновременные запросы меню и экрана совмещает studentSectionStore.
export function getMySections(token, options = {}) {
  if (!token) return Promise.resolve(null)
  return authGet('/cabinet/my-sections', token, options)
    .then((d) => {
      if (!d || typeof d.known !== 'boolean' || !Array.isArray(d.allowed) || !d.allowed.every((key) => typeof key === 'string')) {
        throw new Error('Invalid section access')
      }
      // Новый тариф или решение координатора должны перепроверить и отдельный оплаченный доступ к экзаменам.
      _ieltsMe.delete(token)
      _satMe.delete(token)
      return d
    })
}

export function getCabinetFeedback(token) {
  return authGet('/cabinet/feedback/mine', token)
}

export function getPublishedGrammar(token, level) {
  const query = level ? `?level=${encodeURIComponent(level)}` : ''
  return authGet(`/mobile/grammar${query}`, token)
}

export function getCabinetFeedbackTargets(token) {
  return authGet('/cabinet/feedback/targets', token)
}

export function submitCabinetFeedback(token, body) {
  return authPost('/cabinet/feedback', token, body)
}

export function getCabinetFeedbackMessages(token, id) {
  return authGet(`/cabinet/feedback/${encodeURIComponent(id)}/messages`, token)
}

export function getCabinetFeedbackHistory(token, id) {
  return authGet(`/cabinet/feedback/${encodeURIComponent(id)}/history`, token)
}

export function replyCabinetFeedback(token, id, body) {
  return authPost(`/cabinet/feedback/${encodeURIComponent(id)}/messages`, token, body)
}

/** Сервер сам сверяет ответы внутреннего финального теста с версией экзамена и пишет результат в рейтинг. */
export function submitRankingFinalTest(token, body) {
  return authPost('/cabinet/ranking/final-test', token, body)
}

export async function uploadCabinetFeedbackFile(token, file) {
  const form = new FormData()
  form.append('file', file)
  let res
  try {
    res = await fetch(`${BASE}/cabinet/feedback/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
  } catch {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    if (res.status === 401) reportUnauthorized(token)
    const error = new Error(`Ошибка сервера (${res.status})`)
    error.status = res.status
    error.serverMessage = await rejectionText(res, error)
    throw error
  }
  return res.json()
}

// Запрос приза списывает стоимость атомарно на сервере. requestKey остаётся
// тем же при повторах после сетевой ошибки, поэтому двойной клик не создаёт
// вторую заявку и не списывает токены повторно.
export function claimPrize(token, prizeId, requestKey) {
  return authPost(`/cabinet/prizes/${encodeURIComponent(prizeId)}/claim`, token, { requestKey })
}

async function authPut(path, token, body, { keepalive = false } = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
      // keepalive — для записи, уходящей на закрытии вкладки: обычный fetch
      // браузер обрывает вместе со страницей, и последний ответ ученика
      // терялся ровно в тот момент, когда он закончил работу и вышел.
      ...(keepalive ? { keepalive: true } : {}),
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    // 401 у запроса с токеном — возможно, сессия кончилась (см. reportUnauthorized
    // в lib/session.js: он сам отличит срок от прав и от гостевого токена).
    if (res.status === 401) reportUnauthorized(token)
    // Код нужен вызывающему: 410 у домашней работы значит «преподаватель её
    // отменил», и это объяснение ученику, а не общая осечка сети.
    const err = new Error(`request failed: ${res.status}`)
    err.status = res.status
    // Текст отказа — отдельным полем, а не в message: вызывающие, что
    // показывают свою подпись, его не заметят, а сдача домашки (HomeworkPage)
    // покажет ученику слова сервера вместо общего «не удалось».
    err.serverMessage = await rejectionText(res, err)
    throw err
  }
  return res.json().catch(() => null)
}

/**
 * Первая строка отказа из тела ответа или null.
 *
 * GlobalExceptionHandler бэкенда отдаёт GeneralResponse `{ messages: [...] }`;
 * `message` — запасной вид того же. `error` не берём: у Spring это фраза кода
 * («Bad Request»), ученику она ничего не скажет.
 */
async function rejectionText(res, err) {
  let body = null
  try {
    body = await res.json()
  } catch {
    // Тела нет или оно не JSON (прокси, обрыв) — отказ остаётся с одним кодом.
  }
  // Исчерпанная демо-квота (ContentQuotaService, SAT-SYNC-PLAN E2): 403 с code CONTENT_QUOTA_EXCEEDED, типом контента и
  // счётчиками. Закрытый доступ — тоже 403, но без code: экраны различают их по нему (lib/examQuota.js).
  if (err && body && typeof body === 'object' && body.code) {
    err.code = body.code
    err.contentType = body.contentType ?? null
    err.limit = body.limit ?? null
    err.used = body.used ?? null
    err.demoExpired = !!body.demoExpired
  }
  const text = (Array.isArray(body?.messages) ? body.messages[0] : null) ?? body?.message
  return typeof text === 'string' && text.trim() ? text.trim() : null
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
  if (!res.ok) {
    // 401 у запроса с токеном — возможно, сессия кончилась (см. reportUnauthorized
    // в lib/session.js: он сам отличит срок от прав и от гостевого токена).
    if (res.status === 401) reportUnauthorized(token)
    // Код нужен вызывающему: 410 у домашней работы значит «преподаватель её
    // отменил», и это объяснение ученику, а не общая осечка сети.
    const err = new Error(`request failed: ${res.status}`)
    err.status = res.status
    // текст отказа сервера — отдельным полем, как у authPut: message вызывающие местами сравнивают
    err.serverMessage = await rejectionText(res, err)
    throw err
  }
  return res.json().catch(() => null)
}

async function authPatch(path, token, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    // 401 у запроса с токеном — возможно, сессия кончилась (см. reportUnauthorized
    // в lib/session.js: он сам отличит срок от прав и от гостевого токена).
    if (res.status === 401) reportUnauthorized(token)
    // Код нужен вызывающему: 410 у домашней работы значит «преподаватель её
    // отменил», и это объяснение ученику, а не общая осечка сети.
    const err = new Error(`request failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => null)
}

async function authDelete(path, token) {
  let res
  try {
    res = await fetch(BASE + path, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    // 401 у запроса с токеном — возможно, сессия кончилась (см. reportUnauthorized
    // в lib/session.js: он сам отличит срок от прав и от гостевого токена).
    if (res.status === 401) reportUnauthorized(token)
    // Код нужен вызывающему: 410 у домашней работы значит «преподаватель её
    // отменил», и это объяснение ученику, а не общая осечка сети.
    const err = new Error(`request failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => null)
}

// ─── Домашняя работа ─────────────────────────────────────────────────────────
// Файл ученика попадает в задание в два шага, как и у преподавателя в админке:
// сначала /media/upload кладёт его в хранилище и отдаёт ссылку, потом ссылка
// прикрепляется к домашней работе. Отдельной «загрузки в ДЗ» на бэкенде нет.

export function getMyHomework(token) {
  return authGet('/admin/homework/my', token)
}

export function getHomeworkById(token, id) {
  return authGet(`/admin/homework/${id}`, token)
}

// Поле формы называется `material` — так его читает MediaController.
export async function uploadMedia(token, file) {
  const form = new FormData()
  form.append('material', file)
  let res
  try {
    res = await fetch(BASE + '/media/upload', {
      method: 'POST',
      // Content-Type для multipart ставит сам браузер — вместе с boundary.
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) throw new Error(`Не удалось загрузить файл (${res.status})`)
  return res.json()
}

export function attachHomeworkAnswer(token, id, fileName, url) {
  return authPost(`/admin/homework/${id}/submission-materials`, token, { fileName, url })
}

export function removeHomeworkAnswer(token, id, materialId) {
  return authDelete(`/admin/homework/${id}/submission-materials/${materialId}`, token)
}

export function submitHomework(token, id) {
  return authPut(`/admin/homework/${id}/submit`, token)
}

// Ответ на задание, взятое преподавателем с живого урока. Правильность считает
// клиент — тем же gradeQuestion, что и на уроке: сервер вопрос не разбирает, а
// преподавателю нужно видеть не только ответ, но и сошёлся ли он с ключом.
export async function saveHomeworkAnswer(id, exerciseId, token, answer, correct) {
  return authPut(`/admin/homework/${id}/exercises/${exerciseId}/answer`, token, { answer, correct })
}

// Задания с живых уроков: преподаватель назначает материал через админку
// («задать как ДЗ», MaterialAssignment), ученик видит назначенное здесь же,
// в «Домашней работе». Ничего нового на бэкенде — это тот же студенческий
// фасад, которым пользуется web-admin (/student/**).

// Ответ на выданный материал файлом. Для карточки урока это единственный способ
// её закрыть: проверяемых заданий в теории нет, сессии она не заводит. Файл к
// этому моменту уже лежит в хранилище — его кладёт uploadMedia, ровно как у
// ответа на обычную домашку.
export function attachMaterialAnswer(token, id, fileName, url) {
  return authPost(`/student/assignments/${id}/files`, token, { fileName, url })
}

export function removeMaterialAnswer(token, id, fileId) {
  return authDelete(`/student/assignments/${id}/files/${fileId}`, token)
}

export function getMyMaterialAssignments(token) {
  return authGet('/student/assignments', token)
}

// Интерактив с проверкой открывается только при живой сессии — без неё
// ответы из открытой вкладки не дойдут до преподавателя. Повторный вызов
// возвращает уже существующую сессию, так что дёргать можно при каждом открытии.
export function startMaterialAssignment(token, assignmentId) {
  return authPost(`/student/assignments/${assignmentId}/start`, token)
}

// «Я сделал» по выданной работе. Что считается сделанным и можно ли сдавать —
// решает сервер (проверенные задания или приложенный файл), здесь только кнопка.
export function submitMaterialAssignment(token, assignmentId) {
  return authPost(`/student/assignments/${assignmentId}/submit`, token)
}

// Рендер интерактивного материала открывается навигацией браузера (новая
// вкладка), а не fetch'ем — токен уезжает в query: JwtAuthenticationFilter
// принимает ?access_token= ровно для этого пути (тот же приём, что в
// lessonMaterialRenderUrl).
export function materialAssignmentRenderUrl(materialId, assignmentId, token, sessionId) {
  const params = new URLSearchParams({ assignmentId: String(assignmentId), mode: 'live', access_token: token || '' })
  if (sessionId != null) params.set('sessionId', String(sessionId))
  return `${BASE}/student/materials/${materialId}/render?${params.toString()}`
}

// Проверка домашних работ преподавателем. Бэкенд сам оставляет в выдаче только
// его учеников (isVisibleToCurrentUser), поэтому фильтры здесь не нужны.
export function getHomeworkBoard(token) {
  return authGet('/admin/homework', token)
}

export function saveHomeworkFeedback(token, id, comment) {
  return authPut(`/admin/homework/${id}/feedback`, token, { comment })
}

export function gradeHomework(token, id, grade, comment) {
  return authPut(`/admin/homework/${id}/grade`, token, { grade, comment })
}

export function returnHomeworkForRevision(token, id, comment) {
  return authPut(`/admin/homework/${id}/return-for-revision`, token, { comment })
}

// ─── Кэш каталогов Практики (stale-while-revalidate) ─────────────────────────
// Админ-каталоги меняются редко (только правками в dev-admin), поэтому повторные
// открытия страницы отдаются мгновенно из localStorage, а сеть обновляет копию в
// фоне — свежие данные подхватятся при следующем открытии. Первый-в-жизни запрос
// ждёт сеть, как раньше.

// Поколение кэша. Поднимается при несовместимой смене формы ответа — и при
// смене смысла ключа: ключи прошлого поколения не читаются и выметаются
// (sweepStaleCatalogCache ниже), поэтому «несовместимо» здесь значит
// «читать старые записи больше нельзя», независимо от причины.
//
// v1 → v2: в v1 ученик, чей токен не разобрался, попадал в общий бакет 'anon'.
const CATALOG_CACHE_VER = 'v2'
const CATALOG_LIVE_PREFIX = `${CATALOG_KEY_PREFIX}${CATALOG_CACHE_VER}:`

// RAM-кэш на сессию вкладки: тяжёлые ответы (scopes словаря) часто не
// помещаются в localStorage — без Map повторный заход в том же табе снова
// ждал бы сеть. localStorage остаётся для переживания перезагрузки.
const memoryCatalogCache = new Map()
// идущий фоновый запрос по ключу кэша (см. cachedAuthGet)
const cachedInflight = new Map()

// Пользовательская часть ключа: sub из JWT (стабилен между сессиями). Ключ
// разделяет пользователей — у ситуативок есть per-user флаг completed — и
// окружения (BASE).
//
// Payload разбирает payloadOf из lib/jwt.js, а не собственный atob: JWT кодирует
// payload в base64url, где вместо '+' и '/' стоят '-' и '_', а их в алфавите
// base64 нет — atob на таком payload бросает. На payload из одних латинских
// полей эти символы почти не встречаются, но как только в нём есть кириллическое
// имя — примерно каждый десятый токен, а имена у нас кириллические.
//
// null — «не опознали», и это НЕ ещё одна личность: раньше здесь стояло 'anon',
// то есть ключ, общий на всех безымянных. На общем компьютере (класс, ресепшн)
// следующий вошедший видел из localStorage баланс, стрик, сохранённые слова и
// отметки «пройдено» предыдущего ученика — мгновенно, до всякой сети. Починить
// разбор токена мало: в бакет заезжает кто угодно с пустым токеном, а такой
// вызов в приложении есть — getPracticeToken отдаёт null, когда демо-ручка
// ответила 503 (передеплой) или 502, и PracticePage несёт этот null дальше в
// getSavedWords, getSituativki и соседей. Поэтому безымянному бакету не из чего
// взяться: нет личности — нет ключа — нет кэша.
function tokenIdentity(token) {
  const payload = payloadOf(token)
  return payload?.sub || payload?.userId || payload?.phone || null
}

// null — «этот ответ кэшировать не за кем», см. tokenIdentity.
function catalogCacheKey(path, token) {
  const identity = tokenIdentity(token)
  return identity == null ? null : `${CATALOG_LIVE_PREFIX}${BASE}:${identity}:${path}`
}

// Уборка прошлых поколений кэша. Версия в ключе разводит поколения, но сама по
// себе ничего не удаляет: записи прошлого поколения просто остаются лежать —
// читать их уже некому, а место в общей квоте localStorage (5 МБ на домен) они
// занимают навсегда и вытесняют то, что терять нельзя: черновики ответов
// домашки (hw-answers:*), прогресс разделов Практики (practiceKeys.js), снимок
// сессии. Поэтому каждое поколение при старте выметает предыдущие.
//
// Эта же уборка закрывает копии, отложенные в v1 под общим 'anon'. Своим ключом
// их не достать — у безымянного вызова ключа теперь нет вовсе, — поэтому идём
// по префиксу. Трогаем ровно `jts_catalog_*`: всё остальное в хранилище чужое
// (токены сессии, прогресс, настройки профиля), и ни один ключ приложения с
// этого префикса больше не начинается.
//
// Не «одноразовая миграция с флагом»: пока в соседней вкладке открыт прошлый
// бандл, он продолжает писать записи своего поколения, и собрать их получится
// только следующей загрузкой. Стоимость — перебор ИМЁН ключей (значения не
// читаем) один раз на загрузку вкладки.
function sweepStaleCatalogCache() {
  if (typeof window === 'undefined') return // SSR — хранилища нет
  try {
    const stale = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key?.startsWith(CATALOG_KEY_PREFIX)) continue
      // Прошлое поколение — и живые записи больше порога: их клали до того, как
      // большие ответы перестали попадать в localStorage, и они так и занимали
      // квоту (см. CATALOG_STORE_MAX_CHARS).
      if (!key.startsWith(CATALOG_LIVE_PREFIX)) stale.push(key)
      else if ((window.localStorage.getItem(key) || '').length > CATALOG_STORE_MAX_CHARS) stale.push(key)
    }
    // Удаляем вторым проходом: removeItem сдвигает индексы, и удаление прямо в
    // цикле по key(i) пропускало бы каждый второй ключ.
    for (const key of stale) window.localStorage.removeItem(key)
  } catch {
    /* приватный режим Safari / хранилище недоступно — уборки просто не будет */
  }
}

// На импорте, а не лениво при первом обращении к кэшу: записи прошлого
// поколения должны исчезнуть до того, как их успеет попросить первый экран, и
// у ученика, который в этот заход до Практики не дошёл, — тоже (квота общая).
// Тот же приём, что у миграции языкового ключа в i18n/LanguageContext.jsx.
sweepStaleCatalogCache()

// onFresh (опционально) вызывается со свежими данными, когда фоновое обновление
// закончилось ПОСЛЕ того, как вызвавший уже получил кэшированный ответ. Это
// позволяет кэшировать и изменяемые данные (баланс, прогресс, словарь):
// экран мгновенно рисует кэш и тихо перерисовывается, когда приходит сеть.
async function cachedAuthGet(path, token, onFresh) {
  if (typeof window === 'undefined') return authGet(path, token) // SSR — без кэша
  const key = catalogCacheKey(path, token)
  // Личность не опознана (пустой токен, мусор из localStorage, payload без
  // полей) — мимо кэша в обе стороны: не читаем, чтобы не отдать гостю чужое, и
  // не пишем, чтобы отдавать было нечего. Сеть на такой вызов ответит 401, и
  // это правильный ответ — в отличие от копии, оставшейся от прошлого ученика.
  if (key === null) return authGet(path, token)
  let cached = memoryCatalogCache.has(key) ? memoryCatalogCache.get(key) : null
  if (cached === null) {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) cached = JSON.parse(raw)
    } catch {
      /* битый кэш → обычный сетевой запрос */
    }
  }
  // Один фоновый запрос на ключ за раз: сайдбар и главный экран IELTS спрашивают баланс в одном кадре, и каждый вызов
  // запускал свой — два одинаковых ответа на каждый переход. Окна «свежести» нет намеренно: отзыв выдачи (403) должен
  // замечаться на первом же следующем заходе (catalogCache.test).
  const refresh = () => {
    if (cachedInflight.has(key)) return cachedInflight.get(key)
    const p = authGet(path, token)
      .then((data) => {
        memoryCatalogCache.set(key, data)
        try {
          const raw = JSON.stringify(data)
          // Большой ответ — только в памяти вкладки: в localStorage он вытеснял бы
          // то, что терять нельзя. Прежнюю копию убираем, иначе она осталась бы
          // лежать устаревшей и занимать место.
          if (raw.length <= CATALOG_STORE_MAX_CHARS) window.localStorage.setItem(key, raw)
          else window.localStorage.removeItem(key)
        } catch {
          /* квота localStorage исчерпана — RAM-кэш всё равно держит ответ */
        }
        return data
      })
      .finally(() => cachedInflight.delete(key))
    cachedInflight.set(key, p)
    return p
  }
  if (cached !== null) {
    refresh()
      .then((data) => onFresh?.(data))
      .catch((err) => {
        // Сбой фонового обновления в UI не всплывает — кроме одного случая.
        // 403 это не осечка сети, а «этому ученику больше нельзя»: менеджер
        // отозвал выдачу. Раньше отказ глотался вместе со всем остальным, и
        // сохранённый ответ оставался лежать — сервер мог отказывать сколько
        // угодно раз подряд, а браузер продолжал отдавать то, что успел
        // запомнить до отзыва. Забываем ответ, за который сервер сказал «нет»;
        // обрыв связи и пятисотки запись по-прежнему не трогают, иначе ученик
        // в метро остался бы без каталога.
        if (err?.status === 403) dropCachedAuthGet(path, token)
      })
    return cached
  }
  return refresh()
}

function dropCachedAuthGet(path, token) {
  if (typeof window === 'undefined') return
  const key = catalogCacheKey(path, token)
  if (key === null) return // безымянному вызову кэш не заводился — удалять нечего
  memoryCatalogCache.delete(key)
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* кэш мог быть недоступен */
  }
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

// Эффективный лимит "N из M" для области/элемента (см. ContentQuotaService.
// getEffectiveLimit на бэкенде: точечная квота студента → тариф → демо-дефолт
// → без лимита). contentId=0 — для областей без адресных элементов (IELTS,
// Практика); для LESSON_MODULE передаём реальный id модуля. null = лимита нет.
// Используется, чтобы жёстко скрыть/заблокировать контент СВЕРХ лимита ДО
// попытки его открыть, а не только отказывать при завершении.
export async function getContentQuota(token, contentType, contentId = 0) {
  if (!token) return null
  try {
    const res = await authGet(`/mobile/content-quota?contentType=${encodeURIComponent(contentType)}&contentId=${contentId}`, token)
    return res?.limit ?? null
  } catch {
    return null
  }
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

// Один урок каталога: fileUrl (сырой L*.html) + type/title.
export function getCourseCatalogLesson(id, token) {
  return authGet(`/mobile/course-catalog/lessons/${id}`, token)
}

// Урок теста на определение уровня по адресу его файла: в дерево ученика тест не
// входит, его дают только преподаватель — на занятии или на дом. 404 — не дан.
export function getLevelTestByFile(fileUrl, token) {
  return authGet(`/mobile/course-catalog/lessons/by-file?url=${encodeURIComponent(fileUrl)}`, token)
}

// Пройденные уроки каталога — одним списком на весь каталог, а не по уроку:
// раздел «Самостоятельно» показывает всё дерево сразу.
export function getCatalogProgress(token) {
  return authGet('/mobile/course-catalog/progress', token)
}

// Отметка ручная: у двух третей уроков каталога нет структуры с шагами, они
// открываются документом, и события «урок завершён» там не бывает. Ставится
// идемпотентно, снимается тем же адресом через DELETE.
export function completeCatalogLesson(token, id) {
  return authPost(`/mobile/course-catalog/lessons/${encodeURIComponent(id)}/complete`, token)
}

export function uncompleteCatalogLesson(token, id) {
  return authDelete(`/mobile/course-catalog/lessons/${encodeURIComponent(id)}/complete`, token)
}

// Прогресс по своему уровню — освоенные материалы, а не точность в практике.
// Считает сервер: слагаемые лежат в трёх местах (отметки в каталоге,
// состоявшиеся занятия, объём самого курса), и собрать их в браузере значило бы
// выкачать туда весь каталог ради одного числа.
export function getLevelProgress(token) {
  return authGet('/mobile/level-progress', token)
}

// Профиль General English — анкета «Главной», цель, срок и формат (бэкенд /mobile/ge, спека 2026-10-12). Ответ без
// булевого onboarded — не профиль (старый бэкенд без ручки, заглушка e2e, отдающая {} на всё): тогда «Главная» прежняя.
export function geProfileShape(raw) {
  return raw && typeof raw === 'object' && typeof raw.onboarded === 'boolean' ? raw : null
}

/** null — ручки нет или она не ответила: экран остаётся прежним, а не рушится. */
export async function getGeProfile(token) {
  if (!token) return null
  try {
    return geProfileShape(await authGet('/mobile/ge/profile', token))
  } catch {
    return null
  }
}

export async function saveGeProfile(token, body) {
  return geProfileShape(await authPut('/mobile/ge/profile', token, body))
}

export async function setGeRoute(token, route) {
  return geProfileShape(await authPut('/mobile/ge/profile/route', token, { route }))
}

export async function importLegacyGoal(token, goal) {
  return geProfileShape(await authPost('/mobile/ge/profile/legacy-goal', token, goal))
}

// План по дням общего курса (бэкенд /mobile/ge/plan, спека 2026-10-13). Ответ без строкового state и массива задач — не
// план (старый бэкенд без ручки, заглушка e2e с {} на всё): тогда на «Главной» остаётся прежняя «Что сделать сегодня».
export function gePlanShape(raw) {
  return raw && typeof raw === 'object' && typeof raw.state === 'string' && Array.isArray(raw.tasks) ? raw : null
}

/** null — ручки нет или она не ответила: экраны остаются прежними, а не рушатся. */
export async function getGePlan(token, { from, to } = {}) {
  if (!token) return null
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const qs = q.toString()
  try {
    return gePlanShape(await authGet(`/mobile/ge/plan${qs ? `?${qs}` : ''}`, token))
  } catch {
    return null
  }
}

/** Перенос своей задачи плана (урок курса, практика) на другой день: сегодня или позже, в пределах плана. */
export function moveGeTask(token, id, date) {
  return authPut(`/mobile/ge/plan/tasks/${encodeURIComponent(id)}/date`, token, { date })
}

/** Ученик отмечает своё задание преподавателя («Своё задание», kind custom) выполненным или снимает отметку. */
export function markGeTaskDone(token, id, done) {
  return authPut(`/mobile/ge/plan/tasks/${encodeURIComponent(id)}/done`, token, { done: !!done })
}

// Работа ученика в самостоятельном уроке: ответы, проверенные карточки и
// последний открытый шаг. Отдельной ручкой, а не полем дерева: дерево читается
// на открытие раздела целиком, и таскать в нём работу по всем урокам ради
// одного открываемого — мегабайты впустую. Формат строки принадлежит клиенту
// (см. workspace/stepProgress.js), сервер в неё не смотрит.
export function getCatalogLessonAnswers(token, id) {
  return authGet(`/mobile/course-catalog/lessons/${encodeURIComponent(id)}/answers`, token)
}

// `keepalive` — для записи на закрытии вкладки: обычный fetch браузер обрывает
// вместе со страницей, и последний ответ терялся ровно тогда, когда ученик
// закончил работу и вышел.
export function saveCatalogLessonAnswers(token, id, progressJson, options) {
  return authPut(
    `/mobile/course-catalog/lessons/${encodeURIComponent(id)}/answers`,
    token,
    { progressJson },
    options,
  )
}

// Структура урока, разобранная один раз при регистрации уровня и сохранённая на
// бэкенде. content === null — структуры нет, урок открывается как файл (fileUrl).
//
// Единственная каталожная ручка, на которой сервер проверяет ВЫДАЧУ курса, —
// поэтому она намеренно без SWR-кэша, в отличие от всех соседей по файлу. Пока
// содержимое урока лежало в localStorage, отзыв выдачи оставался невидимым:
// менеджер её отзывал, сервер отвечал 403, фоновое обновление отказ глотало — и
// ученик открывал закрытый курс с любой перезагрузки, пока не почистит кэш
// руками. Долговременный кэш этой ручке покупал немного: onFresh ей никто не
// передаёт, а content_json обычно не влезает в квоту localStorage.
// Запасной аэродром на случай обрыва связи остался, но в разобранном виде и на
// время вкладки — см. workspace/loadCatalogLesson.js.
//
// Копии, отложенные здесь прошлой версией приложения, выметает
// sweepStaleCatalogCache при старте — вместе со всем поколением v1 и у всех
// аккаунтов машины сразу. Точечная чистка «своей» записи была бы хуже: она
// снимала бы копию только с того, кто в этот заход снова открыл ровно этот урок,
// а уроки прошлого ученика на общем компьютере лежали бы дальше.
export function getCourseCatalogLessonContent(id, token) {
  return authGet(`/mobile/course-catalog/lessons/${encodeURIComponent(id)}/content`, token)
}

// Расписание вошедшего пользователя. Бэкенд скоупит /admin/lessons* под личность
// токена: ученик/учитель получают только СВОИ занятия (чужие → 400).
export function getMyLessonOccurrences(token) {
  return authGet('/admin/lessons/occurrences', token)
}

export const saveMatchingPreferences = (token, preferences) => authPut('/student/matching/preferences', token, preferences)
export const askMatchingManager = (token, preferences) => authPost('/student/matching/ask-manager', token, preferences)
export const sendMatchingRequests = (token, teacherIds) => authPost('/student/matching/requests', token, {teacherIds})
export const confirmMatchingSchedule = token => authPost('/student/matching/confirm', token, {})
export const requestTeacherChange = (token, reason, text) => authPost('/student/matching/change', token, {reason, text})

// Оспаривание отметки «не пришёл» (ТЗ «Кабинеты», раздел 11): что ещё можно оспорить (со сроком) и свои заявки.
export const getMyNoShowDisputes = (token) => authGet('/cabinet/no-show-disputes/mine', token)
export const disputeNoShow = (token, lessonId, reason) =>
  authPost(`/cabinet/no-show-disputes/mine/lessons/${lessonId}`, token, { reason })
export const getMatchingHandoffs = token => authGet('/student/matching/handoffs', token)
export const chooseMatchingHandoff = (token, id, choice) => authPost('/student/matching/handoffs/'+id+'/choice', token, {choice})

// Подбор учителя v2 (спека 2026-10-26-student-teacher-matching-design.md). Карточку читаем своим fetch: 404 бывает
// двух видов — «ученика нет в подборе» (тело с code: 'not_added', нужен абонемент) и «ручки на стенде нет» (старый
// бэкенд), и различает их только тело, а authGet тело у 404 не читает.
export async function getStudentMatching(token) {
  let res
  try {
    res = await fetch(BASE + '/student/matching', { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    return { status: 'unavailable' }
  }
  if (res.status === 401) reportUnauthorized(token)
  if (res.ok) return { status: 'ready', card: await res.json().catch(() => null) }
  if (res.status === 404) {
    const body = await res.json().catch(() => null)
    if (body?.code === 'not_added') return { status: 'not_added' }
  }
  return { status: 'unavailable' }
}
export const getMatchingGrid = (token, format) =>
  authGet('/student/matching/grid' + (format ? '?format=' + encodeURIComponent(format) : ''), token)
// age — «Кого учит» (kids | teens | adults); учителя без отметок возраста сервер не отсекает.
export const getMatchingTeachers = (token, age) =>
  authGet('/student/matching/candidates' + (age ? '?age=' + encodeURIComponent(age) : ''), token)
export const getMatchingTeacher = (token, id) => authGet(`/student/matching/teachers/${id}`, token)
// Фото отдаётся только с токеном, поэтому не <img src>, а blob — object URL держит TeacherPhoto.
export async function getMatchingTeacherPhoto(token, id) {
  try {
    const res = await fetch(`${BASE}/student/matching/teachers/${id}/photo`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? await res.blob() : null
  } catch {
    return null
  }
}
// Дополнение профиля учителя (тексты, одобренные фото результатов, наличие видео). На старом стенде ручки нет — тогда блоков просто нет.
export async function getMatchingTeacherExtras(token, id) {
  try {
    return await authGet(`/student/matching/teachers/${id}/extras`, token)
  } catch {
    return null
  }
}
export async function getMatchingTeacherResultPhoto(token, id, photoId) {
  try {
    const res = await fetch(`${BASE}/student/matching/teachers/${id}/results/${photoId}`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? await res.blob() : null
  } catch {
    return null
  }
}
export async function getMatchingTeacherVideo(token, id) {
  try {
    const res = await fetch(`${BASE}/student/matching/teachers/${id}/video`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? await res.blob() : null
  } catch {
    return null
  }
}
export const saveMatchingInterests = (token, interests) => authPut('/student/matching/interests', token, { interests })
export const saveMatchingTimezone = (token, timezone) => authPut('/student/matching/timezone', token, { timezone })
export const changeMatchingFormat = (token, format) => authPost('/student/matching/format', token, { format })
export const counterMatchingSchedule = (token, slots) => authPost('/student/matching/counter', token, { slots })
export const reconfirmMatchingSchedule = token => authPost('/student/matching/reconfirm', token, {})
export const patchMatchingWish = (token, wish) => authPatch('/student/matching/ask-manager', token, { wish })

// «Выбрать группу» (ТЗ кабинетов, 14): подбор по пожеланиям, запись, оплата или пробный урок, лист ожидания. Ручек может
// не быть на старом стенде — экран читает это как «раздел скоро появится», а не как поломку.
export async function getGroupState(token) {
  try {
    return await authGet('/enrollment/student/state', token)
  } catch (e) {
    if (e?.status === 404 || e?.status === 403) return null
    throw e
  }
}
export const suggestGroups = (token, wishes) => authPost('/enrollment/student/suggest', token, wishes)
export const enrollInGroup = (token, groupId) => authPost(`/enrollment/student/groups/${groupId}/enroll`, token, {})
// «Оплатить»: статус «Оплачено» ставит менеджер или действующий абонемент, а не это нажатие — ответ несёт `payRequested`.
export const payForGroup = (token) => authPost('/enrollment/student/pay', token, {})
export const startGroupTrial = (token) => authPost('/enrollment/student/trial', token, {})
export const cancelGroupEnrollment = (token) => authDelete('/enrollment/student/enrollment', token)
export const joinGroupWaitlist = (token, groupId) => authPost(`/enrollment/student/groups/${groupId}/waitlist`, token, {})
export const leaveGroupWaitlist = (token, groupId) => authDelete(`/enrollment/student/groups/${groupId}/waitlist`, token)
export const askGroupManager = (token, wishes) => authPost('/enrollment/student/ask-manager', token, wishes)

// «Договоры» (ТЗ кабинетов, 14а): список, текст, оферта галочкой, код из SMS и подпись. Ответ списка помним полминуты —
// его читают меню (счётчик) и сам раздел; после подписи или принятия оферты кэш сбрасывается. Нет ручки на стенде — null.
let _contractsCache = null
export function dropContractsCache() {
  _contractsCache = null
}
export async function getMyContracts(token) {
  if (!token) return null
  if (_contractsCache && _contractsCache.token === token && Date.now() - _contractsCache.at < 30000) return _contractsCache.value
  try {
    const value = await authGet('/contracts/mine', token)
    _contractsCache = { token, at: Date.now(), value }
    return value
  } catch (e) {
    if (e?.status === 404 || e?.status === 403 || e?.status === 400) return null
    throw e
  }
}
export const getContractDetail = (token, id) => authGet(`/contracts/${id}`, token)
export const getPaperContract = (token,id) => authGet(`/contracts/${id}/paper`,token)
export const preparePaperContract = (token,id,fields) => authPut(`/contracts/${id}/paper`,token,fields)
export async function submitContractScan(token,id,files,signedOn,confirmed){
  const body=new FormData();files.forEach(file=>body.append('file',file));body.append('signedOn',signedOn);body.append('confirmed',String(confirmed))
  const res=await fetch(`${BASE}/contracts/${id}/scan`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body})
  if(!res.ok){if(res.status===401)reportUnauthorized();const data=await res.json().catch(()=>({}));const message=data.messages?.[0]||data.message;const error=new Error(message||'Could not upload the scan');error.serverMessage=message;error.status=res.status;throw error}
  dropContractsCache();return res.json()
}
export async function getContractScanPdf(token,id){const res=await fetch(`${BASE}/contracts/scans/${id}/pdf`,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error('Could not open the scan');return res.blob()}
export async function acceptContractOffer(token) {
  const result = await authPost('/contracts/offer/accept', token, {})
  dropContractsCache()
  return result
}
export const requestContractCode = (token, id, fields) => authPost(`/contracts/${id}/code`, token, fields)
export async function signContract(token, id, code) {
  const result = await authPost(`/contracts/${id}/sign`, token, { code })
  dropContractsCache()
  return result
}
// PDF отдаётся только с токеном, поэтому не ссылка, а blob: экран открывает его object URL в новой вкладке.
export async function getContractPdf(token, id) {
  try {
    const res = await fetch(`${BASE}/contracts/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? await res.blob() : null
  } catch {
    return null
  }
}

export function getLessonsSummary(token) {
  return authGet('/admin/lessons/summary', token)
}

/**
 * Ученик прошёл юнит «Практики» — засчитать его в домашних работах.
 *
 * Раздел «Практика» целиком клиентский: контент лежит статикой здесь, прогресс
 * — в localStorage и в своей базе кабинета. Бэкенд домашки об этом не знал, и
 * «выполнено» у выданного юнита преподаватель ставил руками, по слову ученика.
 *
 * Уезжает тот же АДРЕС, каким юнит выдавали: раздел, уровень, номер. Сервер сам
 * найдёт, в каких работах этого ученика он задан.
 */
export function markPracticeUnitDone(token, { area, level, unitId, unitKey, done, total }) {
  // done/total — только там, где раздел выдаётся уровнем целиком: у юнита,
  // который закрывается сам собой, отчёт остаётся событием «закрыт». Порог
  // засчитывания (80 %) держит сервер: правило домашней работы должно жить в
  // одном месте, иначе старые вкладки будут считать по-своему.
  return authPost('/admin/homework/practice/done', token,
    { area, level, unitId, unitKey, done, total })
}

/**
 * Выдать юниты «Практики» на дом всем участникам урока.
 *
 * Уезжает АДРЕС юнита, а не его содержимое: контент «Практики» лежит статикой
 * здесь же, в кабинете, бэкенд его не хранит (см. AddPracticeUnitsRequest).
 * Название и раздел идут снимком — чтобы преподаватель в списке заданий видел,
 * что именно выдал, даже если каталог потом переименуют.
 *
 * `batchId` — один на нажатие: повтор с тем же ключом ничего не задваивает,
 * поэтому двойной клик и ретрай после обрыва безопасны.
 *
 * `dueDate` (`YYYY-MM-DD`, null — без срока) сервер применяет только вперёд:
 * стоящий в работе более поздний срок он не сдвигает, а прошедший отвергает
 * целиком, до записи заданий.
 */
export function assignPracticeUnits(token, lessonId, { area, units, batchId, dueDate = null }) {
  return authPut(`/admin/homework/lesson/${lessonId}/exercises/from-practice`, token, {
    area,
    units,
    batchId,
    dueDate,
  })
}

// Заявка на пробный урок — состояние экрана «Уроки» у человека, пришедшего с
// сайта самостоятельно: назначен ли ему преподаватель, оставлял ли он заявку,
// взял ли его менеджер (TrialRequestController на бэкенде). Не путать с блоком
// «Пробный урок» в конце файла: там урок по секретной ссылке для ещё не
// заведённого ученика, здесь — заявка залогиненного на себя, ученик берётся из
// токена, тела у запроса нет вовсе.
//
// GET и POST отвечают ОДНИМ И ТЕМ ЖЕ DTO, поэтому ответ на заявку — это уже
// свежее состояние экрана: перечитывать GET после POST не нужно и нельзя (два
// источника правды разъедутся при гонке).
function trialRequestState(data) {
  return {
    requested: !!data?.requested,
    requestedAt: data?.requestedAt || null,
    teacherAssigned: !!data?.teacherAssigned,
    managerAssigned: !!data?.managerAssigned,
  }
}

export async function getTrialRequestState(token) {
  return trialRequestState(await authGet('/mobile/trial-request', token))
}

// Идемпотентно на бэкенде: повторный вызов не двигает время первой заявки и не
// падает. Клиент всё равно не даёт нажать дважды (см. TrialRequestCard) —
// идемпотентность страхует гонку вкладок, а не заменяет гард.
export async function requestTrialLesson(token) {
  return trialRequestState(await authPost('/mobile/trial-request', token))
}

// Витрина: что и почём продаётся (GET /catalog/offers, публично).
//
// Каталог живёт на бэкенде, а не в этом репозитории, и это не вкусовщина: цену
// заказа считает сервер по своим же данным, а клиент присылает только коды. Всё
// остальное — статичный прайс в бандле — означало бы «12 уроков за 1 тенге»
// правкой в консоли браузера.
export async function getOffers() {
  const data = await get('/catalog/offers')
  return Array.isArray(data) ? data : []
}

// Заказ и ссылка на оплату (POST /mobile/orders, Bearer).
//
// `items` — [{ offerCode, quantity }]. Цены здесь нет намеренно, см. getOffers.
// `idempotencyKey` обязателен: двойной клик по «Перейти к оплате» с тем же
// ключом вернёт тот же заказ, а не создаст второй платёж.
//
// paymentUrl пуст, когда эквайринг ещё не подключён — тогда экран показывает
// запасной путь (написать менеджеру), а не пустую страницу оплаты.
export async function createOrder(token, { items, idempotencyKey, returnUrl } = {}) {
  return authPost('/mobile/orders', token, { items, idempotencyKey, returnUrl })
}

// Заявка менеджеру с коммерческих экранов (тарифы, докупка минут) — уезжает в
// amoCRM (бэкенд: POST /mobile/leads, modules/crm).
//
// ФИО и телефон не отправляем: бэкенд берёт их из токена. Позволить клиенту
// прислать чужой номер значило бы отдать менеджерам открытую форму спама.
// `comment` — состав заказа, менеджер видит его в карточке сделки.
//
// Возвращает { accepted } — есть ли у аккаунта телефон, по которому вообще
// можно перезвонить. Повторное нажатие бэкенд схлопывает сам, для клиента это
// по-прежнему успех.
// `amount` — итог корзины в тенге; уедет бюджетом сделки, иначе воронка продаж
// показывает ₸0 по всем заявкам с платформы. У заявок без покупки его нет.
export async function createLead(token, { source, comment, amount } = {}) {
  const data = await authPost('/mobile/leads', token, {
    source,
    comment: comment || null,
    amount: Number.isFinite(amount) ? Math.round(amount) : null,
  })
  return { accepted: data?.accepted !== false }
}

// Живой урок: загрузка одного урока и управление жизненным циклом (учитель/админ).
// Бэкенд скоупит /admin/lessons/{id} под личность токена.
export function getLessonById(token, id) {
  return authGet(`/admin/lessons/${id}`, token)
}

// Состояние живого занятия (где класс, ведёт ли преподаватель, стадия, таймер,
// статус) — снимок при входе и после каждого переподключения сокета; дальше
// оно приходит каналом /topic/lesson/{id}/state. Без SWR-кэша: снимок из кэша
// увёл бы вошедшего ученика к позиции класса, которой уже нет.
export function getLiveState(token, lessonId) {
  return authGet(`/admin/lessons/${lessonId}/live-state`, token)
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

export function sendLessonMessage(token, lessonId, body, attachment) {
  return authPost(`/admin/lessons/${lessonId}/messages`, token, {
    body,
    attachmentUrl: attachment?.url,
    attachmentName: attachment?.name,
  })
}

// Правка и удаление в чате урока. Кто что может — решает сервер (`canEdit` /
// `canDelete` в ответе): своё правит и удаляет автор, чужое удаляет ведущий
// урок. Оба запроса возвращают переписку целиком, как и отправка.
export function editLessonMessage(token, lessonId, messageId, body) {
  return authPatch(`/admin/lessons/${lessonId}/messages/${messageId}`, token, { body })
}

export function deleteLessonMessage(token, lessonId, messageId) {
  return authDelete(`/admin/lessons/${lessonId}/messages/${messageId}`, token)
}

// URL интерактивного материала с внедрённым бридж-скриптом (сохранение/восстановление
// ответов + живой follow-me), см. LessonMaterialProgressController на бэкенде.
// GET идёт по iframe-навигации (не fetch), поэтому токен передаётся в query,
// а не в заголовке — тот же приём, что и в web-admin (buildProgressRenderUrl).
// forceReload добавляет nonce, чтобы iframe гарантированно перезагрузился
// (нужно студенту, догоняющему учителя: снимок проигрывается в чистую страницу).
// Страницы следования отдельным адресом больше нет — с backend#222 мост одинаков
// в своём уроке и при следовании за классом. Nonce обязан быть
// ДЕТЕРМИНИРОВАННЫМ от значения forceReload (а не Date.now()) - иначе src
// меняется на каждый ре-рендер SectionMaterialFrame (например от полинга
// "учитель начал урок" раз в 5с), и браузер молча перезагружает iframe весь
// остаток урока, обнуляя непереживший дебаунс прогресс студента.
export function lessonMaterialRenderUrl(lessonId, materialId, token, { mode = 'live', forceReload, studentId } = {}) {
  const params = new URLSearchParams({ mode, access_token: token || '' })
  if (studentId != null) params.set('studentId', String(studentId))
  if (forceReload) params.set('_r', String(forceReload))
  return `${BASE}/student/lessons/${lessonId}/materials/${materialId}/render?${params.toString()}`
}

// Прогресс по материалу урока. Тот же эндпоинт, что дёргает бридж внутри
// отрендеренного iframe, — он не привязан к типу материала и хранит
// произвольную строку eventsJson по ключу (урок, материал, ученик). Уроку,
// открытому шагами, этого достаточно: свой материал у него есть, а заводить
// вторую таблицу под то же самое значило бы держать два места для одного
// ответа.
//
// studentId читает преподаватель, чтобы увидеть работу участника; ученику
// сервер и так отдаёт только его собственную (assertAccess).
export function getLessonMaterialProgress(token, lessonId, materialId, studentId) {
  const q = studentId != null ? `?studentId=${encodeURIComponent(studentId)}` : ''
  return authGet(`/student/lessons/${lessonId}/materials/${materialId}/progress${q}`, token)
}

export function saveLessonMaterialProgress(token, lessonId, materialId, eventsJson, options) {
  return authPut(`/student/lessons/${lessonId}/materials/${materialId}/progress`, token, { eventsJson }, options)
}

// Стадии файлового урока (`section.stage` в самом файле, сняты сервером при
// импорте ключей) — из них собираются «Темы», когда разбор на шаги выключен.
// Материал не-файла или без ключей отдаёт пустой список. Доступ — как у /render:
// ученик занятия и его преподаватель (assertLessonAccess).
export function getLessonViewStages(token, lessonId, materialId) {
  return authGet(`/student/lessons/${lessonId}/materials/${materialId}/lesson-view/stages`, token)
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
  if (!res.ok) {
    // Статус кладём на саму ошибку: 403 здесь — не сбой сети, а осознанный
    // отказ бэкенда (админ закрыл модуль или исчерпана квота «N из M»), и
    // вызывающий код обязан отличать его от офлайна — см. markDone.
    const err = new Error(`lesson complete failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => null) // { done: [<code>], total, balance? }
}

// Аудиокниги (GET /mobile/audio-lessons) — каталог «Книжек» из dev-admin.
// Отдаёт [{id,title,author,description,level,topic,genre,year,coverImageUrl,
// durationLabel,audioUrl,tracks,...}] с настоящими обложками (coverImageUrl).
//
// onFresh обязателен для SWR-кэша: каталог отдаётся из памяти/localStorage сразу, а
// свежий ответ приходит позже и без этого колбэка просто выбрасывался. Книгу,
// которую админ добавил или включил, ученик видел только со второго захода в
// «Практику» — со стороны это выглядело как «то книги есть, то нет».
export function getAudiobooks(token, onFresh) {
  return cachedAuthGet('/mobile/audio-lessons', token, onFresh)
}

// Одна книга целиком (GET /mobile/audio-lessons/{id}). В отличие от списка выше
// detail-эндпоинт отдаёт tracks[].text — полный текст главы, заведённый в
// админке (список его вырезает как тяжёлый, см. AudioLessonMapperService).
// Отсюда читалка берёт главы книг, которых нет в статике public/practice/books.
// Без localStorage-кэша: текст книги — сотни килобайт, квота кончится на первой
// же книге; повторные открытия закрывает модульный кэш в BookDetail.
export function getAudiobook(token, id) {
  return authGet(`/mobile/audio-lessons/${id}`, token)
}

// Баланс: монеты и стрик (для HUD). SWR-кэш: сайдбар перемонтируется на каждом
// переходе между экранами (key={screen} в App.jsx), кэш убирает и повторный
// запрос в блокирующем пути, и «мигание» нулей; свежее значение — через onFresh.
// Две цифры профиля: дни подряд (по входам) и уроки пройдено (занятия с преподавателем,
// иначе «Самостоятельно») — считает сервер, чтобы вебу и приложению не расходиться.
export function getProfileStats(token) {
  return authGet('/mobile/profile-stats', token)
}

export function getBalance(token, onFresh) {
  return cachedAuthGet('/mobile/balance/info', token, onFresh)
}

export function listNotifications(token, limit = 20) {
  return authGet(`/notifications?limit=${limit}`, token)
}

export function getUnreadNotificationCount(token) {
  return authGet('/notifications/unread-count', token)
}

export function markNotificationRead(token, id) {
  return authPut(`/notifications/${id}/read`, token)
}

export function markAllNotificationsRead(token) {
  return authPut('/notifications/read-all', token)
}

// Каналы дублирования уведомлений: { email, push } (ТЗ кабинетов, 14). Кабинет работает всегда и не настраивается.
export function getNotificationChannels(token) {
  return authGet('/notifications/channels', token)
}

export function saveNotificationChannels(token, channels) {
  return authPut('/notifications/channels', token, channels)
}

export function deleteNotification(token, id) {
  return authDelete(`/notifications/${id}`, token)
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

// Клиентская часть работает только под ролью студента. Метка на входе говорит бэкенду: выдай токен ученика, даже
// если у человека в админке несколько ролей; а у сотрудника без роли студента вход здесь закрыт — бэкенд
// ответит сообщением «зарегистрируйтесь как студент или обратитесь к менеджеру», его и показываем.
// Метка идёт параметром запроса, а не заголовком: CORS-preflight отвечает nginx с фиксированным списком заголовков,
// и свой заголовок X-App браузер не пропустит («CORS error» на /auth/login). Параметр проходит без правок nginx.
export const APP_PARAM = 'jts_app=student'

async function post(path, body) {
  let res
  try {
    res = await fetch(BASE + path + (path.includes('?') ? '&' : '?') + APP_PARAM, {
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

// Запрос кода регистрации (шаг «Как с вами связаться?», screens/auth/
// ContactsStep): имя, дата, почта и номер собраны — отправляем всё сразу.
// Бэкенд шлёт код на почту, когда она есть (RegistrationService: email
// предпочтительнее телефона как канал OTP при обоих полях) — таков порядок
// веб-формы: имя и дата → почта и номер → код на почту → пароль. Если телефон
// или почта уже заняты — не уводим молча в вход, а помечаем ошибку кодом
// USER_EXISTS.
export async function sendRegistrationOtp(name, phone, email, birthDate) {
  try {
    await post('/registration/initiate', {
      name: name || 'Гость',
      phone: normalizePhone(phone),
      email,
      birthDate,
      // Откуда пришёл (лендинг, реклама) — для тега и меток сделки в amoCRM.
      // Бэкенд игнорирует незнакомые поля, так что веб можно катить раньше.
      ...registrationFields(readAttribution(safeStorage())),
    })
    return 'register'
  } catch (e) {
    if (isUserExistsError(e)) {
      e.code = 'USER_EXISTS'
      // Что именно занято — почта или номер, — бэкенд пишет в тексте
      // (UserIdentityConflict): экран ставит ошибку под нужное поле.
      e.field = identityConflictField(e)
    }
    throw e
  }
}

// 'email' | 'phone' | null — по тексту ответа бэкенда («с такой почтой…», «с
// таким телефоном…») или по имени уникального индекса из сырой ошибки базы.
export function identityConflictField(e) {
  const msg = (e?.message || '').toLowerCase()
  if (/почт|email/.test(msg)) return 'email'
  if (/телефон|phone/.test(msg)) return 'phone'
  return null
}

// Шаг 4: проверка кода, присланного на почту. Создаёт пользователя сразу с
// обоими идентификаторами и возвращает accessToken/refreshToken (см.
// RegistrationVerifyResponse на бэкенде) — отдельного входа после регистрации
// больше не требуется.
export async function verifyRegistrationOtp(name, phone, email, code, birthDate) {
  try {
    const res = await post('/registration/verify', {
      name: name || 'Гость',
      phone: normalizePhone(phone),
      email,
      birthDate,
      otp: code,
      // Именно здесь бэкенд создаёт аккаунт и заявку менеджеру.
      ...registrationFields(readAttribution(safeStorage())),
    })
    // Метка своё отработала: следующий аккаунт с этого браузера уже не «с лендинга».
    clearAttribution(safeStorage())
    return res
  } catch (e) {
    // Гонка двух вкладок / повтор OTP после уже созданного аккаунта раньше
    // доезжала как 500 «не удалось выполнить операцию в базе данных».
    if (isUserExistsError(e) || isGenericDbError(e)) e.code = 'USER_EXISTS'
    throw e
  }
}

function isUserExistsError(e) {
  const msg = (e?.message || '').toLowerCase()
  return (
    msg.includes('exist') ||
    msg.includes('уже есть') ||
    msg.includes('уже существует') ||
    msg.includes('duplicate') ||
    msg.includes('idx_users_email') ||
    msg.includes('idx_users_phone') ||
    msg.includes('unique constraint')
  )
}

function isGenericDbError(e) {
  const msg = (e?.message || '').toLowerCase()
  return msg.includes('базе данных') || msg.includes('database')
}

export async function getCurrentUser(token) {
  if (!token) return null
  return authGet('/user/me', token)
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

// Шаг 2 входа по коду: проверка кода → LoginResponse с accessToken.
export async function verifyLoginOtp(identifier, code) {
  return post('/auth/otp/verify', { ...identifierBody(identifier), otp: code })
}

// Вход через Google: id_token из Google Identity Services → LoginResponse
// с accessToken. Бэкенд сам создаёт пользователя при первом входе.
export function loginWithGoogle(idToken) {
  return post('/auth/google', { idToken })
}

// ─────────────────────────────────────────────────────────────────────────
// Практика: контент из dev-admin (mobile-эндпоинты бэкенда, требуют Bearer).
// dev-admin.justtostudy.kz читает из того же dev-server, поэтому всё, что
// заведено в админке, приходит сюда.
// ─────────────────────────────────────────────────────────────────────────

// Вход по паролю. Идентификатор — телефон ИЛИ email: бэкенд принимает оба
// (AuthService сам решает, по какому полю искать), поэтому здесь тот же
// identifierBody, что у OTP-флоу — раньше уходил только phone, и войти по
// почте было нельзя, хотя аккаунт с ней заводился.
export async function loginWithPassword(identifier, password) {
  return post('/auth/login', { ...identifierBody(identifier), password })
}

// Первый пароль для аккаунта, заведённого саморегистрацией по OTP (у него
// пароля нет вовсе). Требует уже полученный после подтверждения кода токен.
// Отдельный эндпоинт, а не смена пароля: текущего пароля тут не существует.
export async function setPassword(token, password) {
  const res = await fetch(`${BASE}/user/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const err = new Error(body?.messages?.[0] || body?.message || 'Не удалось сохранить пароль')
    err.status = res.status
    throw err
  }
  return true
}

/** One-time admin-created student invite: GET name, POST password. */
export async function getActivationInfo(activationToken) {
  let res
  try {
    res = await fetch(`${BASE}/registration/activation/${encodeURIComponent(activationToken)}`)
  } catch {
    throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.messages) && data.messages[0]) ||
        data?.message ||
        `Ошибка сервера (${res.status})`
    )
  }
  return data
}

export async function completeActivation(activationToken, password) {
  return post(`/registration/activation/${encodeURIComponent(activationToken)}`, { password })
}

// Демо-доступ для витрины «Практика», когда пользователь ещё не залогинен
// (флоу Skip). Кэшируем промис, чтобы не ходить за токеном повторно.
//
// Пароля демо-аккаунта здесь БОЛЬШЕ НЕТ и быть не должно. Раньше браузер
// логинился сам парой NEXT_PUBLIC_DEMO_PHONE / NEXT_PUBLIC_DEMO_PASSWORD со
// значениями по умолчанию прямо в этой строке: префикс NEXT_PUBLIC_ означает
// «вшить в бандл», то есть пароль общего аккаунта читался из исходников
// вкладки. Токен протухает и годится только этому приложению, а паролем можно
// войти откуда угодно и сменить его. Теперь пару знает только сервер —
// src/app/api/practice/demo-token/route.js.
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
      /* localStorage недоступен — просто сходим за токеном */
    }
  }
  if (!_demoTokenPromise) {
    _demoTokenPromise = fetch('/api/practice/demo-token', { method: 'POST' })
      .then(async (res) => {
        // Стенд без настроенного демо-доступа отвечает 503, недоступный
        // бэкенд — 502. И то и другое значит «витрины сейчас нет»: раздел
        // откроется без серверной части, ровно как при неудачном входе раньше.
        if (!res.ok) return null
        const body = await res.json().catch(() => null)
        return body?.accessToken || null
      })
      .then((tok) => {
        // Пустой ответ не запоминаем: отказ бывает временным (передеплой
        // бэкенда — секунды), а запомненный он держался бы до перезагрузки
        // вкладки, и второй заход в раздел был бы так же бесполезен. Та же
        // причина, по которой сбрасывается кэш каталога в админке.
        if (!tok) {
          _demoTokenPromise = null
          return null
        }
        try {
          window.localStorage.setItem(DEMO_TOKEN_KEY, tok)
        } catch {
          /* квота/приватный режим — работаем без кэша */
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

// Каталог комиксов (GET /mobile/comics) →
// [{id,slug,title,author,level,coverUrl,pageCount,adultOnly,description:{ru,en,kk}}].
// Меняется редко и правится только из админки — поэтому через тот же
// stale-while-revalidate кэш, что и остальные каталоги Практики.
export function getComics(token, onFresh) {
  return cachedAuthGet('/mobile/comics', token, onFresh)
}

// Один комикс со страницами и репликами (GET /mobile/comics/{id}) →
// {…, pages:[{n,url,w,h,blocks:[{kind,en,ru,kk}]}]}. Отдаётся целиком одним
// ответом: запрос на страницу означал бы 214 запросов за одно чтение книги.
// Мимо кэша каталогов — ответ на пару сотен килобайт в localStorage не кладём.
export function getComic(token, ref) {
  return authGet(`/mobile/comics/${encodeURIComponent(ref)}`, token)
}

// Поиск по комиксам (GET /mobile/comics/search?q=) — та же форма ответа, что и
// у каталога. Мимо кэша каталогов: запрос меняется на каждую букву, класть его
// в localStorage бессмысленно.
export function searchComics(token, q) {
  return authGet(`/mobile/comics/search?q=${encodeURIComponent(q)}`, token)
}

// Каталог караоке (GET /mobile/karaoke) →
// [{id,slug,title,artist,level,bpm,durationSec,tags,coverUrl,audioUrl,
//   instrumentalUrl,lyricsUrl,lineCount,description:{ru,en,kk}}].
// Как и комиксы, материал заводит методист через админку, поэтому кэшируем
// тем же stale-while-revalidate: каталог меняется раз в неделю, а открывают
// его каждый заход.
//
// Разметку (строки с таймкодами) каталог НЕ содержит — только ссылку на неё;
// её тянет karaokeData.js уже при открытии трека. Контракт:
// docs/superpowers/specs/2026-09-03-karaoke-api-contract.md
export function getKaraokeTracks(token, onFresh) {
  return cachedAuthGet('/mobile/karaoke', token, onFresh)
}

// Уроки «Практика → Шэдоуинг», добавленные методистом через админку
// (GET /mobile/shadowing). Вшитые в сайт уроки (public/shadowing/*.json) не
// трогаем — это дополнение к ним. Каталог: [{id,slug,title,speaker,video,
// sourceChannel,sourceUrl,level,segCount,orderIndex,active,updatedAt}], фраз в
// нём нет. Кэш — тот же stale-while-revalidate, что у караоке и комиксов: список
// меняется редко, а открывают его каждый заход; показанное и скрытое в админке
// подтянется фоновым обновлением.
export function getShadowingLessons(token, onFresh) {
  return cachedAuthGet('/mobile/shadowing', token, onFresh)
}

// Один урок с фразами: те же поля плюс segments: [[начало, конец, текст], …] в
// секундах, как в файлах public/shadowing/<id>.json. Без кэша: правка фраз в
// админке должна доехать при следующем открытии урока.
export function getShadowingLesson(token, slug) {
  return authGet(`/mobile/shadowing/${encodeURIComponent(slug)}`, token)
}

// Один караоке-трек (GET /mobile/karaoke/{id}). Нужен на случай диплинка и
// перезагрузки экрана исполнения: карточка каталога к этому моменту может быть
// уже не в памяти.
export function getKaraokeTrack(token, id) {
  return authGet(`/mobile/karaoke/${encodeURIComponent(id)}`, token)
}

// IELTS (бэкенд, /mobile/ielts). Тест приходит без ключей,
// проверяет только сервер: по одному вопросу (/check — «Тренировка» и «Разбор»)
// или целиком при сдаче (/attempts).
//
// Короткий кэш в памяти вкладки: хаб IELTS перемонтируется после каждого прохождения и разбора и спрашивал четыре
// каталога навыков заново, а вкладки «План» и «Mock-тесты» — свой список на каждом клике по вкладке. Последняя
// попытка на карточке всё равно меняется сразу: любая сдача, оценка, правка плана или профиля чистит кэш
// (ieltsChanged ниже), а кэшируется промис — два экрана в одном кадре делят один запрос.
const _ieltsCache = new Map()
const IELTS_TESTS_TTL = 2 * 60 * 1000
const IELTS_LIST_TTL = 30 * 1000

function ieltsCached(key, ttl, load) {
  const hit = _ieltsCache.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.p
  const p = load()
  // осечка не залипает: следующий заход спросит снова
  p.catch(() => _ieltsCache.get(key)?.p === p && _ieltsCache.delete(key))
  _ieltsCache.set(key, { at: Date.now(), p })
  return p
}

/** Сбросить кэш IELTS (каталоги, план, mock, «кто я») — после любого действия, меняющего прогресс. */
export function invalidateIeltsCache() {
  _ieltsCache.clear()
  _ieltsMe.clear()
}

// действие изменило прогресс: кэш сбрасывается и при успехе, и при ошибке (оценка Speaking создаёт работу даже
// при отказе распознавания)
function ieltsChanged(p) {
  return p.finally(invalidateIeltsCache)
}

export function getIeltsTests(token, skill = 'reading') {
  return ieltsCached(`tests|${token}|${skill}`, IELTS_TESTS_TTL, () => authGet(`/mobile/ielts/tests?skill=${encodeURIComponent(skill)}`, token))
}

// Прогресс слов «Словаря» на сервере (backend /mobile/vocab-progress, TEST_FORMAT.md §12): коробки Лейтнера по
// наборам. Сейчас пишут наборы IELTS Vocabulary (scope 'ielts-<id>'); уровни и сферы пока считают «изучено» в
// localStorage (vocabLearned.js).
export function getVocabProgress(token, scopes) {
  return authGet(`/mobile/vocab-progress?scopes=${encodeURIComponent(scopes.join(','))}`, token)
}

export function getVocabProgressWords(token, scope) {
  return authGet(`/mobile/vocab-progress/${encodeURIComponent(scope)}`, token)
}

export function saveVocabProgress(token, scope, results) {
  return authPost(`/mobile/vocab-progress/${encodeURIComponent(scope)}`, token, { results })
}

export function getIeltsTest(token, id) {
  return authGet(`/mobile/ielts/tests/${encodeURIComponent(id)}`, token)
}

export function checkIeltsAnswer(token, testId, itemId, given) {
  return authPost(`/mobile/ielts/tests/${encodeURIComponent(testId)}/check`, token, { itemId, given })
}

export function submitIeltsAttempt(token, testId, body) {
  return ieltsChanged(authPost(`/mobile/ielts/tests/${encodeURIComponent(testId)}/attempts`, token, body))
}

export function getIeltsAttempt(token, attemptId) {
  return authGet(`/mobile/ielts/attempts/${encodeURIComponent(attemptId)}`, token)
}

// Транскрипт частей Listening: «Тренировка» — по кнопке, «Разбор» — всегда; в тест без ключей он не входит.
export function getIeltsTranscript(token, id) {
  return authGet(`/mobile/ielts/tests/${encodeURIComponent(id)}/transcript`, token)
}

// Writing: модельный ответ — отдельной ручкой (в задании его нет, антифрод §14.3); работа сдаётся без оценки
// (pending_ai), оценивает её наш серверный роут /api/ielts/writing/assess — у бэкенда ключа модели нет.
export function getIeltsWritingModel(token, id) {
  return authGet(`/mobile/ielts/tests/${encodeURIComponent(id)}/model`, token)
}

// Профиль IELTS (онбординг, маршрут) и диагностика. Диагностику проверяет бэкенд: ключей у экрана нет, поэтому и
// адаптивный клип Listening он спрашивает (…/diagnostic/path) по ответам на предыдущие слоты.
// «Сегодня» (баллы, план дня, roadmap, прогноз, XP) и «Прогресс» IELTS. План и XP считает бэкенд по фактам попыток.
export function getIeltsDashboard(token) {
  return authGet('/mobile/ielts/dashboard', token)
}

export function rebuildIeltsPlan(token) {
  return ieltsChanged(authPost('/mobile/ielts/dashboard/plan', token, {}))
}

// Программа и план IELTS (backend docs/ielts/PROGRAMMES.md): одни задачи для роадмапа, недели и месяца; выполнение
// считает бэкенд по сданным работам, отметку руками принимают только гид и словарь (completionRule: self_report).
export function getIeltsPlan(token, { from, to } = {}) {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const s = q.toString()
  return ieltsCached(`plan|${token}|${s}`, IELTS_LIST_TTL, () => authGet('/mobile/ielts/plan' + (s ? '?' + s : ''), token))
}

export function moveIeltsPlanTask(token, id, date) {
  return ieltsChanged(authPut(`/mobile/ielts/plan/tasks/${id}/date`, token, { date }))
}

export function markIeltsPlanTask(token, id, done) {
  return ieltsChanged(authPut(`/mobile/ielts/plan/tasks/${id}/done`, token, { done }))
}

// Полный mock (backend TEST_FORMAT.md §11): серверные часы секций и автосохранение. Секции сдаются ручками отдельных
// тестов, сессии уходят только id сданных попыток.
export function getIeltsMocks(token, module) {
  return ieltsCached(`mocks|${token}|${module || ''}`, IELTS_LIST_TTL, () => authGet('/mobile/ielts/mocks' + (module ? `?module=${encodeURIComponent(module)}` : ''), token))
}

export function startIeltsMock(token, mockId) {
  return ieltsChanged(authPost(`/mobile/ielts/mocks/${encodeURIComponent(mockId)}/sessions`, token, {}))
}

export function getIeltsMockSession(token, id) {
  return authGet(`/mobile/ielts/mocks/sessions/${id}`, token)
}

export function startIeltsMockSection(token, id, section) {
  return authPost(`/mobile/ielts/mocks/sessions/${id}/sections/${section}/start`, token, {})
}

export function saveIeltsMockDraft(token, id, section, draft, { keepalive = false } = {}) {
  return authPut(`/mobile/ielts/mocks/sessions/${id}/sections/${section}/draft`, token, draft, { keepalive })
}

export function finishIeltsMockSection(token, id, section, attemptIds) {
  return ieltsChanged(authPost(`/mobile/ielts/mocks/sessions/${id}/sections/${section}/finish`, token, { attemptIds }))
}

export function abortIeltsMock(token, id) {
  return ieltsChanged(authPost(`/mobile/ielts/mocks/sessions/${id}/abort`, token, {}))
}

export function getIeltsProgress(token) {
  return authGet('/mobile/ielts/progress', token)
}

// ---- SAT (бэкенд /mobile/sat/**, docs/sat/TEST_FORMAT.md): профиль, таксономия, вопрос без ключа, проверка
// Шаги старта и доступ к материалам SAT (backend V341): { access, onboarded, diagnosticDone } — открыто без доступа
export function getSatMe(token) {
  return authGet('/mobile/sat/me', token)
}

// Сайдбар спрашивает доступ SAT на каждом экране — ответ помним по токену; осечку не помним (доступа нет до
// следующего экрана, меню просто останется прежним).
const _satMe = new Map()
export function getSatMeCached(token) {
  if (!token) return Promise.resolve(null)
  if (!_satMe.has(token)) {
    _satMe.set(token, getSatMe(token).catch(() => {
      _satMe.delete(token)
      return null
    }))
  }
  return _satMe.get(token)
}

export function getSatProfile(token) {
  return authGet('/mobile/sat/profile', token)
}

/** Частичное сохранение: поля null остаются как были — каждая глава онбординга пишет своё. */
export function saveSatProfile(token, body) {
  return authPut('/mobile/sat/profile', token, body)
}

/** Диагностика SAT: status none | active (вопросы без ключей) | finished (последний отчёт). */
export function getSatDiagnostic(token) {
  return authGet('/mobile/sat/diagnostic', token)
}

/** Начать диагностику или продолжить идущую — набор выбирает сервер. */
export function startSatDiagnostic(token) {
  return authPost('/mobile/sat/diagnostic', token, {})
}

/** Сдать все ответы разом: { answers: {id: ответ}, times: {id: секунды}, elapsedSec } → отчёт. */
export function submitSatDiagnostic(token, id, body) {
  return authPost(`/mobile/sat/diagnostic/${encodeURIComponent(id)}/submit`, token, body)
}

export function getSatPlan(token) {
  return authGet('/mobile/sat/plan', token)
}

/** Дни (1 = пн) и минуты: первый раз строит план, дальше пересобирает недели впереди. */
export function saveSatPlan(token, body) {
  return authPut('/mobile/sat/plan', token, body)
}

export function rebuildSatPlan(token) {
  return authPost('/mobile/sat/plan/rebuild', token, {})
}

/** { status: 'done' | 'skipped' | 'planned' } или { date: 'ГГГГ-ММ-ДД' } — перенести. */
export function updateSatLesson(token, lessonId, body) {
  return authPatch(`/mobile/sat/plan/lessons/${encodeURIComponent(lessonId)}`, token, body)
}

/** Навык из разбора пробника — в ближайшее занятие плана → { added, lesson, plan }; added=false — уже есть на неделе. */
export function addSatPlanSkill(token, skillId) {
  return authPost('/mobile/sat/plan/skills', token, { skillId })
}

/** Учебная сессия: { lessonId } — занятие плана; { skillIds, count } — по навыкам. Незаконченное занятие продолжается. */
export function startSatSession(token, body) {
  return authPost('/mobile/sat/sessions', token, body)
}

export function getSatSession(token, id) {
  return authGet(`/mobile/sat/sessions/${encodeURIComponent(id)}`, token)
}

/** Подсказка внутри сессии — до проверки делает попытку «с подсказкой» (сервер помнит сам). */
export function getSatSessionHint(token, id, qid, index) {
  return authGet(`/mobile/sat/sessions/${encodeURIComponent(id)}/questions/${encodeURIComponent(qid)}/hints/${index}`, token)
}

/** Полное решение; до проверки делает попытку «с объяснением». */
export function getSatSessionExplanation(token, id, qid) {
  return authGet(`/mobile/sat/sessions/${encodeURIComponent(id)}/questions/${encodeURIComponent(qid)}/explanation`, token)
}

/** «Похожее»: вопрос того же навыка в конец сессии. */
export function addSatSimilar(token, id, qid) {
  return authPost(`/mobile/sat/sessions/${encodeURIComponent(id)}/questions/${encodeURIComponent(qid)}/similar`, token, {})
}

export function finishSatSession(token, id) {
  return authPost(`/mobile/sat/sessions/${encodeURIComponent(id)}/finish`, token, {})
}

/** Проверка одного ответа: { given, mode, helpType, timeSec, sessionId } → верность, ключ, разбор, ошибка в очереди. */
export function checkSatAnswer(token, qid, body) {
  return authPost(`/mobile/sat/questions/${encodeURIComponent(qid)}/check`, token, body)
}

/** Тип ошибки (Figma 23): knowledge | misread | calculation | strategy | time | careless. */
export function setSatErrorType(token, errorId, errorType) {
  return authPatch(`/mobile/sat/errors/${errorId}`, token, { errorType })
}

/** Таксономия SAT с числом опубликованных вопросов банка по навыку (questions) — «40 в банке» (Figma 15). */
export function getSatTaxonomy(token) {
  return authGet('/mobile/sat/taxonomy', token)
}

/** «Сегодня» SAT (Figma 11): незавершённая сессия, следующее занятие, ошибки к повтору, до экзамена, проверка, серия. */
export function getSatToday(token) {
  return authGet('/mobile/sat/today', token)
}

/** «Прогресс» SAT (Figma 17): самостоятельно / с помощью, карта навыков, домены, темп, 90 дней, бейджи. */
export function getSatProgress(token) {
  return authGet('/mobile/sat/progress', token)
}

/** Журнал ошибок: status due | waiting | resolved | all. */
export function getSatErrors(token, status = 'all') {
  return authGet(`/mobile/sat/errors?status=${encodeURIComponent(status)}`, token)
}

/** Ошибка журнала: { errorType } и/или { resolved: true | false } — отметка «разобрано» или вернуть в очередь. */
export function patchSatError(token, id, body) {
  return authPatch(`/mobile/sat/errors/${id}`, token, body)
}

/** Сколько вопросов банка подходит под выбор конструктора практики (тело — как у startSatSession). */
export function getSatPracticePool(token, body) {
  return authPost('/mobile/sat/practice/pool', token, body)
}

/** Ежедневная проверка: сегодняшняя (начатая или новая). */
export function startSatDaily(token) {
  return authPost('/mobile/sat/daily', token, {})
}

/** Сдать проверку разом: { answers, times }. */
export function submitSatDaily(token, id, body) {
  return authPost(`/mobile/sat/daily/${encodeURIComponent(id)}/submit`, token, body)
}

/** Словарь SAT: дневная цель, оценено сегодня, расписание SM-2 по слову, свои слова (колода — public/sat/vocab). */
export function getSatVocab(token) {
  return authGet('/mobile/sat/vocab', token)
}

/** Оценить карточку: 0 «Снова», 3 «Трудно», 4 «Хорошо», 5 «Легко». */
export function gradeSatVocab(token, wordId, grade) {
  return authPost('/mobile/sat/vocab/grade', token, { wordId, grade })
}

export function setSatVocabGoal(token, goal) {
  return authPut('/mobile/sat/vocab/goal', token, { goal })
}

/** Своё слово: { word, definition, example, ru }. */
export function addSatVocabWord(token, body) {
  return authPost('/mobile/sat/vocab/words', token, body)
}

export function deleteSatVocabWord(token, id) {
  return authDelete(`/mobile/sat/vocab/words/${encodeURIComponent(id)}`, token)
}

/** Курс «36 юнитов»: размер набора каждого юнита и что ученик в нём сделал. */
export function getSatCourse(token) {
  return authGet('/mobile/sat/course', token)
}

/** Пробники SAT: хватает ли банка, идущее прохождение, сданные, опубликованные пробники. */
export function getSatMocks(token) {
  return authGet('/mobile/sat/mocks', token)
}

/** Начать полную симуляцию ({ timed }) или пробник ({ paperId }); прохождение одно за раз. */
export function startSatMock(token, body) {
  return authPost('/mobile/sat/mocks', token, body)
}

export function getSatMock(token, id) {
  return authGet(`/mobile/sat/mocks/${encodeURIComponent(id)}`, token)
}

/** Начать текущий модуль (и закончить перерыв раньше). */
export function startSatMockModule(token, id) {
  return authPost(`/mobile/sat/mocks/${encodeURIComponent(id)}/start`, token, {})
}

/** Сдать модуль целиком: { key, answers, times, marked, elapsedSec }. */
export function submitSatMockModule(token, id, body) {
  return authPost(`/mobile/sat/mocks/${encodeURIComponent(id)}/submit`, token, body)
}

export function abandonSatMock(token, id) {
  return authPost(`/mobile/sat/mocks/${encodeURIComponent(id)}/abandon`, token, {})
}

export function getSatMockReview(token, id) {
  return authGet(`/mobile/sat/mocks/${encodeURIComponent(id)}/review`, token)
}

// ---- SAT, синхронизация с прототипом (SAT-SYNC-PLAN B1–B5): недельный тест, статистика, журнал ошибок, баллы

/** Недельный тест: { weekStart, status: READY | DONE, timeLimitSeconds, questions, result }. Набор держится неделю. */
export function getSatWeekly(token) {
  return authGet('/mobile/sat/weekly', token)
}

/** Сдать недельный тест целиком: { answers: [{ questionId, answer, timeSpentMs }] } → WeeklyResult. */
export function submitSatWeekly(token, body) {
  return authPost('/mobile/sat/weekly/submit', token, Array.isArray(body) ? { answers: body } : body)
}

/** Прошлые недели: [{ weekStart, correct, total, completedAt }]. */
export function getSatWeeklyHistory(token) {
  return authGet('/mobile/sat/weekly/history', token)
}

/** Статистика для дашборда «Сегодня» (серия, решено, время, освоено, домены, 90 дней, бейджи). */
export function getSatStats(token) {
  return authGet('/mobile/sat/insights/stats', token)
}

/** Итог набора из «Практики» (только source = practice). */
export function getSatSessionSummary(token, id) {
  return authGet(`/mobile/sat/sessions/${encodeURIComponent(id)}/summary`, token)
}

/** «Log error»: запись очереди повторения становится строкой журнала (title, topic, unitCode, errorType). */
export function logSatError(token, errorId, body) {
  return authPost(`/mobile/sat/errors/${encodeURIComponent(errorId)}/log`, token, body)
}

/** Таблица «Результаты»: симуляции + добавленные баллы (Bluebook, официальный SAT). { target, entries }. */
export function getSatScores(token) {
  return authGet('/mobile/sat/scores', token)
}

/** Добавить балл: { source: BLUEBOOK | OFFICIAL, label, takenOn, rw, math }. */
export function addSatScore(token, body) {
  return authPost('/mobile/sat/scores', token, body)
}

/** Остаток демо-квот раздела: [{ contentType, limit, used, remaining, source, sourceName }], limit null — без лимита. */
export function getContentQuotaUsage(token, area) {
  return authGet(`/mobile/content-quota/usage?area=${encodeURIComponent(area)}`, token)
}

export function deleteSatScore(token, id) {
  return authDelete(`/mobile/sat/scores/${encodeURIComponent(id)}`, token)
}

export function getIeltsProfile(token) {
  return authGet('/mobile/ielts/profile', token)
}

export function saveIeltsProfile(token, body) {
  return ieltsChanged(authPut('/mobile/ielts/profile', token, body))
}

export function setIeltsRoute(token, route) {
  return ieltsChanged(authPut('/mobile/ielts/profile/route', token, { route }))
}

export function startIeltsDiagnostic(token, { level, module } = {}) {
  const q = new URLSearchParams()
  if (level) q.set('level', level)
  if (module) q.set('module', module)
  return authGet(`/mobile/ielts/diagnostic${q.toString() ? `?${q}` : ''}`, token)
}

export function getIeltsDiagnosticPath(token, body) {
  return authPost('/mobile/ielts/diagnostic/path', token, body)
}

export function submitIeltsDiagnostic(token, body) {
  return ieltsChanged(authPost('/mobile/ielts/diagnostic', token, body))
}

export function getIeltsLastDiagnostic(token) {
  return authGet('/mobile/ielts/diagnostic/last', token)
}

export function getIeltsSpeakingWorks(token) {
  return authGet('/mobile/ielts/speaking/works', token)
}

// Записи ответов Speaking — сразу нашему серверному роуту (распознавание, произношение и модель — там); бэкенд
// получает только стенограммы и баллы. answers: [{ itemId, durationSec, wav: Blob }].
// оценка меняет баллы и прогресс — кэш IELTS сбрасывается и при отказе (работа к тому времени уже создана)
//
// Сбой после создания работы (есть attemptId) — записи остаются на устройстве (ielts/speaking/pendingTakes.js), и
// «Отправить ещё раз» из экрана или из упавшей работы шлёт их же с retryAttemptId. Оценили — записи удаляются.
export function assessIeltsSpeaking(token, opts) {
  return ieltsChanged(
    assessIeltsSpeakingRaw(token, opts).then(
      (view) => {
        forgetSpeakingTakes(opts.retryAttemptId, view?.attempt?.id)
        return view
      },
      async (e) => {
        logAssessFailure('speaking', e)
        if (e?.code === 'already_graded') forgetSpeakingTakes(opts.retryAttemptId)
        else if (e?.attemptId) await savePendingTakes(attemptKey(e.attemptId), { testId: opts.testId, mode: opts.mode, answers: opts.answers }).catch(() => {})
        throw e
      },
    ),
  )
}

function forgetSpeakingTakes(...ids) {
  for (const id of ids) if (id) deletePendingTakes(attemptKey(id)).catch(() => {})
}

// Код, id запроса и разбор роута — в консоль: на экране причины сведены к нескольким фразам, а по debugId строка
// `ielts_speaking_assess` находится в логе стенда.
function logAssessFailure(route, e) {
  console.warn(`ielts ${route} grading failed:`, e?.code || e?.status || e?.message, e?.debugId ? `debugId=${e.debugId}` : '', e?.debug || '')
}

async function assessIeltsSpeakingRaw(token, { testId, mode, uiLang, answers, retryAttemptId }) {
  const form = new FormData()
  form.append('testId', testId)
  form.append('mode', mode)
  form.append('uiLang', uiLang)
  if (retryAttemptId) form.append('retryAttemptId', String(retryAttemptId))
  form.append('items', JSON.stringify(answers.map(({ itemId, durationSec }) => ({ itemId, durationSec }))))
  answers.forEach((a, i) => form.append(`audio_${i}`, a.wav, `${a.itemId}.wav`))
  return readAssess(await assessFetch('/api/ielts/speaking/assess', token, form))
}

// Обрыв сети (телефон ушёл в сон, Wi-Fi пропал посреди 10 МБ записей) — свой код: раньше он падал TypeError-ом в
// общую «Оценка не удалась», и в консоли не было даже статуса.
async function assessFetch(url, token, form) {
  try {
    return await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
  } catch (e) {
    throw Object.assign(new Error('network'), { code: 'network', detail: String(e?.message || e) })
  }
}

async function readAssess(res) {
  const body = await res.json().catch(() => null)
  // 413 от nginx приходит HTML-страницей без JSON — без этого экран показал бы общую ошибку, а не «слишком длинно»;
  // 502/504 прокси без JSON — сервер не успел (Cloudflare 524 после 100 с)
  const code = body?.error || (res.status === 413 ? 'too_large' : res.status === 504 || res.status === 524 ? 'timeout' : undefined)
  if (!res.ok)
    throw Object.assign(new Error(code || `HTTP ${res.status}`), {
      status: res.status,
      code,
      attemptId: body?.attemptId ?? null,
      debugId: body?.debugId || res.headers?.get?.('x-ielts-debug-id') || null,
      debug: body?.debug || null,
    })
  return body
}

// Короткие тренировки Writing на сервере (контракт IELTS Writing §5): прогресс дриллов, очередь «Повторить ошибки» по
// id раундов и черновики заданий. testId у упражнений разбора — id попытки (source 'attempt').
export function getIeltsDrillProgress(token) {
  return authGet('/mobile/ielts/drills/progress', token)
}

export function postIeltsDrillRun(token, testId, { pct, wrong = [], right = [], source } = {}) {
  return authPost(`/mobile/ielts/drills/${encodeURIComponent(testId)}/runs`, token, { pct, wrong, right, ...(source ? { source } : {}) })
}

export function importIeltsDrillProgress(token, items) {
  return authPost('/mobile/ielts/drills/progress/import', token, { items })
}

export function getIeltsReview(token) {
  return authGet('/mobile/ielts/review', token)
}

export function resolveIeltsReview(token, items) {
  return authPost('/mobile/ielts/review/resolve', token, { items })
}

// черновик задания: null — черновика нет (204)
export function getIeltsWritingDraft(token, testId) {
  return authGet(`/mobile/ielts/writing/drafts/${encodeURIComponent(testId)}`, token)
}

export function putIeltsWritingDraft(token, testId, text, opts) {
  return authPut(`/mobile/ielts/writing/drafts/${encodeURIComponent(testId)}`, token, { text }, opts)
}

export function deleteIeltsWritingDraft(token, testId) {
  return authDelete(`/mobile/ielts/writing/drafts/${encodeURIComponent(testId)}`, token)
}

export function getIeltsWritingWorks(token) {
  return authGet('/mobile/ielts/writing/works', token)
}

export function saveIeltsSelfCheck(token, attemptId, selfCheck) {
  return authPut(`/mobile/ielts/attempts/${encodeURIComponent(attemptId)}/selfcheck`, token, selfCheck)
}

// Оценка — наш серверный роут (ключ модели и служебный ключ бэкенда живут только там). Отвечает попыткой с band.
// оценка меняет баллы и прогресс — кэш IELTS сбрасывается и при отказе (работа к тому времени уже создана)
export function assessIeltsWriting(token, attemptId, uiLang) {
  return ieltsChanged(assessIeltsWritingRaw(token, attemptId, uiLang))
}

async function assessIeltsWritingRaw(token, attemptId, uiLang) {
  const res = await fetch('/api/ielts/writing/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ attemptId, uiLang }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(body?.error || `HTTP ${res.status}`), { status: res.status, code: body?.error })
  return body
}

// Оценка Writing/Speaking диагностики — наш серверный роут (`/api/ielts/diagnostic/assess`); отвечает result попытки.
// answers — только для Speaking: [{ itemId, durationSec, wav }]
export function assessIeltsDiagnostic(token, { attemptId, skill, uiLang, answers }) {
  return ieltsChanged(assessIeltsDiagnosticRaw(token, { attemptId, skill, uiLang, answers }))
}

async function assessIeltsDiagnosticRaw(token, { attemptId, skill, uiLang, answers }) {
  const form = new FormData()
  form.append('attemptId', String(attemptId))
  form.append('skill', skill)
  form.append('uiLang', uiLang || 'ru')
  if (answers?.length) {
    form.append('items', JSON.stringify(answers.map(({ itemId, durationSec }) => ({ itemId, durationSec }))))
    answers.forEach((a, i) => form.append(`audio_${i}`, a.wav, `${a.itemId}.wav`))
  }
  return readAssess(await assessFetch('/api/ielts/diagnostic/assess', token, form)).catch((e) => {
    logAssessFailure(`diagnostic ${skill}`, e)
    throw e
  })
}

export function submitIeltsWriting(token, id, body) {
  return ieltsChanged(authPost(`/mobile/ielts/tests/${encodeURIComponent(id)}/writing`, token, body))
}

export function getIeltsStats(token, skill = 'reading') {
  return authGet(`/mobile/ielts/stats?skill=${encodeURIComponent(skill)}`, token)
}

// Ситуации (GET /mobile/situativki?level=) → [{title,coverUrl,videoUrl,level,category,completed}]
export function getSituativki(token, level, onFresh) {
  const q = level ? `?level=${encodeURIComponent(level)}` : ''
  return cachedAuthGet('/mobile/situativki' + q, token, onFresh)
}

// Отметить ситуативку пройденной (POST /mobile/situativki/{id}/complete,
// идемпотентно). Именно здесь на бэкенде живёт проверка общей квоты ситуативок
// — пока веб не звал этот эндпоинт, лимит из админки не срабатывал никогда.
// 403 = квота исчерпана либо сценарий закрыт админом; статус кладём на ошибку,
// чтобы вызывающий отличил отказ от сетевой осечки.
export async function completeSituativka(token, id) {
  const res = await fetch(`${BASE}/mobile/situativki/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = new Error(`situativka complete failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => null)
}

// Словарь пользователя (GET /mobile/saved-words) → [{word,translation,learned,correctCount,language}]
// SWR-кэш: слова добавляются из читалки — свежий список приходит через onFresh.
export function getSavedWords(token, onFresh) {
  return cachedAuthGet('/mobile/saved-words', token, onFresh)
}

export function saveStudentVocab(token, body) {
  return authPost('/mobile/lesson-vocab', token, body).then((data) => {
    dropCachedAuthGet('/mobile/lesson-vocab', token)
    dropCachedAuthGet('/mobile/lesson-vocab/saved', token)
    dropCachedAuthGet('/mobile/saved-words', token)
    return data
  })
}

export function deleteStudentVocabWord(token, id) {
  return authDelete(`/mobile/lesson-vocab/words/${encodeURIComponent(id)}`, token).then((data) => {
    dropCachedAuthGet('/mobile/lesson-vocab', token)
    dropCachedAuthGet('/mobile/lesson-vocab/saved', token)
    dropCachedAuthGet('/mobile/saved-words', token)
    return data
  })
}

// SWR-кэш: индекс словаря почти не меняется между визитами — без кэша каждый
// заход снова тянет JSON из MinIO через бэкенд (секунды…минуты при холодном диске).
export function getVocabCatalog(token, onFresh) {
  return cachedAuthGet('/mobile/vocab-catalog', token, onFresh)
}

export function getVocabScope(token, id, onFresh) {
  return cachedAuthGet(
    `/mobile/vocab-catalog/scopes/${encodeURIComponent(id)}`,
    token,
    onFresh,
  )
}

// Just to Listen: оглавление (уровни и направления без слов) и набор целиком.
// Большой набор cachedAuthGet держит только в памяти вкладки (порог
// CATALOG_STORE_MAX_CHARS), в localStorage он вытеснял бы прогресс. 404 у
// оглавления — материалы ещё не загружены через админку.
export function getListenIndex(token, onFresh) {
  return cachedAuthGet('/mobile/listen', token, onFresh)
}

export function getListenSet(token, id, onFresh) {
  return cachedAuthGet(`/mobile/listen/sets/${encodeURIComponent(id)}`, token, onFresh)
}

// Prepositions World: весь курс одним бандлом (~1 МБ, форма прототипа, медиа — ссылки MinIO). Большой ответ
// cachedAuthGet держит только в памяти вкладки — в localStorage он вытеснял бы прогресс.
export function getPrepositions(token, onFresh) {
  return cachedAuthGet('/mobile/prepositions', token, onFresh)
}

// Pronunciation World: весь курс одним бандлом (~2.2 МБ, форма прототипа, записи и картинки — ссылки MinIO; спека
// 2026-10-28-pronunciation-world-design.md). Тот же путь, что у Prepositions World: столько cachedAuthGet держит
// только в памяти вкладки. 404 — раздел ещё не залит через админку.
export function getPronunciation(token, onFresh) {
  return cachedAuthGet('/mobile/pronunciation', token, onFresh)
}

// «Грамматика · игры»: список тем (шапки и набор игр), тема целиком, общий словарь кликабельных слов, звёзды
// ученика и сдача игры (контракт — backend docs/practice/GRAMMAR_GAMES.md). Без cachedAuthGet: его копия в
// localStorage вытесняла бы прогресс других разделов (словарь ~120 КБ), а звёзды должны быть свежими. Темы и
// словарь экран держит в памяти вкладки сам (screens/grammar-games/useGrammarGamesData.js). 404 у списка —
// раздел ещё не залит через админку.
export function getGrammarGames(token) {
  return authGet('/mobile/grammar-games', token)
}

export function getGrammarGamesTopic(token, id) {
  return authGet(`/mobile/grammar-games/topics/${encodeURIComponent(id)}`, token)
}

export function getGrammarGamesGloss(token) {
  return authGet('/mobile/grammar-games/gloss', token)
}

export function getGrammarGamesProgress(token) {
  return authGet('/mobile/grammar-games/progress', token)
}

// Ровно три поля: бэкенд строгий, лишнее поле — 400. Монеты считает он (только прирост лучшего результата),
// ответ — { best, coins, balance }; 409 — та же сдача уже записывается, повторить (practice/grammar-games/results.js).
export function postGrammarGamesResult(token, { topicId, game, stars }) {
  return authPost('/mobile/grammar-games/result', token, { topicId, game, stars })
}

// «Скорочтение»: тексты (с готовым образцом озвучки или без него — тогда его создаёт роут сайта
// /api/practice/speed-reading/sample), свои попытки и сдача попытки (контракт — backend
// docs/practice/SPEED_READING.md). Без кэша: тексты правит админка, попытки приходят и с других устройств.
// Пустой список — раздел ещё не наполнен. Ответ разбирает practice/speed-reading/data.js.
export function getSpeedReadingTexts(token) {
  return authGet('/mobile/speed-reading/texts', token)
}

export function getSpeedReadingAttempts(token, limit = 20) {
  return authGet(`/mobile/speed-reading/attempts?limit=${encodeURIComponent(limit)}`, token)
}

// Тело — attemptBody() (ровно девять полей: цифры попытки, записи нет — Д6). Ответ — { attempt, coins, balance };
// монеты считает бэкенд (раз в сутки на текст, Д16).
export function postSpeedReadingAttempt(token, body) {
  return authPost('/mobile/speed-reading/attempts', token, body)
}

// Cartoon World: каталог (~330 КБ — источники прототипа как есть, ссылки на фоны, нерабочие видео). Большой ответ
// cachedAuthGet держит только в памяти вкладки.
export function getCartoons(token, onFresh) {
  return cachedAuthGet('/mobile/cartoons', token, onFresh)
}

// Одна миссия видео (~8 КБ) — при открытии видео. Без кэша в localStorage: 726 миссий съели бы квоту, а память
// вкладки держит сам движок.
export function getCartoonMission(token, id) {
  return authGet(`/mobile/cartoons/missions/${encodeURIComponent(id)}`, token)
}

// Word Hunt: прототип целиком одним бандлом (~6,5 МБ: словарь курса, станции, аудит подсказок; записи и картинки —
// ссылки MinIO). Большой ответ cachedAuthGet держит только в памяти вкладки — в localStorage он вытеснял бы прогресс.
// 404 — прототип ещё не залит через админку.
export function getWordHunt(token, onFresh) {
  return cachedAuthGet('/mobile/word-hunt', token, onFresh)
}

export function listLessonVocab(token, onFresh) {
  return cachedAuthGet('/mobile/lesson-vocab', token, onFresh)
}

function isSavedVocabRef(lessonId) {
  return lessonId == null || lessonId === '' || lessonId === 'saved' || lessonId === 'SAVED'
}

export function openLessonVocab(lessonId, token, onFresh) {
  if (!isSavedVocabRef(lessonId)) {
    return cachedAuthGet(`/mobile/lesson-vocab/${encodeURIComponent(lessonId)}`, token, onFresh)
  }
  // Пустой личный словарь бэкенд отдаёт 404 («No saved vocabulary»). Для
  // ученика это не поломка, а ноль слов: иначе «Мой словарь» не открывался до
  // первого слова — а добавить его можно только оттуда, — и удаление
  // последнего слова кончалось тостом об ошибке.
  return cachedAuthGet('/mobile/lesson-vocab/saved', token, onFresh).catch((err) => {
    if (err?.status === 404) return { words: [] }
    throw err
  })
}

export function completeLessonVocabCycle(lessonId, cycle, results, token) {
  const path = isSavedVocabRef(lessonId)
    ? `/mobile/lesson-vocab/saved/cycles/${encodeURIComponent(cycle)}`
    : `/mobile/lesson-vocab/${encodeURIComponent(lessonId)}/cycles/${encodeURIComponent(cycle)}`
  return authPost(path, token, { results }).then((data) => {
    dropCachedAuthGet('/mobile/lesson-vocab', token)
    dropCachedAuthGet('/mobile/lesson-vocab/saved', token)
    dropCachedAuthGet('/mobile/saved-words', token)
    return data
  })
}

export function markVocabLearned(token, words) {
  const keys = [...new Set((words || []).map((w) => String(w || '').trim().toLowerCase()).filter(Boolean))]
  if (!keys.length) return Promise.resolve()
  return authPost('/mobile/lesson-vocab/saved/learned', token, { words: keys }).then((data) => {
    dropCachedAuthGet('/mobile/lesson-vocab', token)
    dropCachedAuthGet('/mobile/lesson-vocab/saved', token)
    dropCachedAuthGet('/mobile/saved-words', token)
    return data
  })
}

/**
 * Словарь школы (GET /dictionary/search).
 *
 * Тот же список, что открыт преподавателю в уроке: слова курируются админкой.
 * Пустой запрос — первая страница по алфавиту, режим «полистать».
 *
 * Это НЕ личный словарь ученика (`/mobile/saved-words` ниже): там то, что он
 * сохранил сам с тап-перевода, и живёт оно в разделе «Словарь».
 */
export async function searchDictionary(token, q = '', size = 30) {
  const query = String(q || '').trim()
  // `/dictionaries` во множественном — так называется ручка на сервере
  // (DictionaryController). С единственным числом запрос отвечал 404, список
  // всегда приходил пустой, и словарь в уроке показывал «Ничего не найдено»
  // на любое слово. У преподавателя путь был правильный, поэтому у него искалось.
  const path = `/dictionaries/search?q=${encodeURIComponent(query)}&page=0&size=${size}`
  const page = await authGet(path, token)
  return page?.content ?? []
}

// Сохранить слово из тап-перевода читалки (POST /mobile/saved-words).
// alternates — строка «через запятую», language — язык перевода ("ru"/"kk"),
// source — откуда слово (название книги). Возвращает SavedWordResponse.
export async function saveWord(token, { word, translation, alternates, language = 'ru', source, catalogLessonId }) {
  let res
  try {
    res = await fetch(`${BASE}/mobile/saved-words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ word, translation, alternates, language, source, catalogLessonId }),
    })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    // 401 с токеном — возможно, кончилась сессия: сообщаем, как authPost. Иначе с
    // протухшим токеном «Сохранить в словарь» бесконечно показывало «Не
    // сохранилось», а «Сессия истекла» не приходила (ревью 08.10.2026).
    if (res.status === 401) reportUnauthorized(token)
    const err = new Error(`Не удалось сохранить слово (${res.status})`)
    err.status = res.status
    throw err
  }
  dropCachedAuthGet('/mobile/lesson-vocab', token)
  // «Мой словарь» читает именно /saved: без сброса первым показывался старый
  // кэш, и слово из книги появлялось только после фонового обновления.
  dropCachedAuthGet('/mobile/lesson-vocab/saved', token)
  dropCachedAuthGet('/mobile/saved-words', token)
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
// Уровень из профиля. null = уровня нет (у нового аккаунта бэкенд отвечает
// 404: своего уровня ещё нет, а вывести из опросника не из чего). Это не
// ошибка, а «тест не пройден» — раньше 404 летел исключением и молча уходил в
// catch на входе, поэтому пропустивший тест больше никогда его не видел.
// Сетевые и прочие ошибки по-прежнему пробрасываются: «не знаю» ≠ «нет».
export async function getLanguageLevel(token) {
  let data
  try {
    data = await authGet('/user/language-level', token)
  } catch (e) {
    if (e?.status === 404) return null
    throw e
  }
  if (typeof data === 'string') return data
  return data?.languageLevel || data?.level || data?.value || null
}

// Раздел «Самостоятельно» в уроках (GET /user/me, поле selfStudy). Сервер
// отвечает true, только когда сейчас действует подписка или абонемент линейки
// Self Study. Сетевая осечка и старый ответ без поля — false: вкладку не
// показываем, пока не знаем, что тариф есть. Не кэшируем: тариф могут выдать,
// пока ученик уже в кабинете, и залипший ответ спрятал бы раздел до перелогина.
export async function getSelfStudyAccess(token) {
  if (!token) return false
  try {
    const data = await authGet('/user/me', token)
    return data?.selfStudy === true
  } catch {
    return false
  }
}

// Демо-статус аккаунта (GET /user/me, Bearer) — решает, показывать ли на
// экранах «лимит исчерпан» демо-CTA со ссылкой на WhatsApp или обычный текст:
// лимит может быть и не демо-природы (персональный override от менеджера).
// При сетевой осечке считаем аккаунт не демо — это не критично (просто не
// покажем CTA), а не наоборот.
export async function getIsDemoAccount(token) {
  return (await getDemoAccess(token)).isDemo
}

// То же самое, но вместе со сроком демо-доступа: «Главная» рисует по нему
// обратный отсчёт (см. lib/demoAccess.js). Отдельная функция, а не расширенный
// getIsDemoAccount: местам, которым нужен только флаг, лишнее поле ни к чему.
//
// `expiresAt: null` — демо без срока (менеджер выдал доступ руками), а не
// «истекло»: это разные вещи, и таймер во втором случае рисовать нельзя.
// Ответ помним по токену: сайдбар спрашивает демо-статус на каждом экране, а
// смена экрана его перемонтирует — без памяти это /user/me на каждый переход по
// меню. Ключ — сам токен, поэтому выход и вход под другим аккаунтом отвечают
// заново, а не отдают чужой ответ.
const _demoAccess = new Map()

export async function getDemoAccess(token) {
  if (!token) return { isDemo: false, expiresAt: null, createdAt: null }
  if (_demoAccess.has(token)) return _demoAccess.get(token)
  const p = authGet('/user/me', token)
    .then((data) => {
      const isDemo = !!data?.isDemoAccount
      const expiresAt = data?.demoExpiresAt || null
      rememberDemoDeadline(isDemo ? expiresAt : null)
      // Дата создания аккаунта — тем же ответом: по ней «Главная» отличает учившихся до теста v16 от новых
      // (src/placement/existingStudent.js).
      return { isDemo, expiresAt, createdAt: typeof data?.createdAt === 'string' ? data.createdAt : null }
    })
    .catch(() => {
      // Сетевая осечка не должна залипать в памяти: следующий экран спросит
      // заново, а пока считаем аккаунт обычным (не покажем демо-плашку —
      // это безопаснее, чем показать её платящему).
      _demoAccess.delete(token)
      return { isDemo: false, expiresAt: null, createdAt: null }
    })
  _demoAccess.set(token, p)
  return p
}

// Аккаунт IELTS (дизайн «IELTS new»): у такого ученика веб показывает только интерфейс IELTS — сайдбар без
// «Повторения» и игровых счётчиков. Признак ставит админка (позже биллинг), бэкенд отдаёт его ручкой
// /mobile/ielts/plan/me. Помним по токену, как демо-статус выше: сайдбар спрашивает на каждом экране.
const _ieltsMe = new Map()
const IELTS_ME_RETRY_MS = 10 * 60 * 1000
const IELTS_ME_NONE = { ieltsAccount: false, studyMode: 'self_study', track: 'academic', programmeName: null, onboarded: false }

export async function getIeltsMe(token) {
  if (!token) return IELTS_ME_NONE
  if (_ieltsMe.has(token)) return _ieltsMe.get(token)
  const p = authGet('/mobile/ielts/plan/me', token)
    .then((d) => ({ ...IELTS_ME_NONE, ...d, ieltsAccount: !!d?.ieltsAccount }))
    .catch((e) => {
      // Сетевая осечка не залипает: следующий экран спросит снова, а пока аккаунт обычный — General English не
      // пропадёт из-за сети. Ответ сервера (404 — ручки ещё нет на этом бэкенде, 5xx — она сломана) помним
      // IELTS_ME_RETRY_MS: сайдбар спрашивает на каждом экране, и без этого каждый переход ученика стоил бы
      // бэкенду ошибки со стеком в логе.
      if (!e?.status) _ieltsMe.delete(token)
      else setTimeout(() => _ieltsMe.get(token) === p && _ieltsMe.delete(token), IELTS_ME_RETRY_MS)
      return IELTS_ME_NONE
    })
  _ieltsMe.set(token, p)
  return p
}

// Обновление профиля (PUT /user/update, Bearer). Тело — как UpdateUserRequest
// мобилки: name обязателен, остальные поля шлём только если заданы, чтобы не
// затирать то, что уже хранит бэкенд. Возвращает обновлённый UserInfo.
export async function updateUser(token, { name, email, city, gender, birthDate, phone }) {
  const payload = { name }
  if (email) payload.email = email
  if (city) payload.city = city
  if (gender) payload.gender = gender
  if (birthDate) payload.birthDate = birthDate
  if (phone) payload.phone = normalizePhone(phone)
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
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return data
}

// Удаление своего аккаунта (DELETE /user/me, Bearer) — требование App Store. Бэкенд удаляет мягко, как админка:
// логины освобождаются, Sign in with Apple отзывается. Ошибка несёт status, экран различает по нему: 403 — аккаунт
// сотрудника (его удаляет только администратор), 404 — стенд со старым бэкендом без ручки, 0 — нет связи.
export async function deleteMyAccount(token) {
  let res
  try {
    res = await fetch(`${BASE}/user/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  } catch {
    const err = new Error('Нет связи с сервером.')
    err.status = 0
    throw err
  }
  if (!res.ok) {
    if (res.status === 401) reportUnauthorized(token)
    const err = new Error(`Не удалось удалить аккаунт (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => ({}))
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

// ── Пробный урок ────────────────────────────────────────────────────────────
// Ученик на пробном уроке ещё не заведён в системе, поэтому ключ доступа —
// секрет из ссылки (`/trial/<token>`), а не Bearer. Бэкенд открывает эти четыре
// эндпоинта без авторизации и сам проверяет срок жизни ссылки
// (см. TrialLinkController).

/** Проверка ссылки: статус урока, имя ученика и преподавателя. 404 — ссылки
 *  нет, 403 — протухла; и то и другое экран показывает одним сообщением, чтобы
 *  подбор токенов не отличался по ответу от опечатки. */
export async function openTrialLink(token) {
  let res
  try {
    res = await fetch(`${BASE}/trial/link/${encodeURIComponent(token)}`, { cache: 'no-store' })
  } catch (e) {
    throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
  }
  if (!res.ok) {
    // Статус нужен экрану: «ссылка не работает» и «сервер прилёг» — разные
    // сообщения, и во втором случае имеет смысл предложить повтор.
    const err = new Error(
      res.status === 404 || res.status === 403
        ? 'Ссылка на пробный урок недействительна или истекла.'
        : `Ошибка сервера (${res.status})`,
    )
    err.status = res.status
    throw err
  }
  return res.json()
}

/** Отметка «урок начали». Ошибку глотаем у вызывающего: это телеметрия для
 *  преподавателя, а не условие начала урока. */
export function startTrialLesson(token) {
  return post(`/trial/link/${encodeURIComponent(token)}/start`, {})
}

/** Итог диагностики. `raw` — полный лог сессии: он нужен, чтобы пересчитать
 *  уровень после калибровки банка, не гоняя ученика по тесту заново. */
export function saveTrialResult(token, payload) {
  return post(`/trial/link/${encodeURIComponent(token)}/result`, payload)
}

/** Заявка с финального экрана. */
export function saveTrialLead(token, name, phone) {
  return post(`/trial/link/${encodeURIComponent(token)}/lead`, { name, phone: normalizePhone(phone) })
}

// Преподавательская часть — создание ссылок и результаты диагностики — живёт в
// web-admin: преподаватель работает там, а на сайт приходит вести сам урок.

// ── Класс преподавателя ──────────────────────────────────────────────────────
// Пробный урок ведётся в закреплённом за преподавателем ученическом аккаунте:
// приходящие входят в него по очереди обычным логином и паролем. Кабинета у
// этого аккаунта нет — только урок, поэтому признак решает не оформление, а
// куда человека вести после входа.

/**
 * Аккаунт класса? Читается из того же /user/me, что и демо-флаг (см.
 * getIsDemoAccount выше).
 *
 * Осечку (сеть промолчала или бэкенд отдал 5xx) от настоящего ответа отличаем
 * явно: осечка возвращает `null`, а не `false`. Раньше оба случая приезжали
 * одним и тем же false, и вызывающий не мог отличить «этот аккаунт точно не
 * класс» от «бэкенд не ответил» — а у аккаунта класса это разные судьбы:
 * подмена осечки на false уводила его на карту королевств, кабинета у него
 * нет, и вернуться оттуда было уже нечем (диплинк ?screen=booth сам выгоняет
 * не-класс на домашний экран). Вызывающий (applyBoothAccount в App.jsx) на
 * null не трогает ни state, ни снимок и сам решает, повторять ли попытку.
 *
 * Настоящий ответ бэкенда — success или любой статус младше 500 — даёт
 * boolean: успеха 404/401 на /user/me не бывает у валидного токена, но раз
 * бэкенд всё же ответил (пусть и ошибкой), это не «осечка сети», а
 * содержательное «нет данных», и читаем его как «не класс», как и раньше.
 */
export async function getIsBoothAccount(token) {
  if (!token) return false
  try {
    const data = await authGet('/user/me', token)
    // `!!`, а не голое значение: у обычного ученика поля в ответе нет вовсе, и
    // без приведения дальше поехало бы undefined. Дальше признак разветвляется в
    // трёх местах (homeScreenFor, страж кабинета, renderScreen), и «нет поля»
    // обязано стать false ЗДЕСЬ, один раз, — иначе каждое из трёх само решает,
    // как читать undefined, и они разъезжаются молча.
    //
    // Второе: канонический контракт обещает плоское булево. Если бэкенд когда-
    // нибудь отдаст на этом имени объект, `!!` даст true, и пришедший на пробный
    // попадёт в класс, а не в кабинет, которого у его аккаунта нет, — это
    // безопасная сторона отказа.
    return !!data?.boothAccount
  } catch (e) {
    // authGet бросает голый Error (без .status) на сетевой обрыв — там ответа
    // не было вовсе. 5xx до вызывающего долетает тем же статусом, что и обрыв
    // сети: бэкенд жив, но ответить не смог, — считаем это той же осечкой.
    if (!e.status || e.status >= 500) return null
    return false
  }
}

/**
 * Вход в класс: бэкенд сам заводит занятие и сеанс (или отдаёт уже открытые) и
 * возвращает { sessionId, lessonId, resumed }. Отдаём тело как есть, читает из
 * него экран — и читает только lessonId: sessionId нужен web-admin, а resumed
 * («вернули открытый сеанс, а не завели новый») ученику показывать нечего, для
 * него оба случая — это просто «урок открылся».
 *
 * Статус ошибки нужен экрану целиком, поэтому запрос написан руками, а не через
 * authPost: тот бросает ошибку без статуса, а по статусу как раз и различаются
 * два состояния — 403/404 «класс закрыт» (повторять нечего) и всё остальное
 * («преподаватель ещё не открыл класс», ждём и повторяем).
 */
export async function enterTrialBooth(token) {
  let res
  try {
    res = await fetch(`${BASE}/trial/booth/enter`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // Обрыв сети — не «класс закрыт»: статуса у такой ошибки нет вовсе, и экран
    // по его отсутствию уйдёт в ожидание с повтором. Ровно то, что нужно.
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    const err = new Error(`Не удалось войти в класс (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// ── Отчёты о прогрессе (Feedback) ───────────────────────────────────────────
// Контракт: docs/superpowers/specs/2026-10-20-feedback-reports-student-design.md, §3.
// Кабинет ученика — Bearer; ссылка из мессенджера — без входа: секрет ссылки и
// есть доступ, как у пробного урока (/trial/link/{token}).

// Веб вышел раньше бэкенда, а список спрашивает карточка «Главной» на каждом
// заходе: 404 (ручки ещё нет на этом стенде) помним на токен, как у
// getIeltsMe, иначе каждый заход ученика стоил бы бэкенду ошибки со стеком в
// логе. Остальные ошибки не помним — следующий заход спросит снова.
const _feedbackMissing = new Map()
const FEEDBACK_MISSING_RETRY_MS = 10 * 60 * 1000

export async function getFeedbackReports(token) {
  const until = _feedbackMissing.get(token)
  if (until && Date.now() < until) {
    const err = new Error('Ошибка сервера (404)')
    err.status = 404
    throw err
  }
  try {
    return await authGet('/mobile/feedback-reports', token)
  } catch (e) {
    if (e?.status === 404) _feedbackMissing.set(token, Date.now() + FEEDBACK_MISSING_RETRY_MS)
    throw e
  }
}

export function getFeedbackReport(token, id) {
  return authGet(`/mobile/feedback-reports/${encodeURIComponent(id)}`, token)
}

/** Ученик открыл отчёт в кабинете — снимает метку «Новый». */
export function markFeedbackReportSeen(token, id) {
  return authPost(`/mobile/feedback-reports/${encodeURIComponent(id)}/seen`, token, {})
}

/** Отчёт по ссылке из мессенджера. Ошибка несёт status: 404 — ссылки нет
 *  (или отчёт отозван), 0 — нет связи; экран различает «недействительна» и
 *  «попробуйте ещё раз» именно по нему. */
export async function getFeedbackReportByToken(linkToken) {
  let res
  try {
    res = await fetch(`${BASE}/feedback-reports/link/${encodeURIComponent(linkToken)}`, { cache: 'no-store' })
  } catch {
    const err = new Error('Нет связи с сервером. Проверьте интернет и попробуйте снова.')
    err.status = 0
    throw err
  }
  if (!res.ok) {
    const err = new Error(`Ошибка сервера (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

/** «Отчёт открыт» — отдельным POST после показа, а не побочным эффектом GET:
 *  мессенджеры сами ходят по ссылкам (предпросмотр), и GET ставил бы «открыт»
 *  без родителя. */
export async function markFeedbackReportOpened(linkToken) {
  const res = await fetch(`${BASE}/feedback-reports/link/${encodeURIComponent(linkToken)}/opened`, { method: 'POST' })
  if (!res.ok) {
    const err = new Error(`Ошибка сервера (${res.status})`)
    err.status = res.status
    throw err
  }
}

// Explicit account-bound acknowledgement of the immutable legal PDF bundle.
export const getLegalAcknowledgement = (token) => authGet('/user/legal-documents', token)
export const acceptLegalDocuments = (token, body) => authPut('/user/legal-documents', token, body)

// Post-lesson survey: 204 means there is no eligible lesson.
export async function getPendingLessonFeedback(token, signal) {
  const deadline = AbortSignal.timeout(15000)
  return authGet('/mobile/lesson-feedback/pending', token, { signal: signal ? AbortSignal.any([signal, deadline]) : deadline })
}

export function submitLessonFeedback(token, lessonId, answers) {
  return authPost(`/mobile/lesson-feedback/${encodeURIComponent(lessonId)}`, token, answers)
}
