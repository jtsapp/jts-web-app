// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { answersKey, dedupeTail, exerciseBatches, exerciseBlock, exerciseGroups, groupBlock, groupKey, isAnswered, lessonExercises, loadAnswers, pendingAnswers, readableInstruction, revokedEverything, saveAnswers } from './homeworkExercises.js'

describe('homeworkExercises', () => {
  beforeEach(() => localStorage.clear())

  it('берёт только упражнения со снимком вопроса', () => {
    const hw = { exercises: [
      { id: 1, taskId: 7, taskTitle: 'Из библиотеки' },
      { id: 2, question: { id: 'q1', type: 'choice', prompt: 'I ___ coffee', options: ['like'], answer: 'like' } },
    ] }

    const list = lessonExercises(hw)

    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(2)
  })

  it('не падает на работе без упражнений', () => {
    expect(lessonExercises(null)).toEqual([])
    expect(lessonExercises({})).toEqual([])
  })

  it('в шапку карточки идёт инструкция с урока, а не формулировка вопроса', () => {
    const exercise = {
      id: 3,
      title: 'I ___ coffee.',
      instruction: 'Listen. Choose the word you hear.',
      question: { id: 'q9', type: 'gap' },
    }

    const block = exerciseBlock(exercise)

    expect(block.type).toBe('practice')
    expect(block.title).toBe('Listen. Choose the word you hear.')
    expect(block.questions).toEqual([exercise.question])
  })

  it('у задания без инструкции шапки нет — пустой строкой её не рисуем', () => {
    expect(exerciseBlock({ id: 4, title: 'I ___ coffee.', question: { id: 'q1', type: 'gap' } }).title).toBe('')
  })

  it('ответы переживают перезагрузку и не путаются между работами', () => {
    saveAnswers(11, { q1: 'like' })
    saveAnswers(12, { q1: 'love' })

    expect(loadAnswers(11)).toEqual({ q1: 'like' })
    expect(loadAnswers(12)).toEqual({ q1: 'love' })
    expect(answersKey(11)).not.toBe(answersKey(12))
  })

  it('битое хранилище отдаёт пустые ответы, а не роняет экран', () => {
    localStorage.setItem(answersKey(5), '{не json')

    expect(loadAnswers(5)).toEqual({})
  })
})

describe('отправки', () => {
  const q = (id) => ({ id, type: 'choice', prompt: id, options: ['a'], answer: 'a' })

  it('задания одного нажатия идут одной группой, разных — разными', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'b1', addedAt: '2026-08-19T10:00:00', lessonTitle: 'Two hellos', question: q('q1') },
      { id: 2, batchId: 'b2', addedAt: '2026-08-20T10:00:00', lessonTitle: 'Coffee', question: q('q2') },
      { id: 3, batchId: 'b1', addedAt: '2026-08-19T10:00:00', lessonTitle: 'Two hellos', question: q('q3') },
    ] }

    const batches = exerciseBatches(hw)

    expect(batches).toHaveLength(2)
    expect(batches[0].exercises.map((e) => e.id)).toEqual([1, 3])
    expect(batches[0].lessonTitle).toBe('Two hellos')
  })

  it('порядок групп — по времени выдачи, чтобы список не прыгал после новой отправки', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'позже', addedAt: '2026-08-20T10:00:00', question: q('q1') },
      { id: 2, batchId: 'раньше', addedAt: '2026-08-18T10:00:00', question: q('q2') },
    ] }

    expect(exerciseBatches(hw).map((b) => b.key)).toEqual(['раньше', 'позже'])
  })

  it('задания без ключа отправки собираются по уроку, а не рассыпаются по одному', () => {
    const hw = { exercises: [
      { id: 1, catalogLessonId: 7, question: q('q1') },
      { id: 2, catalogLessonId: 7, question: q('q2') },
      { id: 3, catalogLessonId: 9, question: q('q3') },
    ] }

    const batches = exerciseBatches(hw)

    expect(batches).toHaveLength(2)
    expect(batches[0].exercises).toHaveLength(2)
  })
})

describe('отозванная выдача', () => {
  const q = (id) => ({ id, type: 'choice', prompt: id, options: ['a'], answer: 'a' })

  it('задания отозванной выдачи ученику не показываются', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'b1', question: q('q1') },
      { id: 2, batchId: 'b2', question: q('q2'), revoked: true },
    ] }

    expect(lessonExercises(hw).map((e) => e.id)).toEqual([1])
  })

  it('отозванная выдача исчезает из списка целиком, а не наполовину', () => {
    const hw = { exercises: [
      { id: 1, batchId: 'b1', lessonTitle: 'Осталась', question: q('q1') },
      { id: 2, batchId: 'b2', lessonTitle: 'Отозвана', question: q('q2'), revoked: true },
      { id: 3, batchId: 'b2', lessonTitle: 'Отозвана', question: q('q3'), revoked: true },
    ] }

    const batches = exerciseBatches(hw)

    expect(batches).toHaveLength(1)
    expect(batches[0].lessonTitle).toBe('Осталась')
  })
})

