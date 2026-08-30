// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import NextLessonCard from './NextLessonCard.jsx'

const lesson = (over = {}) => ({
  lessonId: 42,
  participantId: 4,
  scheduledAt: '2026-08-10T18:00:00',
  durationMinutes: 60,
  teacherName: 'Адильжан Алимжанов',
  lessonStatus: 'SCHEDULED',
  format: 'ONLINE',
  ...over,
})

function renderCard(props) {
  return render(
    <I18nProvider>
      <NextLessonCard occ={lesson()} onOpenLesson={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('NextLessonCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
  })
  afterEach(() => { vi.useRealTimers() })

  it('показывает преподавателя, его роль и инициалы вместо фото', () => {
    const { container } = renderCard()
    expect(screen.getByText('Адильжан Алимжанов')).toBeTruthy()
    expect(screen.getByText('Учитель')).toBeTruthy()
    expect(container.querySelector('.lesson-card__avatar').textContent).toBe('АА')
  })

  it('идущий урок: статус «начался» и рабочая кнопка входа', () => {
    const opened = []
    renderCard({ occ: lesson({ lessonStatus: 'IN_PROGRESS' }), onOpenLesson: (id) => opened.push(id) })

    expect(screen.getByText('Урок начался')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /присоединиться к уроку/i }))
    expect(opened).toEqual([42])
  })

  // Кнопка остаётся на месте, но не работает: класс ещё не открыт, и щелчок
  // по ней увёл бы ученика на пустой экран урока.
  it('запланированный урок: вход выключен, видно почему', () => {
    renderCard()
    expect(screen.getByRole('button', { name: /присоединиться к уроку/i }).disabled).toBe(true)
    expect(screen.getByText('Преподаватель ещё не начал урок')).toBeTruthy()
  })

  it('без темы в шапке строки — день и время урока', () => {
    const { container } = renderCard()
    expect(container.querySelector('.lesson-card__topic').textContent).toBe('Сегодня, 18:00 – 19:00')
  })

  it('с темой время уходит в подпись, а в шапку встаёт тема', () => {
    const { container } = renderCard({ topic: 'Coffee—yes. Mondays—no.' })
    expect(container.querySelector('.lesson-card__topic').textContent).toBe('Coffee—yes. Mondays—no.')
    expect(container.querySelector('.lesson-card__when').textContent).toBe('Сегодня, 18:00 – 19:00')
  })

  it('ссылка на видеозвонок появляется только когда она есть', () => {
    const { container, rerender } = renderCard()
    expect(container.querySelector('.meet-link')).toBeNull()

    rerender(
      <I18nProvider>
        <NextLessonCard occ={lesson()} card={{ meetingUrl: 'https://meet.google.com/abc-defg-hij' }} onOpenLesson={() => {}} />
      </I18nProvider>
    )
    const link = container.querySelector('.meet-link')
    expect(link.getAttribute('href')).toBe('https://meet.google.com/abc-defg-hij')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  // Групповое и индивидуальное — для ученика это разный урок, и в макете вид
  // занятия стоит прямо в карточке. Тип приезжает догрузкой, поэтому до неё
  // чипа быть не должно: пустая плашка читалась бы как поломка.
  it('вид занятия показывается чипом и только когда он известен', () => {
    const { container, rerender } = renderCard()
    expect(container.querySelector('.sch-row__kind')).toBeNull()

    rerender(
      <I18nProvider>
        <NextLessonCard occ={lesson()} card={{ group: true }} onOpenLesson={() => {}} />
      </I18nProvider>
    )
    expect(container.querySelector('.sch-row__kind--group').textContent).toBe('Группа')

    rerender(
      <I18nProvider>
        <NextLessonCard occ={lesson()} card={{ group: false }} onOpenLesson={() => {}} />
      </I18nProvider>
    )
    expect(container.querySelector('.sch-row__kind--solo').textContent).toBe('Индивидуальный')
  })

  it('без ближайшего урока — пустое состояние вместо карточки', () => {
    const { container } = renderCard({ occ: null })
    expect(container.querySelector('.lesson-card--empty')).not.toBeNull()
    expect(screen.getByText('Ближайших уроков нет')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
