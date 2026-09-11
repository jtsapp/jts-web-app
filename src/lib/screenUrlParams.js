/**
 * Какие параметры адреса соответствуют текущему экрану.
 *
 * Приложение — это state-машина внутри одной страницы Next, и адрес у неё
 * служебный: `?screen=` с необязательным id. Обновление страницы (F5) читает их
 * тем же путём, что и явный диплинк, поэтому экран обязан быть узнаваем по
 * адресу — иначе F5 посреди урока выбрасывает на главную (настоящая жалоба, из
 * которой это и выросло).
 *
 * Решение вынесено сюда из эффекта в App.jsx, потому что оно НЕ про эффект:
 * это чистая функция «экран плюс его runtime-id → параметры адреса», и ошибка в
 * ней стоит потерянного места, а поймать её в компоненте нечем.
 *
 * ПРАВИЛО ОДНО: служебный параметр живёт и умирает вместе со `screen`. Адрес без
 * своего id — тот же пустой экран, только с видом рабочей ссылки; поэтому
 * возвращаются ВСЕ ключи сразу, и null значит «стереть».
 *
 * @param screen      текущий экран state-машины
 * @param persists    открывается ли такой экран по адресу вообще
 *                    (PERSISTABLE_SCREENS в App.jsx)
 * @param liveLessonId   id живого урока — у экрана «Живой урок»
 * @param liveWorkspaceId id урока каталога — у экрана урока
 * @param workspaceCardId адрес карточки, заданной на дом
 * @returns `{ screen, live, catalog, card }`, где null — «этого параметра быть
 *          не должно»
 */
export function screenUrlParams({
  screen,
  persists,
  liveLessonId = null,
  liveWorkspaceId = null,
  workspaceCardId = null,
} = {}) {
  const params = { screen: null, live: null, catalog: null, card: null }

  const isLiveLesson = screen === 'live-lesson' && liveLessonId != null
  // Карточка урока, заданная на дом: на неё ведёт ссылка из домашней работы, и
  // F5 не должен ронять ученика на главную. В адрес едет ПОЛНЫЙ путь — урок
  // каталога плюс карточка; без обоих экран открылся бы демонстрационным
  // уроком, то есть чужим материалом. Ровно поэтому сам экран урока в
  // PERSISTABLE_SCREENS и не входит.
  const isCardWorkspace =
    screen === 'lesson-workspace' && Boolean(workspaceCardId) && liveWorkspaceId != null

  if (!(persists || isLiveLesson || isCardWorkspace)) return params

  params.screen = screen
  if (isLiveLesson) params.live = String(liveLessonId)
  if (isCardWorkspace) {
    params.catalog = String(liveWorkspaceId)
    params.card = String(workspaceCardId)
  }
  return params
}

/**
 * Привести адрес к этим параметрам. Возвращает `true`, если что-то изменилось.
 *
 * Отдельно от расчёта: сверка «уже так?» до записи — не украшение, а защита от
 * лишнего replaceState на каждый рендер.
 */
export function applyScreenUrlParams(url, params) {
  const entries = Object.entries(params)
  if (entries.every(([key, value]) => url.searchParams.get(key) === value)) return false
  for (const [key, value] of entries) {
    if (value == null) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  }
  return true
}
