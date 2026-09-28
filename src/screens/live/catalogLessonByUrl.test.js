import { describe, it, expect } from 'vitest'
import { findCatalogLessonId, shouldResolveCatalogLesson, matchesCatalogLessonIndex } from './catalogLessonByUrl.js'
import { LESSON_EXTRACTOR, engineOf } from './lessonExtractor.js'

const CATALOG = [
  {
    id: 1,
    code: 'A2',
    units: [
      {
        id: 10,
        lessons: [
          { id: 100, code: 'L01-SELF', fileUrl: 'https://files/a2/lessons/L01.html?mode=self' },
          { id: 101, code: 'L01-1TO1', fileUrl: 'https://files/a2/lessons/L01.html?mode=solo' },
          { id: 102, code: 'L01-GROUP', fileUrl: 'https://files/a2/lessons/L01.html?mode=group' },
        ],
      },
    ],
  },
]

describe('findCatalogLessonId', () => {
  it('находит урок по ссылке на его файл', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=solo')).toBe(101)
  })

  // Файл у трёх режимов общий, различает их только ?mode= — подменить один
  // другим значит показать ученику формулировки не того формата.
  it('различает режимы одного урока', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=self')).toBe(100)
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=group')).toBe(102)
  })

  it('якорь в ссылке ничего не меняет', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=solo#s2')).toBe(101)
  })

  // Материал раздела часто приходит с подписью S3. Сравнивать строки целиком
  // не находило разбор — ученик видел одну «Section 1» вместо шагов урока.
  it('находит урок по подписанной ссылке S3 с тем же mode', () => {
    const signed =
      'https://files/a2/lessons/L01.html?mode=solo&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc'
    expect(findCatalogLessonId(CATALOG, signed)).toBe(101)
  })

  it('не путает режимы, когда подпись стоит первой в query', () => {
    const signed =
      'https://files/a2/lessons/L01.html?X-Amz-Expires=3600&mode=group&X-Amz-Signature=abc'
    expect(findCatalogLessonId(CATALOG, signed)).toBe(102)
  })

  // Уровень, залитый до появления режимов, ссылается на файл без ?mode=.
  it('без режима довольствуется совпадением файла', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html')).toBe(100)
  })

  it('чужой материал остаётся без урока — покажем его как файл', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/uploads/my-homework.pdf')).toBeNull()
    expect(findCatalogLessonId(CATALOG, '')).toBeNull()
    expect(findCatalogLessonId([], 'https://files/a2/lessons/L01.html')).toBeNull()
  })
})

const LEVEL_FILE = [
  {
    id: 1,
    code: 'A1',
    units: [{
      id: 10,
      lessons: [
        { id: 201, code: 'L01', fileUrl: 'https://files/a1/course.html?mode=solo' },
        { id: 205, code: 'L05', fileUrl: 'https://files/a1/course.html?mode=solo' },
        { id: 208, code: 'L08', fileUrl: 'https://files/a1/course.html?mode=solo' },
      ],
    }],
  },
]

describe('findCatalogLessonId — указка занятия в общем файле уровня', () => {
  it('по focusLessonNo берёт L05, а не первый урок файла', () => {
    expect(findCatalogLessonId(LEVEL_FILE, 'https://files/a1/course.html?mode=solo', 5)).toBe(205)
  })

  it('без указки остаётся первый совпавший — как раньше', () => {
    expect(findCatalogLessonId(LEVEL_FILE, 'https://files/a1/course.html?mode=solo')).toBe(201)
  })

  it('уникальный файл не подменяется чужим L-номером', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=solo', 8)).toBe(101)
  })
})

describe('matchesCatalogLessonIndex', () => {
  it('узнаёт L05 в коде и в имени файла', () => {
    expect(matchesCatalogLessonIndex({ code: 'L05' }, 5)).toBe(true)
    expect(matchesCatalogLessonIndex({ fileUrl: 'https://files/a1/lessons/L05.html' }, 5)).toBe(true)
    expect(matchesCatalogLessonIndex({ code: 'L01' }, 5)).toBe(false)
  })
})

// Разбор ищем у любого занятия, кроме standalone: на FILE по умолчанию как раз
// ставят урок каталога, и без поиска ученик видел файл и «Section 1».
describe('shouldResolveCatalogLesson — шаги или файл', () => {
  const КАТАЛОГ = 'https://files/development/course-catalog/a0/lessons/L05.html'
  const STANDALONE = 'https://files/development/course-catalog/standalone/a0-l5.html'

  it('по умолчанию рубильник выключен', () => {
    expect(LESSON_EXTRACTOR.enabled).toBe(false)
  })

  it('урок каталога ищется и на FILE-занятии — как у преподавателя', () => {
    expect(shouldResolveCatalogLesson(КАТАЛОГ, { engine: 'FILE' })).toBe(true)
    expect(shouldResolveCatalogLesson(КАТАЛОГ, { engine: 'STEPS' })).toBe(true)
  })

  it('standalone — никогда; пустая ссылка — нет', () => {
    expect(shouldResolveCatalogLesson(STANDALONE, { engine: 'STEPS' })).toBe(false)
    expect(shouldResolveCatalogLesson(STANDALONE, { engine: 'FILE' })).toBe(false)
    expect(shouldResolveCatalogLesson('', { engine: 'STEPS' })).toBe(false)
  })

  it('поля нет или занятия нет — всё равно ищем разбор', () => {
    expect(shouldResolveCatalogLesson(КАТАЛОГ, {})).toBe(true)
    expect(shouldResolveCatalogLesson(КАТАЛОГ, null)).toBe(true)
    expect(shouldResolveCatalogLesson(КАТАЛОГ)).toBe(true)
  })
})

describe('engineOf', () => {
  it('читает поле, пусто — STEPS', () => {
    expect(engineOf({ engine: 'FILE' })).toBe('FILE')
    expect(engineOf({ engine: 'STEPS' })).toBe('STEPS')
    expect(engineOf({})).toBe('STEPS')
    expect(engineOf(null)).toBe('STEPS')
    expect(engineOf(undefined)).toBe('STEPS')
  })
})
