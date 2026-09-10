import { describe, it, expect } from 'vitest'
import { materialCard, isMaterialGraded, isInteractiveMaterial, isLessonCard } from './materialAssignments.js'
import { homeworkStateKey } from './homeworkFormat.js'

const assignment = (over = {}) => ({
  id: 5,
  materialId: 12,
  materialTitle: 'Present Perfect · practice test',
  materialType: 'INTERACTIVE_HTML',
  isGraded: true,
  fileUrl: 'https://files.example/m.html',
  dueDate: '2026-08-25',
  teacherScore: null,
  teacherFeedback: null,
  gradedAt: null,
  ...over,
})

describe('materialCard', () => {
  it('приводит назначение к форме карточки списка с префиксом id', () => {
    const card = materialCard(assignment())
    expect(card.id).toBe('m-5')
    expect(card.kind).toBe('material')
    expect(card.title).toBe('Present Perfect · practice test')
    expect(card.status).toBe('ASSIGNED')
    expect(card.grade).toBeNull()
  })

  it('оценённое назначение читается как проверенная работа', () => {
    const card = materialCard(assignment({ teacherScore: 5, gradedAt: '2026-08-20T10:00:00' }))
    expect(card.status).toBe('COMPLETED')
    expect(card.grade).toBe(5)
    expect(homeworkStateKey(card)).toBe('completed')
  })

  // Просрочка по dueDate считается тем же правилом, что у обычной работы.
  it('непроверенное назначение с прошедшим дедлайном — просрочено', () => {
    const card = materialCard(assignment({ dueDate: '2026-08-01' }))
    expect(homeworkStateKey(card, new Date(2026, 7, 20))).toBe('overdue')
  })
})

describe('isMaterialGraded / isInteractiveMaterial', () => {
  it('оценка — это балл или отметка о проверке', () => {
    expect(isMaterialGraded(assignment())).toBe(false)
    expect(isMaterialGraded(assignment({ teacherScore: 4 }))).toBe(true)
    expect(isMaterialGraded(assignment({ gradedAt: '2026-08-20T10:00:00' }))).toBe(true)
  })

  it('интерактив отличается от обычного файла', () => {
    expect(isInteractiveMaterial(assignment())).toBe(true)
    expect(isInteractiveMaterial(assignment({ materialType: 'PDF' }))).toBe(false)
  })
})

/**
 * Одна карточка живого урока вместо материала целиком.
 *
 * Раньше такого задания не существовало: с урока на дом уходили только вопросы,
 * а карточку без них задать было нечем.
 */
describe('карточка живого урока', () => {
  const карточка = (over = {}) => ({
    id: 7, materialTitle: 'Unit 3', cardId: 'ce37fee00', catalogLessonId: 77,
    cardTitle: 'Four seasons, one favourite', ...over,
  })

  it('заданием называется карточка, а не весь материал', () => {
    expect(materialCard(карточка()).title).toBe('Four seasons, one favourite')
  })

  // Название карточки могло не сохраниться (старая выдача) — тогда лучше
  // название материала, чем пустая строка в списке заданий.
  it('без названия карточки остаётся название материала', () => {
    expect(materialCard(карточка({ cardTitle: null })).title).toBe('Unit 3')
  })

  it('материал целиком по-прежнему называется собой', () => {
    expect(materialCard({ id: 8, materialTitle: 'Unit 3' }).title).toBe('Unit 3')
  })

  it('карточку урока отличаем от обычного материала', () => {
    expect(isLessonCard(карточка())).toBe(true)
    expect(isLessonCard({ id: 8, materialTitle: 'Unit 3' })).toBe(false)
    // Адрес без урока открыть нечем — это не карточка.
    expect(isLessonCard(карточка({ catalogLessonId: null }))).toBe(false)
    expect(isLessonCard(null)).toBe(false)
  })
})