// Данные уроков каталога разъехались на этапе сборки: конвертер берёт подпись
// плитки текстом всей строки, а перевод к тому моменту подставлен дважды.
// Чиним на чтении — перезаливать уровень из-за этого никто не будет.
describe('dedupeTail — удвоенный хвост подписи', () => {
  it('снимает повтор перевода в паре сопоставления', () => {
    expect(dedupeTail('Japan Япония · ЖапонияЯпония · Жапония')).toBe('Japan Япония · Жапония')
    expect(dedupeTail('the USA США · АҚШСША · АҚШ')).toBe('the USA США · АҚШ')
    expect(dedupeTail('China Китай · ҚытайКитай · Қытай')).toBe('China Китай · Қытай')
  })

  it('не трогает то, что повтором не является', () => {
    expect(dedupeTail('Japan Япония · Жапония')).toBe('Japan Япония · Жапония')
    expect(dedupeTail('Brazilian')).toBe('Brazilian')
    // Повтор через разделитель — это не склейка, а нормальный текст.
    expect(dedupeTail('bye bye')).toBe('bye bye')
    // Короткие варианты ответа резать нельзя: «ss» — валидный вариант.
    expect(dedupeTail('ss')).toBe('ss')
    expect(dedupeTail('es')).toBe('es')
  })

  it('пустое и мусорное переживает', () => {
    expect(dedupeTail(null)).toBe('')
    expect(dedupeTail(undefined)).toBe('')
    expect(dedupeTail('   ')).toBe('')
  })
})

describe('readableInstruction — что показывать над заданием', () => {
  it('формулировку задания показывает', () => {
    expect(readableInstruction('Listen. Choose the country you hear.')).toBe('Listen. Choose the country you hear.')
    expect(readableInstruction('Match the country to the nationality.')).toBe('Match the country to the nationality.')
  })

  it('вступление урока прячет — оно одинаково у всех заданий и обрезано', () => {
    const preamble = "By the end you can say where you're from and your nationality, and use to be (I'm, he isn't, they aren't). How to study this lesson • About 20–30 minutes."
    expect(readableInstruction(preamble)).toBe('')
    expect(readableInstruction('How to study this lesson • Headphones on. Say your answers out loud.')).toBe('')
  })

  it('слишком длинное прячет даже без методических оборотов', () => {
    expect(readableInstruction('а'.repeat(200))).toBe('')
  })

  it('пустое остаётся пустым', () => {
    expect(readableInstruction(null)).toBe('')
  })
})

describe('exerciseBlock — чистит и подпись, и пары', () => {
  it('пары сопоставления приходят читаемыми, вступление не печатается', () => {
    const block = exerciseBlock({
      instruction: 'How to study this lesson • About 20–30 minutes.',
      question: {
        id: 'q1',
        type: 'match',
        pairs: [{ left: 'Japan Япония · ЖапонияЯпония · Жапония', right: 'Japanese' }],
      },
    })
    expect(block.title).toBe('')
    expect(block.questions[0].pairs[0].left).toBe('Japan Япония · Жапония')
    expect(block.questions[0].pairs[0].right).toBe('Japanese')
  })
})

// Правило отбора решает, что уедет преподавателю при сдаче работы: ошибка здесь
// тихо теряет ответы — ровно та беда, которую эти хелперы и чинят.
describe('isAnswered', () => {
  it('пустое — это отсутствие выбора, а не ответ', () => {
    for (const пусто of [null, undefined, '', '   ', [], {}]) expect(isAnswered(пусто)).toBe(false)
  })

  it('ноль и false выбраны так же осознанно, как любой вариант', () => {
    for (const ответ of [0, false, '0', ['a'], { a: 'b' }, 'like']) expect(isAnswered(ответ)).toBe(true)
  })
})

