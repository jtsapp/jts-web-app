// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import AssignPracticeBar from './AssignPracticeBar.jsx'
import { assignPracticeUnits, getMyLessonOccurrences } from '../../api.js'

vi.mock('../../api.js', () => ({
  getMyLessonOccurrences: vi.fn(async () => []),
  assignPracticeUnits: vi.fn(async () => ({})),
}))

/**
 * Преподаватели просили: «в „Практике“ много интересных заданий, особенно по
 * грамматике, больше, чем в самих уроках» — и выдать их на дом было неоткуда.
 */
const UNITS = [{ level: 'a2', unitId: 3, title: 'Present Simple', section: 'Present' }]

function renderBar(props = {}) {
  return render(
    <I18nProvider>
      <AssignPracticeBar token="t" area="grammar" level="a2" units={UNITS} onClear={() => {}} {...props} />
    </I18nProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getMyLessonOccurrences.mockResolvedValue([
    { lessonId: 5, scheduledAt: '2099-01-01T10:00:00Z', lessonStatus: 'SCHEDULED', studentName: 'Асем' },
  ])
})

describe('AssignPracticeBar', () => {
  // Пока ничего не отмечено, панель не занимает низ экрана.
  it('без выбранных юнитов не показывается', () => {
    const { container } = renderBar({ units: [] })
    expect(container.textContent).toBe('')
  })

  it('показывает, сколько отмечено', () => {
    renderBar()
    expect(screen.getByText('Выбрано: 1')).toBeTruthy()
  })

  // Урок выбирается явно: у преподавателя в день несколько занятий, и молча
  // выдать задание не тому классу дороже, чем попросить один клик.
  it('выдача идёт на выбранный урок и уносит отмеченное', async () => {
    const onClear = vi.fn()
    renderBar({ onClear })

    fireEvent.click(screen.getByText('Задать на дом'))
    await waitFor(() => expect(screen.getByText('Асем')).toBeTruthy())
    fireEvent.click(screen.getByText('Асем'))

    await waitFor(() => expect(assignPracticeUnits).toHaveBeenCalled())
    const [token, lessonId, payload] = assignPracticeUnits.mock.calls[0]
    expect(token).toBe('t')
    expect(lessonId).toBe(5)
    expect(payload.area).toBe('grammar')
    expect(payload.units).toEqual(UNITS)
    // Ключ отправки обязателен: с ним повтор после обрыва не задваивает выдачу.
    expect(payload.batchId).toBeTruthy()
    await waitFor(() => expect(onClear).toHaveBeenCalled())
  })

  it('после выдачи говорит, сколько задано', async () => {
    renderBar()
    fireEvent.click(screen.getByText('Задать на дом'))
    await waitFor(() => expect(screen.getByText('Асем')).toBeTruthy())
    fireEvent.click(screen.getByText('Асем'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Задано: 1/))
  })

  // Пустой список читался бы как «не загрузилось» — говорим прямо.
  it('без занятий объясняет, почему выдать некуда', async () => {
    getMyLessonOccurrences.mockResolvedValue([])
    renderBar()
    fireEvent.click(screen.getByText('Задать на дом'))
    await waitFor(() => expect(screen.getByText(/Занятий не нашлось/)).toBeTruthy())
  })

  it('отказ сервера показывает ошибку и не чистит выбор', async () => {
    const onClear = vi.fn()
    assignPracticeUnits.mockRejectedValue(new Error('nope'))
    renderBar({ onClear })

    fireEvent.click(screen.getByText('Задать на дом'))
    await waitFor(() => expect(screen.getByText('Асем')).toBeTruthy())
    fireEvent.click(screen.getByText('Асем'))

    await waitFor(() => expect(screen.getByText(/Не удалось задать/)).toBeTruthy())
    expect(onClear).not.toHaveBeenCalled()
  })
})
