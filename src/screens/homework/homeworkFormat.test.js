import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { answeredExercises, boardStateKey, canAttach, canSubmit, fileExtension, homeworkStateKey, isAllowedFile, isOverdue, pendingCount, reviewOrder, studentOrder } from './homeworkFormat.js'

const hw = (over = {}) => ({ id: 1, status: 'ASSIGNED', submissions: [], materials: [], ...over })

describe('файлы ответа', () => {
  it('расширение читается из имени и из ссылки', () => {
    expect(fileExtension('answer.JPG')).toBe('jpg')
    expect(fileExtension('https://files.example/hw/answer.pdf?token=abc')).toBe('pdf')
    expect(fileExtension('answer')).toBeNull()
  })

  it('принимаются только фото и PDF — то же, что и на бэкенде', () => {
    expect(isAllowedFile('скан.png')).toBe(true)
    expect(isAllowedFile('решение.jpeg')).toBe(true)
    expect(isAllowedFile('работа.pdf')).toBe(true)
    expect(isAllowedFile('работа.docx')).toBe(false)
    expect(isAllowedFile('')).toBe(false)
  })
})

describe('homeworkStateKey', () => {
  const now = new Date(2026, 7, 20, 12, 0, 0)

  it('несданная работа с прошедшим дедлайном — просрочена', () => {
    expect(homeworkStateKey(hw({ dueDate: '2026-08-18' }), now)).toBe('overdue')
  })

  // Дедлайн — это дата, а не момент: до конца дня работу ещё принимают.
  it('в день дедлайна работа ещё не просрочена', () => {
    expect(homeworkStateKey(hw({ dueDate: '2026-08-20' }), now)).toBe('assigned')
  })

  it('сданное и проверенное просроченным не считается', () => {
    expect(homeworkStateKey(hw({ status: 'SUBMITTED', dueDate: '2026-08-01' }), now)).toBe('submitted')
    expect(homeworkStateKey(hw({ status: 'COMPLETED', dueDate: '2026-08-01' }), now)).toBe('completed')
    expect(isOverdue(hw({ status: 'COMPLETED', dueDate: '2026-08-01' }), now)).toBe(false)
  })

  it('возврат на доработку — свой статус', () => {
    expect(homeworkStateKey(hw({ status: 'NEEDS_REVISION' }), now)).toBe('needsRevision')
  })

  // Регрессия: IN_REVIEW не разбирался вовсе и проваливался в default. Работа,
  // которую преподаватель взял к себе, снова читалась ученику как «Задано», а с
  // прошедшим сроком — как «Просрочено», хотя сдавать в ней уже нечего.
  it('взятая преподавателем в проверку — та же «На проверке», а не заданная', () => {
    expect(homeworkStateKey(hw({ status: 'IN_REVIEW' }), now)).toBe('submitted')
    expect(homeworkStateKey(hw({ status: 'IN_REVIEW', dueDate: '2026-08-01' }), now)).toBe('submitted')
    expect(isOverdue(hw({ status: 'IN_REVIEW', dueDate: '2026-08-01' }), now)).toBe(false)
  })

  // Преподаватель закрыл работу, которую ученик не сдавал: «Проверено» тут врёт —
  // его ответа никто не видел, а экран у такой работы пустой.
  it('закрытая без сдачи работа подписана не «проверено»', () => {
    expect(homeworkStateKey(hw({ status: 'COMPLETED', closedWithoutSubmission: true }), now))
      .toBe('closedNoSubmission')
  })

  it('проверенная работа остаётся проверенной', () => {
    expect(homeworkStateKey(hw({ status: 'COMPLETED', closedWithoutSubmission: false }), now))
      .toBe('completed')  })
})

describe('что ученику можно делать', () => {
  it('файлы редактируются, только пока работа у ученика', () => {
    expect(canAttach(hw())).toBe(true)
    expect(canAttach(hw({ status: 'NEEDS_REVISION' }))).toBe(true)
    // Сданная работа зафиксирована — оценка встаёт под тем составом файлов,
    // который видел преподаватель (то же правило на бэкенде).
    expect(canAttach(hw({ status: 'SUBMITTED' }))).toBe(false)
    expect(canAttach(hw({ status: 'COMPLETED' }))).toBe(false)
    expect(canAttach(null)).toBe(false)
  })

  it('отправлять нечего, пока не приложен файл', () => {
    expect(canSubmit(hw())).toBe(false)
    expect(canSubmit(hw({ submissions: [{ id: 1 }] }))).toBe(true)
  })

  it('повторно отправлять уже отправленное нельзя', () => {
    expect(canSubmit(hw({ status: 'SUBMITTED', submissions: [{ id: 1 }] }))).toBe(false)
  })

  it('взятую в проверку работу тоже не тронуть', () => {
    expect(canAttach(hw({ status: 'IN_REVIEW' }))).toBe(false)
    expect(canSubmit(hw({ status: 'IN_REVIEW', submissions: [{ id: 1 }] }))).toBe(false)
  })
})