describe('pendingAnswers', () => {
  const q = (id) => ({ id, type: 'choice', prompt: 'A?', options: ['a', 'b'], answer: 'a' })

  it('собирает решённое, чего ещё нет на сервере', () => {
    const hw = { exercises: [{ id: 1, question: q('q1') }, { id: 2, question: q('q2') }] }

    const pending = pendingAnswers(hw, { q1: 'a', q2: 'b' })

    expect(pending.map((p) => [p.exercise.id, p.answer])).toEqual([[1, 'a'], [2, 'b']])
  })

  it('уже сохранённое на сервере не пересылает', () => {
    const hw = { exercises: [{ id: 1, question: q('q1'), studentAnswer: 'a' }] }

    expect(pendingAnswers(hw, { q1: 'a' })).toEqual([])
  })

  it('пустое в черновике не считается решённым', () => {
    const hw = { exercises: [{ id: 1, question: q('q1') }, { id: 2, question: q('q2') }] }

    expect(pendingAnswers(hw, { q1: '', q2: undefined })).toEqual([])
  })

  it('отозванные и задачи из библиотеки не в счёт', () => {
    const hw = { exercises: [
      { id: 1, question: q('q1'), revoked: true },
      { id: 2, taskId: 7, taskTitle: 'Из библиотеки' },
    ] }

    expect(pendingAnswers(hw, { q1: 'a' })).toEqual([])
  })

  it('пустой черновик не роняет отбор', () => {
    expect(pendingAnswers({ exercises: [{ id: 1, question: q('q1') }] }, null)).toEqual([])
    expect(pendingAnswers(null, { q1: 'a' })).toEqual([])
  })
})

describe('отозванная выдача', () => {
  const задание = (over = {}) => ({ id: 1, question: { type: 'gap', answers: ['a'] }, ...over })

  it('всё отозвано — это не то же самое, что заданий не было', () => {
    expect(revokedEverything({ exercises: [задание({ revoked: true })] })).toBe(true)
    // Заданий не было вовсе — работа просто про файлы, объяснять нечего.
    expect(revokedEverything({ exercises: [] })).toBe(false)
    expect(revokedEverything({})).toBe(false)
  })

  it('отозвали часть — секция остаётся, подписи нет', () => {
    expect(revokedEverything({
      exercises: [задание({ id: 1, revoked: true }), задание({ id: 2 })]
    })).toBe(false)
  })

  it('отозванные не попадают в список заданий', () => {
    const hw = { exercises: [задание({ id: 1, revoked: true }), задание({ id: 2 })] }
    expect(lessonExercises(hw).map((e) => e.id)).toEqual([2])
  })
})

// Задания одного типа — одной карточкой.
//
// На настоящей работе преподаватель добавляет с урока весь блок разом: восемь
// десятков заданий превращались в восемь десятков карточек с одинаковой
// инструкцией во весь экран и восемью десятками кнопок «Проверить».
describe('exerciseGroups — задания одной формулировки в одной карточке', () => {
  const ex = (id, type, instruction) => ({
    id,
    instruction,
    question: { id: `q${id}`, type },
  })

  it('одинаковый тип и инструкция — одна группа', () => {
    const groups = exerciseGroups([
      ex(1, 'gap', 'Build the word.'),
      ex(2, 'gap', 'Build the word.'),
      ex(3, 'gap', 'Build the word.'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].exercises.map((e) => e.id)).toEqual([1, 2, 3])
  })

  it('та же инструкция, но другой тип — разные группы', () => {
    // У пропуска и у выбора разный разбор: под одну кнопку «Проверить» их
    // класть нельзя, даже когда формулировка совпала слово в слово.
    const groups = exerciseGroups([
      ex(1, 'gap', 'Choose the answer.'),
      ex(2, 'choice', 'Choose the answer.'),
    ])
    expect(groups).toHaveLength(2)
  })

  it('порядок групп — по первому появлению, не по числу заданий', () => {
    const groups = exerciseGroups([
      ex(1, 'choice', 'Pick one.'),
      ex(2, 'gap', 'Build the word.'),
      ex(3, 'gap', 'Build the word.'),
    ])
    expect(groups.map((g) => g.title)).toEqual(['Pick one.', 'Build the word.'])
  })

  it('вступление урока вместо инструкции не дробит карточки', () => {
    // readableInstruction выбрасывает такие тексты, и без общего ключа каждое
    // задание снова стало бы своей карточкой — ровно то, от чего уходим.
    const preamble = 'How to study this lesson. About 20–30 minutes. Headphones on.'
    const groups = exerciseGroups([ex(1, 'gap', preamble), ex(2, 'gap', preamble)])
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('')
  })

  it('карточка группы несёт все вопросы и одну подпись', () => {
    const block = groupBlock(exerciseGroups([
      ex(1, 'gap', 'Build the word.'),
      ex(2, 'gap', 'Build the word.'),
    ])[0])
    expect(block.type).toBe('practice')
    expect(block.title).toBe('Build the word.')
    expect(block.questions.map((q) => q.id)).toEqual(['q1', 'q2'])
  })

  it('ключ группы опознаёт её по первому заданию', () => {
    const groups = exerciseGroups([ex(7, 'gap', 'A'), ex(8, 'gap', 'A'), ex(9, 'gap', 'B')])
    expect(groupKey(groups[0])).toBe('hw-7')
    expect(groupKey(groups[1])).toBe('hw-9')
    expect(groupKey(groups[0])).not.toBe(groupKey(groups[1]))
  })
})
