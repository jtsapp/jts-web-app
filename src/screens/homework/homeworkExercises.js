// Задания домашней работы, пришедшие с живого урока.
//
// Преподаватель добавляет их прямо из урока, и бэкенд кладёт вопрос снимком —
// той же моделью, которой урок рисуется в рабочем пространстве. Поэтому здесь
// нет своего движка: вопрос заворачивается в practice-блок и отдаётся тому же
// PracticeBlock, что и на уроке. Все семь типов работают без единой правки.
//
// Ответы уходят на сервер по «Проверить» — там их видит преподаватель. До этого
// момента введённое лежит в localStorage: черновик не должен теряться при
// перезагрузке, а слать на сервер каждое нажатие клавиши незачем. Ключ — работа,
// чтобы две разные домашки не путались между собой.
const KEY_PREFIX = 'hw-answers'

/**
 * Упражнения-вопросы: у задачи из библиотеки снимка нет, её рисовать нечем.
 *
 * Отозванные не показываем: преподаватель отзывает выдачу целиком, когда задал не то
 * или не тем, и ученик не должен видеть её ни в списке, ни в счётчике. Это флаг самой
 * выдачи, а не персональная пометка «скрыть от ученика».
 */
export function lessonExercises(hw) {
  return (hw?.exercises || []).filter((e) => e && e.question && !e.revoked)
}

/**
 * Отправки: задания, добавленные преподавателем за одно нажатие, идут одной группой.
 *
 * Без этого несколько отправок сливались в одну кучу — «5 из 85 решено» без понимания,
 * что задано вчера, а что сегодня и с какого урока. Порядок групп — по времени
 * отправки: сверху то, что задали раньше, чтобы список не прыгал после новой выдачи.
 *
 * Задания, добавленные до появления отправок, ключа не имеют — они собираются в одну
 * группу по уроку, иначе каждое стало бы отдельной секцией.
 */
export function exerciseBatches(hw) {
  const groups = new Map()
  for (const e of lessonExercises(hw)) {
    const key = e.batchId || `legacy-${e.catalogLessonId ?? 'none'}`
    const group = groups.get(key) || { key, addedAt: e.addedAt || null, lessonTitle: e.lessonTitle || '', exercises: [] }
    group.exercises.push(e)
    if (!group.addedAt && e.addedAt) group.addedAt = e.addedAt
    if (!group.lessonTitle && e.lessonTitle) group.lessonTitle = e.lessonTitle
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => String(a.addedAt || '').localeCompare(String(b.addedAt || '')))
}

/** Ответы, уже сохранённые на сервере, — по ним экран открывается после перезахода. */
export function serverAnswers(hw) {
  const out = {}
  for (const e of lessonExercises(hw)) {
    if (e.studentAnswer != null) out[e.question.id] = e.studentAnswer
  }
  return out
}

/**
 * Задания отправки, собранные в карточки по инструкции.
 *
 * Урок задаёт вопросы пачками под одной формулировкой («Build the word. Type the
 * missing form.»), а на экране каждый становился отдельной карточкой — и четыре
 * задания подряд повторяли одну и ту же шапку во весь экран, с четырьмя кнопками
 * «Проверить». Собираем их обратно: одна инструкция — одна карточка со списком
 * вопросов, как в самом уроке.
 *
 * Ключ группы — тип вопроса вместе с инструкцией: у пропуска и у выбора разный
 * разбор, и под одну кнопку их класть нельзя, даже когда формулировка совпала.
 * Порядок карточек — по первому вопросу группы: восстанавливать порядок урока,
 * перескакивая по списку, ученику незачем.
 */
export function exerciseGroups(exercises) {
  const groups = new Map()
  for (const e of exercises || []) {
    const key = `${e.question?.type || 'none'}|${e.instruction || ''}`
    const group = groups.get(key) || { key, instruction: e.instruction || '', exercises: [] }
    group.exercises.push(e)
    groups.set(key, group)
  }
  return [...groups.values()]
}

/**
 * Practice-блок вокруг группы — контракт PracticeBlock.
 *
 * В шапке — инструкция с урока («Listen. Choose the word you hear.»), ровно как
 * там: без неё ученик видит «🔊 Word 1» и четыре варианта, но не знает, что с ними
 * делать. Формулировку в шапку не ставим: её печатает сам вопрос, и получилась бы
 * вторая копия того же текста. У старых упражнений инструкции нет — шапки тоже.
 */
export function groupBlock(group) {
  return {
    type: 'practice',
    title: group.instruction || '',
    questions: group.exercises.map((e) => e.question),
  }
}

/**
 * Ответил ли ученик — по нему решается, что отправлять преподавателю.
 *
 * В карточке теперь несколько вопросов, и одна кнопка «Проверить» на всю группу.
 * Отправлять нетронутые вопросы нельзя: преподаватель увидел бы их неверными,
 * хотя ученик до них не дошёл. Пустой ответ у каждого типа свой — строка у
 * пропуска, список у порядка, карта пар у соединения.
 */
export function hasAnswer(value) {
  if (value == null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export function answersKey(homeworkId) {
  return `${KEY_PREFIX}:${homeworkId}`
}

export function loadAnswers(homeworkId) {
  try {
    const raw = localStorage.getItem(answersKey(homeworkId))
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveAnswers(homeworkId, answers) {
  try {
    localStorage.setItem(answersKey(homeworkId), JSON.stringify(answers))
  } catch {
    // Приватный режим или переполненное хранилище — ответы просто не переживут
    // перезагрузку. Ронять из-за этого экран домашней работы нельзя.
  }
}
