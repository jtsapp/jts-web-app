// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getMatchingTeacherExtras: vi.fn(async () => null),
  getMatchingTeacherResultPhoto: vi.fn(async () => null),
  getMatchingTeacherVideo: vi.fn(async () => null),
  getMatchingTeacher: vi.fn(async () => null),
  getMatchingTeacherPhoto: vi.fn(async () => null),
}))
vi.mock('./matchingStore.js', () => ({ useMatching: vi.fn(), applyMatchingCard: vi.fn() }))
import { useMatching } from './matchingStore.js'
import MatchingPopups from './MatchingPopups.jsx'

const proposed = {
  status: 'ready', handoffs: [],
  card: { apiVersion: 2, studentId: 7, matchStatus: 'confirm', deadline: '2026-10-27T15:00:00', assignedTeacherId: 3,
    assignedTeacherName: 'Айгерим', proposedSlots: [{ weekday: 1, start: '14:00:00' }], requests: [], tariffConfirmed: true,
    lessonDuration: 60, lessonsPerWeek: 1 },
}
const wrap = (screenName) => render(<I18nProvider><MatchingPopups token="t" screen={screenName} onNav={() => {}} /></I18nProvider>)

beforeEach(() => localStorage.clear())

// ТЗ §2.7: окно при входе один раз на событие; закрытое не возвращается, а на экранах подбора его нет вовсе.
it('shows the proposal popup once per deadline and never on matching screens', () => {
  useMatching.mockReturnValue(proposed)
  wrap('home')
  expect(screen.getAllByText('Подтвердите расписание').length).toBeGreaterThan(0)
  fireEvent.click(screen.getAllByRole('button', { name: 'Закрыть' })[0])
  cleanup()
  wrap('home')
  expect(screen.queryByText('Подтвердите расписание')).toBeNull()
  cleanup()
  localStorage.clear()
  wrap('teacher-wizard')
  expect(screen.queryByText('Подтвердите расписание')).toBeNull()
  cleanup()
  wrap('placement')
  expect(screen.queryByText('Подтвердите расписание')).toBeNull()
})

it('nothing to show for a student who just chooses', () => {
  useMatching.mockReturnValue({ ...proposed, card: { ...proposed.card, matchStatus: 'self' } })
  wrap('home')
  expect(document.querySelector('.mt-overlay')).toBeNull()
})
