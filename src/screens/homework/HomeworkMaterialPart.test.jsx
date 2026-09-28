// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkMaterialPart from './HomeworkMaterialPart.jsx'

/**
 * Часть-материал внутри ленты домашней работы (одна домашка на занятие,
 * spec §5, §9): та же логика «Открыть задание», что у непривязанной выдачи
 * (MaterialAssignmentDetail), но БЕЗ своей кнопки «Сдать» — сдаётся вся
 * работа одной кнопкой снаружи.
 */
vi.mock('../../api.js', () => ({
  uploadMedia: vi.fn(async () => ({ url: 'https://files.example/answer.pdf' })),
  attachMaterialAnswer: vi.fn(async (token, id, fileName, url) => ({
    id, materialId: 12, materialTitle: 'Coffee — yes', cardId: 'cad401560', catalogLessonId: 314,
    files: [{ id: 77, fileName, url }],
  })),
  removeMaterialAnswer: vi.fn(async (token, id) => ({
    id, materialId: 12, materialTitle: 'Coffee — yes', cardId: 'cad401560', catalogLessonId: 314, files: [],
  })),
  startMaterialAssignment: vi.fn(async () => ({ id: 99 })),
  materialAssignmentRenderUrl: vi.fn((materialId, assignmentId, token, sessionId) =>
    `https://api.example/student/materials/${materialId}/render?assignmentId=${assignmentId}&sessionId=${sessionId}`),
}))
import * as api from '../../api.js'

const ЧАСТЬ = {
  id: 24,
  materialId: 14,
  materialTitle: 'Present Perfect · practice test',
  materialType: 'INTERACTIVE_HTML',
  isGraded: true,
  fileUrl: 'https://files.example/m.html',
  stageTitlesSnapshot: 'Practice · Задание 1, 2',
  status: 'ASSIGNED',
  isOverdue: false,
  homeworkAssignmentId: 7,
  files: [],
  teacherScore: null,
  teacherFeedback: null,
  gradedAt: null,
  closedWithoutSubmission: false,
}

function показать(props = {}) {
  return render(
    <I18nProvider>
      <HomeworkMaterialPart part={ЧАСТЬ} token="tkn" editable onOpenCard={() => {}} onSaved={() => {}} {...props} />
    </I18nProvider>
  )
}

let открытыеВкладки
beforeEach(() => {
  открытыеВкладки = []
  vi.stubGlobal('open', (url) => { открытыеВкладки.push(url); return null })
  vi.clearAllMocks()
})
afterEach(() => vi.unstubAllGlobals())

describe('HomeworkMaterialPart — заголовок, статус, что задано', () => {
  it('показывает заголовок материала, снимок задания и бейдж статуса', () => {
    const { container } = показать()
    expect(container.querySelector('.hw-block__title').textContent).toBe('Present Perfect · practice test')
    expect(screen.getByText('Practice · Задание 1, 2')).toBeTruthy()
    expect(container.querySelector('.hw-badge--assigned')).not.toBeNull()
  })

  it('своей кнопки «Сдать» у части нет — сдаётся вся работа снаружи', () => {
    показать()
    expect(screen.queryByRole('button', { name: /сдать/i })).toBeNull()
  })
})

describe('HomeworkMaterialPart — «Открыть задание», та же логика, что у MaterialAssignmentDetail', () => {
  it('интерактив открывается сессией и рамкой прямо в ленте', async () => {
    const { container } = показать()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть задание' }))

    await waitFor(() => expect(api.startMaterialAssignment).toHaveBeenCalledWith('tkn', 24))
    const frame = await waitFor(() => {
      const el = container.querySelector('.hw-frame__iframe')
      expect(el).not.toBeNull()
      return el
    })
    expect(frame.getAttribute('src')).toContain('/student/materials/14/render')
    expect(frame.getAttribute('src')).toContain('assignmentId=24')
    expect(открытыеВкладки).toEqual([])
  })

  it('карточка живого урока открывается сам урок в кабинете, а не файл', () => {
    const onOpenCard = vi.fn()
    показать({ part: { ...ЧАСТЬ, cardId: 'cad401560', catalogLessonId: 314, cardTitle: 'Итог урока' }, onOpenCard })

    fireEvent.click(screen.getByRole('button', { name: 'Открыть задание' }))

    expect(onOpenCard).toHaveBeenCalledWith({ catalogLessonId: 314, cardId: 'cad401560' })
    expect(api.startMaterialAssignment).not.toHaveBeenCalled()
    expect(открытыеВкладки).toEqual([])
  })
})

