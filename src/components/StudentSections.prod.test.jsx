// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://ai-tutor.justtostudy.kz/"}
import { expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LearningLayout from './LearningLayout.jsx'
import TokenBlocks from './TokenBlocks.jsx'
import { menuItems, serviceItems } from '../lib/navSections.js'
import { getMyTokens, getMyContracts, getMatchingState, getUnreadNotificationCount } from '../api.js'
vi.mock('../api.js', async (load) => ({ ...await load(),
  getBalance: vi.fn().mockResolvedValue({ coins: 0, streak: 0 }),
  getDemoAccess: vi.fn().mockResolvedValue({ isDemo: false }),
  getIeltsMe: vi.fn().mockResolvedValue({}), getSatMeCached: vi.fn().mockResolvedValue({}),
  getMyTokens: vi.fn(), getMyContracts: vi.fn(), getMatchingState: vi.fn(), getUnreadNotificationCount: vi.fn(),
}))
const student = `e30.${btoa(JSON.stringify({ role: 'STUDENT', userId: 4 }))}.sig`
it('убирает разделы на компьютере и в Сервисах телефона даже при открытых правах', () => {
  const items = menuItems({ rewards: true, myTeacher: true })
  for (const list of [items, serviceItems(items)]) {
    expect(list.map(i => i.key)).not.toEqual(expect.arrayContaining(['tokens']))
    expect(list.some(i => i.key === 'feedback')).toBe(true)
    for (const key of ['tokens', 'prizes', 'notifications', 'contracts', 'my-teacher']) {
      expect(list.some(i => i.key === key)).toBe(false)
    }
  }
  expect(items.some(i => i.key === 'lessons')).toBe(true)
})
it('не показывает плашки, колокольчик и не запрашивает данные скрытых разделов', () => {
  const { queryByTestId, queryByLabelText } = render(<I18nProvider><LearningLayout token={student} onNav={() => {}}><TokenBlocks token={student} /></LearningLayout></I18nProvider>)
  expect(queryByTestId('home-token-blocks')).toBeNull()
  expect(queryByLabelText('Уведомления')).toBeNull()
  expect(getMyTokens).not.toHaveBeenCalled()
  expect(getMyContracts).not.toHaveBeenCalled()
  expect(getMatchingState).not.toHaveBeenCalled()
  expect(getUnreadNotificationCount).not.toHaveBeenCalled()
})
