import { describe, it, expect } from 'vitest'
import {
  compareCourses,
  courseCaptions,
  courseKey,
  courseNames,
  courseShortName,
  defaultCourse,
  findPickedCourse,
} from './selfStudyCourses.js'

const A2 = { id: 3, code: 'A2', label: 'just to study — Pre-Intermediate A2 · Course' }
const B2 = { id: 5, code: 'B2', label: 'just to study — Upper-Intermediate B2 · Course' }
const MEDIA = { id: 4, code: 'B2', label: 'just to study — English for Media & Marketing · B2+/C1', separateAccess: true }
const FINANCE = { id: 9, code: 'B2', label: 'English for Finance · B2', separateAccess: true }

describe('порядок курсов', () => {
  it('идёт по уровню, внутри уровня общий раньше отдельного, дальше по id', () => {
    // MEDIA заведён раньше общего B2 (id меньше), но чип общего курса — это
    // «сам уровень», и стоять ему первым.
    const sorted = [FINANCE, MEDIA, B2, A2].sort(compareCourses)
    expect(sorted.map((c) => c.id)).toEqual([3, 5, 4, 9])
  })
})

// Общее правило имён: те же фикстуры лежат в web-admin
// (catalog-material-cards.util.spec.ts) и должны совпадать дословно — курс
// называется одинаково у ученика и у преподавателя.
describe('общее правило имён', () => {
  const names = (courses) => Object.fromEntries(courseNames(courses))

  it('B1: общее начало названия отбрасывается', () => {
    expect(names([
      { id: 2, code: 'B1', label: 'just to study — Intermediate B1+ · Course' },
      { id: 8, code: 'B1', label: 'just to study — Intermediate B1+ · Speaking Club' },
    ])).toEqual({ 2: 'Course', 8: 'Speaking Club' })
  })

  it('B2: разные короткие имена остаются как есть', () => {
    expect(names([
      { id: 4, code: 'B2', label: 'just to study — Upper-Intermediate B2 · Course' },
      { id: 9, code: 'B2', label: 'just to study — English for Media & Marketing · B2+/C1' },
    ])).toEqual({ 4: 'Upper-Intermediate B2', 9: 'English for Media & Marketing' })
  })

  it('курс один на код: только короткое имя', () => {
    expect(courseShortName('just to study — Business English · B2+/C1')).toBe('Business English')
    expect(courseShortName('B1+ · Business Basics')).toBe('Business Basics')
    expect(courseShortName('just to study — A0 · Course', 'A0')).toBe('Course')
  })

  it('одинаковые названия различает номер курса', () => {
    expect(names([
      { id: 7, code: 'C1', label: 'just to study — Finance · C1' },
      { id: 11, code: 'C1', label: 'just to study — Finance · C1' },
    ])).toEqual({ 7: 'Finance #7', 11: 'Finance #11' })
  })

  it('название, равное коду, — один номер', () => {
    expect(names([
      { id: 1, code: 'A0', label: 'A0' },
      { id: 3, code: 'A0', label: 'A0' },
    ])).toEqual({ 1: '#1', 3: '#3' })
  })

  it('хвост не повторяет уникальное имя соседа', () => {
    expect(names([
      { id: 1, code: 'B1', label: 'just to study — Course · B1' },
      { id: 2, code: 'B1', label: 'just to study — Intermediate · Course' },
      { id: 3, code: 'B1', label: 'just to study — Intermediate · Club' },
    ])).toEqual({ 1: 'Course', 2: 'Intermediate #2', 3: 'Club' })
  })

  it('тире в уровне без бренда имя не съедает', () => {
    expect(courseShortName('Business English · B2 – C1', 'B2')).toBe('Business English')
    expect(courseShortName('just to study – Business English · B2+/C1', 'B2')).toBe('Business English')
  })
})

describe('имена по всему каталогу', () => {
  it('курс называется одинаково, что бы из каталога ни было показано', () => {
    // Общий B1 в «Самостоятельно» не попал (нет самостоятельных уроков), но в
    // каталоге он есть — и в админке курсы этого уровня называются по обоим.
    const general = { id: 2, code: 'B1', label: 'just to study — Intermediate B1+ · Course' }
    const club = { id: 8, code: 'B1', label: 'just to study — Intermediate B1+ · Speaking Club', separateAccess: true }

    expect(Object.fromEntries(courseCaptions([club], [general, club]))).toEqual({ 8: 'Speaking Club' })
  })
})

describe('короткое имя курса', () => {
  it('без названия, из одного уровня или из одного кода — пусто', () => {
    // Уровень на чипе и так стоит кодом — повторять его в имени незачем.
    expect(courseShortName(null)).toBe('')
    expect(courseShortName('  ')).toBe('')
    expect(courseShortName('B2+/C1')).toBe('')
    expect(courseShortName('just to study — A2 / B1', 'A2')).toBe('')
    expect(courseShortName('just to study — Exam · C1', 'exam')).toBe('')
  })
})

