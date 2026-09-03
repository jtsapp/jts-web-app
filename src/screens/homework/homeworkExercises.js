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
 * Задания из раздела «Практика».
 *
 * У них нет снимка вопроса и быть не может: сам материал живёт в этом же
 * приложении статикой, а домашняя работа несёт только адрес юнита. Поэтому они
 * не попадают в {@link lessonExercises} и показываются своим списком — карточкой
 * со ссылкой в раздел, а не полем для ответа.
 *
 * Отозванные не показываем — по тому же правилу, что и задания с урока.
 */
export function practiceExercises(hw) {
  return (hw?.exercises || []).filter((e) => e && e.practiceArea && e.practiceUnitId != null && !e.revoked)
}

/**
 * В работе были задания, но показывать нечего — их отозвали.
 *
 * Отличать это от «заданий не было вовсе» обязательно: во втором случае работа
 * просто про файлы, а в первом ученик видел задания вчера и не должен решать,
 * что они пропали сами. Молча прятать секцию — значит оставить его в недоумении.
 */
export function revokedEverything(hw) {
  const все = (hw?.exercises || []).filter((e) => e && e.question)
  return все.length > 0 && все.every((e) => e.revoked)
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
 * Синтетический practice-блок вокруг одного вопроса — контракт PracticeBlock.
 *
 * В шапке — инструкция с урока («Listen. Choose the word you hear.»), ровно как
 * там: без неё ученик видит «🔊 Word 1» и четыре варианта, но не знает, что с ними
 * делать. Формулировку в шапку не ставим: её печатает сам вопрос, и получилась бы
 * вторая копия того же текста. У старых упражнений инструкции нет — шапки тоже.
 */
/**
 * Снимает удвоенный хвост в подписи.
 *
 * Уроки каталога собраны конвертером, который берёт подпись плитки текстом всей
 * строки — вместе с уже подставленным переводом, и перевод к тому моменту
 * подставлен дважды. В снимке остаётся «Japan Япония · ЖапонияЯпония · Жапония»,
 * и ученик читает мусор. Правим на чтении: сами данные уже разъехались, и
 * перезаливать из-за этого уровень никто не будет.
 *
 * Правило узкое: режем только если конец строки — это дважды подряд один и тот
 * же кусок, БЕЗ разделителя между копиями. «bye bye» так не пострадает (там
 * пробел), «ss» тоже (короче порога).
 */
export function dedupeTail(value) {
  const text = String(value ?? '').trim()
  const n = text.length
  for (let len = Math.floor(n / 2); len >= 3; len--) {
    const tail = text.slice(n - len)
    if (text.slice(n - 2 * len, n - len) === tail) return text.slice(0, n - len).trim()
  }
  return text
}

/**
 * Инструкция, которую стоит показать над заданием.
 *
 * У части упражнений в снимок попала не формулировка задания, а вступление
 * урока целиком («By the end you can say… How to study this lesson… About
 * 20–30 minutes…»), одинаковое для всех и обрезанное на полуслове. Печатать её
 * перед каждым вопросом — стена текста, в которой само задание теряется.
 *
 * Признак: вступление длинное и содержит методические обороты, которых в
 * формулировке задания не бывает. Не подошло — заголовка просто нет, как у
 * старых упражнений.
 */
const LESSON_PREAMBLE = /how to study this lesson|by the end you can|headphones on/i

export function readableInstruction(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (LESSON_PREAMBLE.test(text)) return ''
  // Формулировка задания — одна фраза. Всё длиннее пришло из тела урока.
  return text.length > 160 ? '' : text
}

/** Подписи внутри вопроса — те же данные, та же чистка. */
function cleanQuestion(question) {
  if (!question || typeof question !== 'object') return question
  const out = { ...question }
  if (Array.isArray(out.pairs)) {
    out.pairs = out.pairs.map((p) => ({ ...p, left: dedupeTail(p.left), right: dedupeTail(p.right) }))
  }
  if (Array.isArray(out.options)) out.options = out.options.map((o) => (typeof o === 'string' ? dedupeTail(o) : o))
  if (typeof out.prompt === 'string') out.prompt = dedupeTail(out.prompt)
  return out
}

export function exerciseBlock(exercise) {
  return {
    type: 'practice',
    title: readableInstruction(exercise.instruction),
    questions: [cleanQuestion(exercise.question)],
  }
}

/**
 * У ответа есть содержимое: пустая строка, пустой список и пустая карта пар —
 * это «ученик ничего не выбрал», а не ответ.
 *
 * Нужно в двух местах сразу: «Проверить» на нетронутом задании не должно
 * уезжать на сервер, а сдача работы — досылать только то, что действительно
 * решено. Ноль и false пустыми не считаем: их выбирают так же осознанно.
 */
export function isAnswered(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

/**
 * Ответы из черновика, которых ещё нет на сервере.
 *
 * Ответ уезжает преподавателю только по кнопке «Проверить» у каждого задания.
 * Ученик, который решил всё и нажал «Отправить на проверку», сдавал пустоту:
 * работа числилась сданной, а преподаватель видел «ученик ещё не отвечал».
 * Сдача — момент, когда обе картины обязаны сойтись, поэтому недосланное
 * собирается здесь и уходит перед сменой статуса.
 */
export function pendingAnswers(hw, draft) {
  const out = []
  for (const exercise of lessonExercises(hw)) {
    if (exercise.studentAnswer != null) continue
    const answer = draft?.[exercise.question.id]
    if (isAnswered(answer)) out.push({ exercise, answer })
  }
  return out
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
