// @vitest-environment jsdom
// «Открой урок 2 воркбука A0» (Луна, lib/assistant/items/refs.js): цель несёт номер
// урока, и экран открывает его сам, когда доехал индекс уровня. Номера нет — каталог.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ allowed: true, loading: false, check: async () => true }),
}))
vi.mock('../lib/useTimeOnTask.js', () => ({ useTimeOnTask: () => {} }))

import WorkbookPage from './WorkbookPage.jsx'

const INDEX = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/practice/workbook/a0/index.json'), 'utf8'))

beforeEach(() => {
  localStorage.clear()
  globalThis.fetch = vi.fn(async (url) => {
    const file = path.join(process.cwd(), 'public', String(url).split('?')[0])
    if (!fs.existsSync(file)) return { ok: false, status: 404, json: async () => null }
    return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) }
  })
})

const asked = (part) => fetch.mock.calls.some(([url]) => String(url).includes(part))

const open = (target) =>
  render(
    <I18nProvider>
      <WorkbookPage userName="T" userLevel="A0" token={null} initialTarget={target} onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )

describe('WorkbookPage — урок по цели', () => {
  it('lesson открывает урок, а не каталог юнитов', async () => {
    const { container } = open({ level: 'a0', lesson: 2 })
    await waitFor(() => expect(asked('lesson-2.json')).toBe(true))
    await waitFor(() => expect(container.querySelector('.wb-units, [class*="wb-unit"]')).toBeNull())
    expect(container.textContent).toContain(INDEX.lessons['2'].title)
  })

  it('номера нет в индексе — остаётся каталог', async () => {
    const { container } = open({ level: 'a0', lesson: 999 })
    await waitFor(() => expect(container.textContent).toContain(INDEX.lessons['1'].title))
    expect(asked('lesson-')).toBe(false)
  })
})