describe('HomeworkMaterialPart — «Мой ответ» у карточки урока', () => {
  const КАРТОЧКА = { ...ЧАСТЬ, materialType: 'LINK', cardId: 'cad401560', catalogLessonId: 314, cardTitle: 'Итог урока', files: [] }

  it('пока работа у ученика — файл можно приложить', async () => {
    const onSaved = vi.fn()
    const { container } = показать({ part: КАРТОЧКА, editable: true, onSaved })

    expect(screen.getByText('Мой ответ')).toBeTruthy()
    fireEvent.change(container.querySelector('.hw-upload__input'), {
      target: { files: [new File(['x'], 'answer.pdf', { type: 'application/pdf' })] },
    })

    await waitFor(() => expect(api.attachMaterialAnswer).toHaveBeenCalledWith('tkn', 24, 'answer.pdf', 'https://files.example/answer.pdf'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 24, files: [{ id: 77, fileName: 'answer.pdf', url: 'https://files.example/answer.pdf' }] })))
  })

  // Работа уже сдана (editable=false) — действий с частью больше нет вовсе,
  // только открыть и посмотреть: своей кнопки сдачи у части и так не было, а
  // теперь пропадает и приложение файла.
  it('работа сдана — раздела «Мой ответ» нет вовсе, только «Открыть задание»', () => {
    const { container } = показать({ part: КАРТОЧКА, editable: false })

    expect(screen.queryByText('Мой ответ')).toBeNull()
    expect(container.querySelector('.hw-upload__input')).toBeNull()
    expect(screen.getByRole('button', { name: 'Открыть задание' })).toBeTruthy()
  })

  it('материал целиком (не карточка урока) «Мой ответ» не показывает', () => {
    показать({ part: ЧАСТЬ, editable: true })
    expect(screen.queryByText('Мой ответ')).toBeNull()
  })

  it('уже оценённая часть — файл виден, но приложить и убрать больше нельзя', () => {
    const { container } = показать({
      part: { ...КАРТОЧКА, files: [{ id: 1, fileName: 'answer.pdf', url: 'u' }], teacherScore: 5, gradedAt: '2026-09-20T10:00:00' },
      editable: true,
    })

    expect(screen.getByText('answer.pdf')).toBeTruthy()
    expect(container.querySelector('.hw-upload__input')).toBeNull()
    expect(container.querySelector('.hw-file__remove')).toBeNull()
  })
})

// Регрессия из разведки: materialCard теперь прокидывает closedWithoutSubmission
// (materialAssignments.js), и часть, закрытая без сдачи, должна читаться так
// же, как закрытая без сдачи домашняя работа — не зелёным «Проверено».
describe('HomeworkMaterialPart — закрыта без сдачи', () => {
  it('бейдж и подсказка — «Закрыто без сдачи», а не «Проверено»', () => {
    const { container } = показать({
      part: { ...ЧАСТЬ, status: 'COMPLETED', closedWithoutSubmission: true },
    })

    expect(container.querySelector('.hw-badge--closedNoSubmission')).not.toBeNull()
    expect(container.querySelector('.hw-badge--completed')).toBeNull()
    expect(screen.getByText('Преподаватель закрыл эту работу — вы её не сдавали')).toBeTruthy()
  })
})