describe('имена курсов одного кода', () => {
  it('курсы с неповторяющимся кодом имени не получают', () => {
    expect(courseNames([A2, B2]).size).toBe(0)
  })

  it('не зависят от порядка курсов', () => {
    const fwd = courseNames([B2, MEDIA, FINANCE])
    const back = courseNames([FINANCE, MEDIA, B2])
    expect(Object.fromEntries(back)).toEqual(Object.fromEntries(fwd))
  })

  it('совпавшее имя и пустое разводятся вместе', () => {
    const one = { id: 20, code: 'C1', label: 'Business · C1 · Finance', separateAccess: true }
    const two = { id: 21, code: 'C1', label: 'Business · C1 · Marketing', separateAccess: true }
    const bare = { id: 22, code: 'C1', label: 'C1' }
    expect(Object.fromEntries(courseNames([one, two, bare])))
      .toEqual({ 20: 'Business · Finance', 21: 'Business · Marketing', 22: '#22' })
  })
})

describe('подписи чипов', () => {
  it('общий курс уровня остаётся одним кодом, отдельный — с именем', () => {
    const captions = courseCaptions([A2, B2, MEDIA].sort(compareCourses))
    expect(captions.has(courseKey(A2))).toBe(false)
    expect(captions.has(courseKey(B2))).toBe(false)
    expect(captions.get(courseKey(MEDIA))).toBe('English for Media & Marketing')
  })

  it('отдельный курс подписан, даже когда общего того же уровня нет', () => {
    // Иначе чип «B2» выглядел бы уровнем B2, а открывал бы Business English.
    expect(courseCaptions([MEDIA]).get(courseKey(MEDIA))).toBe('English for Media & Marketing')
  })

  it('имя отдельного курса без повтора кода — без бренда', () => {
    // Бренд не срезался, и чип читался «B2 just to study».
    const business = { id: 6, code: 'B2', label: 'just to study — Business English · B2+/C1', separateAccess: true }
    expect(courseCaptions([A2, business]).get(courseKey(business))).toBe('Business English')
  })

  it('второй общий курс того же уровня подписан, первый — нет', () => {
    const club = { id: 8, code: 'B1', label: 'just to study — Intermediate B1+ · Speaking Club' }
    const course = { id: 2, code: 'B1', label: 'just to study — Intermediate B1+ · Course' }
    const captions = courseCaptions([course, club].sort(compareCourses))
    expect(captions.has(courseKey(course))).toBe(false)
    expect(captions.get(courseKey(club))).toBe('Speaking Club')
  })

  it('одинаковые названия различает номер курса', () => {
    const one = { id: 7, code: 'C1', label: 'just to study — Finance · C1', separateAccess: true }
    const two = { id: 11, code: 'C1', label: 'just to study — Finance · C1', separateAccess: true }
    const captions = courseCaptions([one, two])
    expect(captions.get(courseKey(one))).toBe('Finance #7')
    expect(captions.get(courseKey(two))).toBe('Finance #11')
  })

  it('без названия различает хотя бы номером', () => {
    const bare = { id: 30, code: 'B2', separateAccess: true }
    expect(courseCaptions([B2, bare]).get(courseKey(bare))).toBe('#30')
    expect(courseCaptions([bare]).get(courseKey(bare))).toBe('#30')
  })
})

describe('запомненный выбор', () => {
  const courses = [A2, B2, MEDIA].sort(compareCourses)

  it('находит курс по id — в том числе второй курс того же уровня', () => {
    expect(findPickedCourse(courses, '4')).toBe(MEDIA)
    expect(findPickedCourse(courses, '5')).toBe(B2)
  })

  it('код уровня старого формата ведёт на первый курс этого уровня', () => {
    // Такое значение уже лежит у учеников в браузере.
    expect(findPickedCourse(courses, 'B2')).toBe(B2)
  })

  it('неизвестное и пустое значение ничего не находят', () => {
    expect(findPickedCourse(courses, 'C2')).toBeUndefined()
    expect(findPickedCourse(courses, '999')).toBeUndefined()
    expect(findPickedCourse(courses, null)).toBeUndefined()
  })
})

describe('курс по умолчанию', () => {
  it('самый высокий открытый общий, а не выданный сбоку отдельный', () => {
    const courses = [A2, { ...B2, locked: true }, MEDIA].sort(compareCourses)
    expect(defaultCourse(courses)).toBe(A2)
  })

  it('открыт только отдельный — он и есть умолчание', () => {
    const courses = [{ ...A2, locked: true }, MEDIA].sort(compareCourses)
    expect(defaultCourse(courses)).toBe(MEDIA)
  })

  it('открытого нет — первый', () => {
    const first = { ...A2, locked: true }
    expect(defaultCourse([first, { ...B2, locked: true }])).toBe(first)
  })
})