describe('reviewOrder', () => {
  // Список преподавателя сортируется по тому, чья очередь действовать.
  it('сданные работы идут раньше заданных, проверенные — последними', () => {
    const order = ['COMPLETED', 'NEEDS_REVISION', 'ASSIGNED', 'SUBMITTED']
      .map((status) => ({ status }))
      .sort((a, b) => reviewOrder(a) - reviewOrder(b))
      .map((x) => x.status)
    expect(order).toEqual(['SUBMITTED', 'ASSIGNED', 'NEEDS_REVISION', 'COMPLETED'])
  })

  // Тот же порядок, что и на сервере: сначала то, что преподаватель не открывал,
  // потом то, что уже взял к себе, и только потом нетронутые задания.
  it('взятая в проверку стоит между сданной и нетронутой', () => {
    const order = ['COMPLETED', 'ASSIGNED', 'IN_REVIEW', 'SUBMITTED']
      .map((status) => ({ status }))
      .sort((a, b) => reviewOrder(a) - reviewOrder(b))
      .map((x) => x.status)
    expect(order).toEqual(['SUBMITTED', 'IN_REVIEW', 'ASSIGNED', 'COMPLETED'])
  })

  // Было наоборот: незнакомому статусу подставлялся вес ASSIGNED, и работа с
  // ним всплывала в начале доски. Отсутствие работы — не то же самое: там вес
  // остался прежним.
  it('незнакомый статус уезжает за все известные, пустая работа — нет', () => {
    expect(reviewOrder({ status: 'WAT' })).toBeGreaterThan(reviewOrder({ status: 'COMPLETED' }))
    expect(reviewOrder(null)).toBe(reviewOrder({ status: 'ASSIGNED' }))
  })
})

// Ученик и преподаватель читают IN_REVIEW по-разному, и это намеренно: ученику
// важно «работа у преподавателя», преподавателю — «эту я уже взял».
describe('boardStateKey — доска преподавателя', () => {
  const now = new Date(2026, 7, 20, 12, 0, 0)

  it('взятая в проверку отличается от просто сданной', () => {
    expect(boardStateKey(hw({ status: 'IN_REVIEW' }), now)).toBe('inReview')
    expect(boardStateKey(hw({ status: 'SUBMITTED' }), now)).toBe('submitted')
    // А ученику — по-прежнему одно и то же.
    expect(homeworkStateKey(hw({ status: 'IN_REVIEW' }), now)).toBe('submitted')
  })

  it('остальные статусы читаются так же, как у ученика', () => {
    expect(boardStateKey(hw({ status: 'COMPLETED' }), now)).toBe('completed')
    expect(boardStateKey(hw({ status: 'NEEDS_REVISION' }), now)).toBe('needsRevision')
    expect(boardStateKey(hw({ dueDate: '2026-08-18' }), now)).toBe('overdue')
    expect(boardStateKey(null, now)).toBe('assigned')
  })
})

describe('studentOrder', () => {
  // Список ученика: сверху то, что ждёт его действий, внизу — проверенное.
  it('возврат на доработку первее заданного, проверенное — последним', () => {
    const order = ['COMPLETED', 'SUBMITTED', 'ASSIGNED', 'NEEDS_REVISION']
      .map((status) => ({ status }))
      .sort((a, b) => studentOrder(a) - studentOrder(b))
      .map((x) => x.status)
    expect(order).toEqual(['NEEDS_REVISION', 'ASSIGNED', 'SUBMITTED', 'COMPLETED'])
  })

  it('взятая в проверку лежит там же, где сданная', () => {
    expect(studentOrder({ status: 'IN_REVIEW' })).toBe(studentOrder({ status: 'SUBMITTED' }))
    const order = ['COMPLETED', 'IN_REVIEW', 'ASSIGNED', 'NEEDS_REVISION']
      .map((status) => ({ status }))
      .sort((a, b) => studentOrder(a) - studentOrder(b))
      .map((x) => x.status)
    expect(order).toEqual(['NEEDS_REVISION', 'ASSIGNED', 'IN_REVIEW', 'COMPLETED'])
  })

  it('незнакомый статус уезжает в конец, а не в группу «твоя очередь»', () => {
    expect(studentOrder({ status: 'WAT' })).toBeGreaterThan(studentOrder({ status: 'COMPLETED' }))
    expect(studentOrder(null)).toBe(studentOrder({ status: 'ASSIGNED' }))
  })
})

