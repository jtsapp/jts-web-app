// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import MaterialAssignmentDetail from './MaterialAssignmentDetail.jsx'

/**
 * Домашка с живого урока делается В КАБИНЕТЕ, а не в новой вкладке.
 *
 * Раньше «Открыть задание» звало window.open, и ученик уходил из домашней
 * работы на сырой файл: без моста (ответы никуда не уходили) и с начала урока.
 * Теперь материал встраивается рамкой прямо в экран задания.
 */
const ЗАДАНИЕ = {
  id: 24,
  materialId: 14,
  materialTitle: 'Coffee — yes. Mondays — no. · 1 to 1',
  materialType: 'LINK',
  fileUrl: 'https://files-dev.justtostudy.kz/development/course-catalog/standalone/a0-lesson-1.html',
  isGraded: false,
  stageTitlesSnapshot: 'Listening · Free time',
  cardId: null,
  catalogLessonId: null,
  files: [],
  teacherScore: null,
  teacherFeedback: null,
  gradedAt: null,
}

const карточка = (over = {}) => ({
  id: 'm-24',
  kind: 'material',
  title: ЗАДАНИЕ.materialTitle,
  status: 'ASSIGNED',
  dueDate: '2026-09-29',
  grade: null,
  assignment: { ...ЗАДАНИЕ, ...over },
})

function показать(card = карточка()) {
  return render(
    <I18nProvider>
      <MaterialAssignmentDetail card={card} token="tkn" onOpenCard={() => {}} onSaved={() => {}} />
    </I18nProvider>
  )
}

const кнопкаОткрыть = () => screen.getByRole('button', { name: /открыть задание/i })

let открытыеВкладки

beforeEach(() => {
  открытыеВкладки = []
  vi.stubGlobal('open', (url) => { открытыеВкладки.push(url); return null })
})

afterEach(() => vi.unstubAllGlobals())

describe('MaterialAssignmentDetail — задание делается прямо на экране', () => {
  it('до открытия рамки нет — только кнопка и что задано', () => {
    const { container } = показать()
    expect(container.querySelector('.hw-frame__iframe')).toBeNull()
    expect(screen.getByText('Listening · Free time')).toBeTruthy()
    expect(кнопкаОткрыть()).toBeTruthy()
  })

  it('урок каталога открывается рамкой на этой же странице, а не новой вкладкой', async () => {
    const { container } = показать()

    кнопкаОткрыть().click()

    const frame = await waitFor(() => {
      const el = container.querySelector('.hw-frame__iframe')
      expect(el).not.toBeNull()
      return el
    })
    // Именно render-эндпоинт: в нём мост и автоуказка на выданный блок.
    expect(frame.getAttribute('src')).toContain('/student/materials/14/render')
    expect(frame.getAttribute('src')).toContain('assignmentId=24')
    // Главное в этой спеке: ученик остался в кабинете.
    expect(открытыеВкладки).toEqual([])
  })

  /* Заданиям на слух нужен autoplay: разрешение выдаётся документу, а материал
     живёт в своей рамке — та же причина, что у рамки живого урока. */
  it('рамка пускает звук', async () => {
    const { container } = показать()
    кнопкаОткрыть().click()
    const frame = await waitFor(() => {
      const el = container.querySelector('.hw-frame__iframe')
      expect(el).not.toBeNull()
      return el
    })
    expect(frame.getAttribute('allow')).toBe('autoplay')
  })

  /* Экран монтирует компонент с key по id выдачи (HomeworkPage.jsx) — выбрали в
     списке другую, и рамка прежней уходит вместе с карточкой. Здесь это key и
     воспроизводится: без него на экране осталось бы чужое задание. */
  it('выбрали другое задание — рамка прежнего убирается', async () => {
    const экран = (card) => (
      <I18nProvider>
        <MaterialAssignmentDetail key={card.id} card={card} token="tkn" onOpenCard={() => {}} onSaved={() => {}} />
      </I18nProvider>
    )
    const { container, rerender } = render(экран(карточка()))
    кнопкаОткрыть().click()
    await waitFor(() => expect(container.querySelector('.hw-frame__iframe')).not.toBeNull())

    rerender(экран({ ...карточка(), id: 'm-25' }))

    expect(container.querySelector('.hw-frame__iframe')).toBeNull()
    expect(кнопкаОткрыть()).toBeTruthy()
  })

  // Чужую ссылку встроить нечем: её сайт отдаст рамке X-Frame-Options.
  it('обычный файл по-прежнему уходит в новую вкладку', () => {
    const { container } = показать(карточка({ materialType: 'PDF', fileUrl: 'https://files.example/task.pdf' }))

    кнопкаОткрыть().click()

    expect(container.querySelector('.hw-frame__iframe')).toBeNull()
    expect(открытыеВкладки).toEqual(['https://files.example/task.pdf'])
  })
})
