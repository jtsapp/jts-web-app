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

/** Упражнения-вопросы: у задачи из библиотеки снимка нет, её рисовать нечем. */
export function lessonExercises(hw) {
  return (hw?.exercises || []).filter((e) => e && e.question)
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
 * Синтетический practice-блок вокруг одного вопроса — контракт PracticeBlock.
 *
 * В шапке — инструкция с урока («Listen. Choose the word you hear.»), ровно как
 * там: без неё ученик видит «🔊 Word 1» и четыре варианта, но не знает, что с ними
 * делать. Формулировку в шапку не ставим: её печатает сам вопрос, и получилась бы
 * вторая копия того же текста. У старых упражнений инструкции нет — шапки тоже.
 */
export function exerciseBlock(exercise) {
  return {
    type: 'practice',
    title: exercise.instruction || '',
    questions: [exercise.question],
  }
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