describe('pendingCount', () => {
  it('считает только то, что ждёт ученика', () => {
    const list = [
      hw({ id: 1, status: 'ASSIGNED' }),
      hw({ id: 2, status: 'NEEDS_REVISION' }),
      hw({ id: 3, status: 'SUBMITTED' }),
      hw({ id: 4, status: 'COMPLETED' }),
    ]
    expect(pendingCount(list)).toBe(2)
    expect(pendingCount([])).toBe(0)
    expect(pendingCount(null)).toBe(0)
  })
})

// Регрессия: домашка, собранная из заданий урока, файлов не имеет вовсе.
// Условие «есть прикреплённый файл» запирало её навсегда — ученик решал всё
// подряд, а «Отправить на проверку» оставалась мёртвой.
describe('canSubmit — есть ли что сдавать', () => {
  const open = (extra) => ({ status: 'ASSIGNED', submissions: [], exercises: [], ...extra })

  it('прикреплённый файл по-прежнему даёт сдать', () => {
    expect(canSubmit(open({ submissions: [{ fileName: 'a.pdf', url: '/a' }] }))).toBe(true)
  })

  it('решённое задание урока тоже даёт сдать — файла у такой работы нет', () => {
    expect(canSubmit(open({
      exercises: [{ question: { id: 'q1' }, studentAnswer: 'is' }],
    }))).toBe(true)
  })

  it('не требует решить ВСЕ: одно неотвечаемое не должно запирать работу', () => {
    expect(canSubmit(open({
      exercises: [
        { question: { id: 'q1' }, studentAnswer: 'is' },
        { question: { id: 'q2' }, studentAnswer: null },
      ],
    }))).toBe(true)
  })

  it('ничего не сделано — сдавать нечего', () => {
    expect(canSubmit(open({ exercises: [{ question: { id: 'q1' }, studentAnswer: null }] }))).toBe(false)
    expect(canSubmit(open())).toBe(false)
  })

  it('отозванное задание не считается сделанным', () => {
    expect(canSubmit(open({
      exercises: [{ question: { id: 'q1' }, studentAnswer: 'is', revoked: true }],
    }))).toBe(false)
  })

  it('уже сданную сдать нельзя', () => {
    expect(canSubmit(open({
      status: 'SUBMITTED',
      exercises: [{ question: { id: 'q1' }, studentAnswer: 'is' }],
    }))).toBe(false)
  })
})

describe('счётчик «ждут тебя» и отзыв', () => {
  const задание = (over = {}) => ({ id: 1, question: { type: 'gap', answers: ['a'] }, ...over })

  it('работа, из которой всё отозвали, ученика не ждёт', () => {
    // Сделать в ней нельзя ничего: заданий нет, приложить нечего.
    const пустая = { status: 'ASSIGNED', exercises: [задание({ revoked: true })], materials: [] }
    expect(pendingCount([пустая])).toBe(0)
  })

  it('но если есть что приложить — ждёт', () => {
    const сФайлом = {
      status: 'ASSIGNED',
      exercises: [задание({ revoked: true })],
      materials: [{ id: 1, fileName: 'task.pdf' }]
    }
    expect(pendingCount([сФайлом])).toBe(1)
  })

  it('обычная работа считается как раньше', () => {
    expect(pendingCount([{ status: 'ASSIGNED', exercises: [задание()] }])).toBe(1)
    expect(pendingCount([{ status: 'SUBMITTED', exercises: [задание()] }])).toBe(0)
    // Взятая преподавателем работа ученика тоже не ждёт.
    expect(pendingCount([{ status: 'IN_REVIEW', exercises: [задание()] }])).toBe(0)
  })
})

