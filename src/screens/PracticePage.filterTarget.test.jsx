// @vitest-environment jsdom
// «Практика» открывается сразу на нужном разделе, если переход несёт фильтр
// (плитка «Книги» на «Главной»): иначе ученик попадал в общую ленту и искал
// раздел заново.
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(
    Object.keys(actual).map((k) => [k, typeof actual[k] === 'function' ? vi.fn(async () => []) : actual[k]]),
  )
})

import PracticePage from './PracticePage.jsx'

function renderWith(openTarget) {
  return render(
    <I18nProvider>
      <PracticePage userLevel="A1" userName="Тест" token="T" openTarget={openTarget} onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
}

const activeChip = (container) => container.querySelector('.pp-chip--on')?.textContent

describe('PracticePage — фильтр из перехода', () => {
  it('открывается на книгах', async () => {
    const { container } = renderWith({ filter: 'books' })
    await waitFor(() => expect(activeChip(container)).toMatch(/книж/i))
  })

  it('без фильтра — общая лента', async () => {
    const { container } = renderWith(null)
    await waitFor(() => expect(container.querySelector('.pp-chip--on')).toBeTruthy())
    expect(activeChip(container)).toMatch(/все/i)
  })

  it('незнакомый фильтр игнорируется', async () => {
    const { container } = renderWith({ filter: 'nope' })
    await waitFor(() => expect(container.querySelector('.pp-chip--on')).toBeTruthy())
    expect(activeChip(container)).toMatch(/все/i)
  })
})
