// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import Sidebar from './Sidebar.jsx'
import { I18nProvider } from '../i18n.jsx'
vi.mock('../config.js', async original => ({ ...(await original()), TUTOR_ONLY: true }))
vi.mock('../api.js', async original => ({
  ...(await original()),
  getDemoAccess: vi.fn(async () => ({ isDemo: false })),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0 })),
  getIeltsMe: vi.fn(async () => ({ purchased: false, ieltsAccount: false })),
  getSatMeCached: vi.fn(async () => ({ purchased: false })),
}))
it('keeps student Feedback available in tutor-only mode', async () => {
  const onNav = vi.fn()
  render(<I18nProvider><Sidebar token="fixture" userName="Student" onNav={onNav} /></I18nProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Feedback' }))
  await waitFor(() => expect(onNav).toHaveBeenCalledWith('feedback'))
})