// Регрессия наперёд, ровно той же формы, что и уже починенный IN_REVIEW: бэкенд
// вырастил пятый статус, а клиент месяцами читал его как «Задано» — предлагал
// загрузку и сдачу там, где сделать было нечего. Шестой (CANCELLED, ARCHIVED —
// какой угодно) обязан деградировать в другую сторону.
describe('статус, которого клиент не знает', () => {
  const now = new Date(2026, 7, 20, 12, 0, 0)

  it('не читается как «Задано» и не притворяется просроченным', () => {
    expect(homeworkStateKey(hw({ status: 'CANCELLED' }), now)).not.toBe('assigned')
    expect(homeworkStateKey(hw({ status: 'CANCELLED', dueDate: '2026-08-01' }), now)).not.toBe('overdue')
    // Ключ свой и переведён на три языка: незнакомый вышел бы на экран сырой
    // строкой «homework.status.…», а одолженный 'completed' нарисовал бы
    // зелёное «Проверено» на работе, которую никто не проверял.
    expect(homeworkStateKey(hw({ status: 'ARCHIVED' }), now)).toBe('closed')
    expect(boardStateKey(hw({ status: 'ARCHIVED' }), now)).toBe('closed')
    // Не 'completed': зелёное «Проверено» на отменённой работе — прямая ложь.
    expect(homeworkStateKey(hw({ status: 'ARCHIVED' }), now)).not.toBe('completed')
  })

  it('работа только для чтения: ни приложить файл, ни сдать', () => {
    expect(canAttach(hw({ status: 'CANCELLED' }))).toBe(false)
    expect(canSubmit(hw({ status: 'CANCELLED', submissions: [{ id: 1 }] }))).toBe(false)
    expect(pendingCount([hw({ status: 'CANCELLED' })])).toBe(0)
  })

  it('стоит последним в обоих списках', () => {
    const sorted = (order, statuses) => statuses
      .map((status) => ({ status }))
      .sort((a, b) => order(a) - order(b))
      .map((x) => x.status)

    expect(sorted(reviewOrder, ['COMPLETED', 'CANCELLED', 'ASSIGNED', 'SUBMITTED']))
      .toEqual(['SUBMITTED', 'ASSIGNED', 'COMPLETED', 'CANCELLED'])
    expect(sorted(studentOrder, ['COMPLETED', 'CANCELLED', 'NEEDS_REVISION', 'ASSIGNED']))
      .toEqual(['NEEDS_REVISION', 'ASSIGNED', 'COMPLETED', 'CANCELLED'])
  })

  // Работа без статуса — не шестой статус, а отсутствие данных: на ней стоят и
  // соседние тесты, и карточки, собранные на клиенте.
  it('работа без статуса ведёт себя как раньше', () => {
    expect(homeworkStateKey({ id: 1 }, now)).toBe('assigned')
    expect(homeworkStateKey({ id: 1, dueDate: '2026-08-01' }, now)).toBe('assigned')
    expect(reviewOrder({ id: 1 })).toBe(reviewOrder({ status: 'ASSIGNED' }))
    expect(studentOrder({ id: 1 })).toBe(studentOrder({ status: 'ASSIGNED' }))
  })

  it('четыре известных статуса читаются как прежде', () => {
    expect(homeworkStateKey(hw({ status: 'ASSIGNED' }), now)).toBe('assigned')
    expect(homeworkStateKey(hw({ status: 'ASSIGNED', dueDate: '2026-08-18' }), now)).toBe('overdue')
    expect(homeworkStateKey(hw({ status: 'SUBMITTED' }), now)).toBe('submitted')
    expect(homeworkStateKey(hw({ status: 'NEEDS_REVISION' }), now)).toBe('needsRevision')
    expect(homeworkStateKey(hw({ status: 'COMPLETED' }), now)).toBe('completed')
  })
})

// Цвет бейджа — часть того же правила: ключ статуса выбирает плашку, и если две
// плашки неразличимы, различать статусы бесполезно. Читаем CSS текстом, как в
// соседних *.design.test.js: предмет проверки — сами цвета, а не то, как их
// посчитает jsdom.
const styles = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../styles.css'), 'utf8')

/** Значение свойства из правила `.selector { … }` в styles.css. */
function css(selector, prop) {
  const body = styles.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1]
  return body?.match(new RegExp(`(?:^|;)\\s*${prop}:\\s*(#[0-9a-f]{3,8})`, 'i'))?.[1] ?? null
}

/** Относительная яркость и контраст по WCAG 2.1. */
function contrast(a, b) {
  const luminance = (hex) => {
    const full = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex
    const [red, green, blue] = [1, 3, 5].map((i) => {
      const v = parseInt(full.slice(i, i + 2), 16) / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('бейдж «Взята в проверку»', () => {
  const inReview = { bg: css('.hw-badge--inReview', 'background'), fg: css('.hw-badge--inReview', 'color') }

  // Регрессия на цвет. Прежняя пастельно-фиолетовая плашка (#efe6ff) при
  // дейтеранопии совпадала с «Задано» (#e6ecff) — ΔE2000 = 0.4, то есть один и
  // тот же цвет. Различать эту пару и есть единственная причина, по которой
  // пятый статус завели. Свободного пастельного тона не нашлось, поэтому
  // плашка отличается ЯРКОСТЬЮ: это переживает любую форму цветовой слепоты.
  it('отличается от остальных бейджей яркостью, а не только тоном', () => {
    for (const neighbour of ['.hw-badge', '.hw-badge--submitted', '.hw-badge--overdue', '.hw-badge--needsRevision', '.hw-badge--completed']) {
      expect(contrast(inReview.bg, css(neighbour, 'background'))).toBeGreaterThanOrEqual(3)
    }
  })

  it('подпись на нём читается: WCAG AA при 12px/700', () => {
    expect(contrast(inReview.fg, inReview.bg)).toBeGreaterThanOrEqual(4.5)
  })
})
