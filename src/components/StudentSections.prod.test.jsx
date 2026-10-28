// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://ai-tutor.justtostudy.kz/"}
import { expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LearningLayout from './LearningLayout.jsx'
import ProfilePage from '../screens/ProfilePage.jsx'
import { getUnreadNotificationCount } from '../api.js'
vi.mock('../api.js', async (load) => ({ ...await load(),
  getBalance: vi.fn().mockResolvedValue({ coins: 0, streak: 0 }),
  getDemoAccess: vi.fn().mockResolvedValue({ isDemo: false }),
  getIeltsMe: vi.fn().mockResolvedValue({}), getSatMeCached: vi.fn().mockResolvedValue({}),
  getUnreadNotificationCount: vi.fn(),
}))
const student = `e30.${btoa(JSON.stringify({ role: 'STUDENT', userId: 4 }))}.sig`
it('убирает у ученика колокольчик и не запрашивает скрытые уведомления', () => {
  const { queryByLabelText } = render(<I18nProvider><LearningLayout token={student} onNav={() => {}}><p>Уроки</p></LearningLayout></I18nProvider>)
  expect(queryByLabelText('Уведомления')).toBeNull()
  expect(document.querySelector('[data-nav="tokens"]')).toBeNull()
  expect(document.querySelector('[data-nav="prizes"]')).toBeNull()
  expect(getUnreadNotificationCount).not.toHaveBeenCalled()
})
it('убирает из профиля ученика обратную связь и уведомления', () => {
  render(<I18nProvider><ProfilePage token={student} userName="Тест" userLevel="A2" onNav={() => {}} /></I18nProvider>)
  expect(document.querySelector('.pf-row[data-key="notif"]')).toBeNull()
  expect(document.querySelector('.pf-row[data-key="feedback"]')).toBeNull()
})
