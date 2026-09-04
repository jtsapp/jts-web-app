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

async function authGet(path, token) {
  let res
  try {
    res = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch (e) {
    throw new Error('Нет связи с сервером.')
  }
  if (!res.ok) {
    // Код нужен вызывающему: 404 у профильных полей означает «не заполнено»,
    // а не поломку — отличать это от сетевой осечки приходится по нему.
    const err = new Error(`Ошибка сервера (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
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
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
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
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
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

export function getMyMaterialAssignments(token) {
  return authGet('/student/assignments', token)
}

// Интерактив с проверкой открывается только при живой сессии — без неё
// ответы из открытой вкладки не дойдут до преподавателя. Повторный вызов
// возвращает уже существующую сессию, так что дёргать можно при каждом открытии.
export function startMaterialAssignment(token, assignmentId) {
  return authPost(`/student/assignments/${assignmentId}/start`, token)
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
const CATALOG_CACHE_VER = 'v1' // поднять при несовместимой смене формы ответа

// RAM-кэш на сессию вкладки: тяжёлые ответы (scopes словаря) часто не
// помещаются в localStorage — без Map повторный заход в том же табе снова
// ждал бы сеть. localStorage остаётся для переживания перезагрузки.
const memoryCatalogCache = new Map()

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
  let cached = memoryCatalogCache.has(key) ? memoryCatalogCache.get(key) : null
  if (cached === null) {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) cached = JSON.parse(raw)
    } catch {
      /* битый кэш → обычный сетевой запрос */
    }
  }
  const refresh = () =>
    authGet(path, token).then((data) => {
      memoryCatalogCache.set(key, data)
      try {
        window.localStorage.setItem(key, JSON.stringify(data))
      } catch {
        /* квота localStorage исчерпана — RAM-кэш всё равно держит ответ */
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

function dropCachedAuthGet(path, token) {
  if (typeof window === 'undefined') return
  const key = catalogCacheKey(path, token)
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

// Структура урока, разобранная один раз при регистрации уровня и сохранённая на
// бэкенде. content === null — структуры нет, урок открывается как файл (fileUrl).
// SWR-кэш: повторное открытие того же урока в сессии не ждёт сеть (RAM;
// localStorage часто не тянет размер content_json).
export function getCourseCatalogLessonContent(id, token, onFresh) {
  return cachedAuthGet(`/mobile/course-catalog/lessons/${id}/content`, token, onFresh)
}

// Расписание вошедшего пользователя. Бэкенд скоупит /admin/lessons* под личность
// токена: ученик/учитель получают только СВОИ занятия (чужие → 400).
export function getMyLessonOccurrences(token) {
  return authGet('/admin/lessons/occurrences', token)
}

export function getLessonsSummary(token) {
  return authGet('/admin/lessons/summary', token)
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
 */
export function assignPracticeUnits(token, lessonId, { area, units, batchId }) {
  return authPut(`/admin/homework/lesson/${lessonId}/exercises/from-practice`, token, {
    area,
    units,
    batchId,
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
// (нужно студенту, догоняющему учителя через follow=1). Nonce обязан быть
// ДЕТЕРМИНИРОВАННЫМ от значения forceReload (а не Date.now()) - иначе src
// меняется на каждый ре-рендер SectionMaterialFrame (например от полинга
// "учитель начал урок" раз в 5с), и браузер молча перезагружает iframe весь
// остаток урока, обнуляя непереживший дебаунс прогресс студента.
export function lessonMaterialRenderUrl(lessonId, materialId, token, { mode = 'live', follow = false, forceReload, studentId } = {}) {
  const params = new URLSearchParams({ mode, access_token: token || '' })
  if (follow) params.set('follow', '1')
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
export function getAudiobooks(token) {
  return cachedAuthGet('/mobile/audio-lessons', token)
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

// Шаг 3 регистрации (после того как собрали номер и почту — см.
// RegisterPhonePage/RegisterEmailPage): отправляет оба идентификатора сразу.
// Бэкенд шлёт код на почту, когда она есть (RegistrationService: email
// предпочтительнее телефона как канал OTP при обоих полях) — таков порядок
// веб-формы: номер → почта → код на почту → пароль. Если телефон или почта
// уже заняты — не уводим молча в вход, а помечаем ошибку кодом USER_EXISTS.
export async function sendRegistrationOtp(name, phone, email, birthDate) {
  try {
    await post('/registration/initiate', {
      name: name || 'Гость',
      phone: normalizePhone(phone),
      email,
      birthDate,
    })
    return 'register'
  } catch (e) {
    if ((e.message || '').toLowerCase().includes('exist')) {
      e.code = 'USER_EXISTS'
    }
    throw e
  }
}

// Шаг 4: проверка кода, присланного на почту. Создаёт пользователя сразу с
// обоими идентификаторами и возвращает accessToken/refreshToken (см.
// RegistrationVerifyResponse на бэкенде) — отдельного входа после регистрации
// больше не требуется.
export async function verifyRegistrationOtp(name, phone, email, code, birthDate) {
  return post('/registration/verify', {
    name: name || 'Гость',
    phone: normalizePhone(phone),
    email,
    birthDate,
    otp: code,
  })
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
      .then((res) => {
        const tok = res?.accessToken || null
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

// Один караоке-трек (GET /mobile/karaoke/{id}). Нужен на случай диплинка и
// перезагрузки экрана исполнения: карточка каталога к этому моменту может быть
// уже не в памяти.
export function getKaraokeTrack(token, id) {
  return authGet(`/mobile/karaoke/${encodeURIComponent(id)}`, token)
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

export function listLessonVocab(token, onFresh) {
  return cachedAuthGet('/mobile/lesson-vocab', token, onFresh)
}

function isSavedVocabRef(lessonId) {
  return lessonId == null || lessonId === '' || lessonId === 'saved' || lessonId === 'SAVED'
}

export function openLessonVocab(lessonId, token, onFresh) {
  const path = isSavedVocabRef(lessonId)
    ? '/mobile/lesson-vocab/saved'
    : `/mobile/lesson-vocab/${encodeURIComponent(lessonId)}`
  return cachedAuthGet(path, token, onFresh)
}

export function completeLessonVocabCycle(lessonId, cycle, results, token) {
  const path = isSavedVocabRef(lessonId)
    ? `/mobile/lesson-vocab/saved/cycles/${encodeURIComponent(cycle)}`
    : `/mobile/lesson-vocab/${encodeURIComponent(lessonId)}/cycles/${encodeURIComponent(cycle)}`
  return authPost(path, token, { results }).then((data) => {
    dropCachedAuthGet('/mobile/lesson-vocab', token)
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
  if (!res.ok) throw new Error(`Не удалось сохранить слово (${res.status})`)
  dropCachedAuthGet('/mobile/lesson-vocab', token)
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

// Демо-статус аккаунта (GET /user/me, Bearer) — решает, показывать ли на
// экранах «лимит исчерпан» демо-CTA со ссылкой на WhatsApp или обычный текст:
// лимит может быть и не демо-природы (персональный override от менеджера).
// При сетевой осечке считаем аккаунт не демо — это не критично (просто не
// покажем CTA), а не наоборот.
export async function getIsDemoAccount(token) {
  if (!token) return false
  try {
    const data = await authGet('/user/me', token)
    return !!data?.isDemoAccount
  } catch {
    return false
  }
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
