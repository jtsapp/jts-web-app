// Задания домашней работы, пришедшие с живого урока.
//
// Преподаватель добавляет их прямо из урока, и бэкенд кладёт вопрос снимком —
// той же моделью, которой урок рисуется в рабочем пространстве. Поэтому здесь
// нет своего движка: вопрос заворачивается в practice-блок и отдаётся тому же
// PracticeBlock, что и на уроке. Все семь типов работают без единой правки.
//
// Ответы живут в localStorage, а не на сервере: места под них в схеме пока нет
// (у упражнения есть только флаги преподавателя), а терять уже введённое при
// перезагрузке страницы нельзя. Ключ — работа + упражнение, чтобы две разные
// домашки не путались между собой.
const KEY_PREFIX = 'hw-answers'

/** Упражнения-вопросы: у задачи из библиотеки снимка нет, её рисовать нечем. */
export function lessonExercises(hw) {
  return (hw?.exercises || []).filter((e) => e && e.question)
}

/** Синтетический practice-блок вокруг одного вопроса — контракт PracticeBlock. */
export function exerciseBlock(exercise) {
  return {
    type: 'practice',
    title: exercise.title || '',
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
