// @vitest-environment jsdom
// «Изучено» в гиде по Desmos — на сервере (ТЗ SAT 21.10, задача 17): одни отметки на всех устройствах,
// а прежние отметки из браузера переносятся при первом заходе, а не теряются.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const api = vi.hoisted(() => ({
  getSatGuideStudied: vi.fn(async () => ['solve']),
  importSatGuideStudied: vi.fn(async (_t, ids) => ['solve', ...ids]),
  markSatGuideStudied: vi.fn(async (_t, id, on) => (on ? ['solve', id] : [])),
}))
vi.mock('../../api.js', () => api)
vi.mock('../../lib/session.js', () => ({ loadToken: () => 'tok' }))

import DesmosGuide from './DesmosGuide.jsx'

const KEY = 'jts_sat_desmos_studied'
const show = () => render(<I18nProvider><DesmosGuide seg={null} /></I18nProvider>)
const count = () => document.querySelector('.st-dg__count').textContent

describe('гид по Desmos — отметки на сервере', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })
  afterEach(cleanup)

  it('отметки приходят с сервера', async () => {
    show()
    await waitFor(() => expect(count()).toContain('1'))
    expect(api.importSatGuideStudied).not.toHaveBeenCalled()
  })

  it('старые отметки браузера переносятся один раз и стираются', async () => {
    localStorage.setItem(KEY, JSON.stringify(['system']))
    show()
    await waitFor(() => expect(api.importSatGuideStudied).toHaveBeenCalledWith('tok', ['system']))
    await waitFor(() => expect(count()).toContain('2'))
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('«Отметить изученным» сохраняется на сервере', async () => {
    show()
    await waitFor(() => expect(count()).toContain('1'))
    fireEvent.click(screen.getAllByRole('button').find((b) => /изучен/i.test(b.textContent) && b.closest('.st-dg__lesson, .st-guide__main, main, article')))
    await waitFor(() => expect(api.markSatGuideStudied).toHaveBeenCalled())
  })
})
