import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api.js', () => ({
  getCourseCatalog: vi.fn(),
  getLevelTestByFile: vi.fn(),
}))

import { getCourseCatalog, getLevelTestByFile } from '../../api.js'
import { catalogLessonIdFor, isLevelTestUrl } from './catalogLessonByUrl.js'

const EXAM = 'https://s3/development/course-catalog/exams/a0-1a2b3c4d/final-test-9f8e7d6c.html'

/**
 * Тест на определение уровня — урок каталога, но в дерево ученика не входит: его
 * получают только от преподавателя. Урок за материалом занятия находится по адресу
 * файла отдельной ручкой — тогда ученик на занятии проходит тест карточками, как тест
 * курса. В домашке тест открывается своей страницей (isWholeCatalogLesson), сюда не ходит.
 */
describe('catalogLessonIdFor — тест на определение уровня', () => {
  beforeEach(() => {
    getCourseCatalog.mockReset()
    getLevelTestByFile.mockReset()
  })

  it('узнаёт файл теста по папке', () => {
    expect(isLevelTestUrl(EXAM)).toBe(true)
    expect(isLevelTestUrl('https://s3/development/course-catalog/a0/lessons/L01.html?mode=solo')).toBe(false)
    expect(isLevelTestUrl('https://s3/development/course-catalog/examsx/L01.html')).toBe(false)
  })

  it('в дереве теста нет — урок берётся по адресу файла', async () => {
    getCourseCatalog.mockResolvedValue([])
    getLevelTestByFile.mockResolvedValue({ id: 700 })

    expect(await catalogLessonIdFor(EXAM, 'token')).toBe(700)
    expect(getLevelTestByFile).toHaveBeenCalledWith(EXAM, 'token')
  })

  it('тест не открыт ученику (404) — файлом, как раньше', async () => {
    getCourseCatalog.mockResolvedValue([])
    getLevelTestByFile.mockRejectedValue(new Error('404'))

    expect(await catalogLessonIdFor(EXAM, 'token')).toBe(null)
  })

  it('обычный урок по адресу не ищется — только в дереве', async () => {
    getCourseCatalog.mockResolvedValue([])

    expect(await catalogLessonIdFor('https://s3/development/course-catalog/a0/lessons/L01.html?mode=solo', 'token')).toBe(null)
    expect(getLevelTestByFile).not.toHaveBeenCalled()
  })
})
