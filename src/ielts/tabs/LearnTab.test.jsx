// @vitest-environment jsdom
//
// Квоту IELTS тратит только ИИ-оценка Writing и Speaking (src/lib/ielts/quota.js, роуты оценки), поэтому при
// исчерпанной квоте вкладка «Обучение» не запирает ни одной секции — замок стоит на оценке, а не на входе.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../practice/usePracticeEntitlement.js', () => ({
  useIeltsEntitlement: () => ({ loading: false, allowed: false, limit: 1, used: 1, source: 'DEMO' }),
}))

import LearnTab from './LearnTab.jsx'

const catalog = { status: 'ready', items: [] }

function renderTab() {
  render(
    <I18nProvider>
      <LearnTab token="TOK" catalog={catalog} track="academic" onOpenReading={() => {}} onGo={() => {}} />
    </I18nProvider>,
  )
}

describe('LearnTab: исчерпанная квота не запирает вход в задания', () => {
  it('Reading и Listening — кнопки', () => {
    renderTab()
    expect(screen.getByText('Задания Reading').closest('.ih-skill__row').tagName).toBe('BUTTON')
    expect(screen.getByText('Задания Listening').closest('.ih-skill__row').tagName).toBe('BUTTON')
  })

  // Writing из банка (часть 3): писать, сверять с моделью и проверять себя можно и без квоты — её тратит только
  // ИИ-проверка, и её запирает серверный роут оценки (429), а не вход в задания
  it('задания Writing и Speaking открыты и при исчерпанной квоте', () => {
    renderTab()
    expect(screen.getByText('Task 2 · эссе').closest('.ih-skill__row').tagName).toBe('BUTTON')
    expect(screen.getByText('Part 1 · Вопросы о себе').closest('.ih-skill__row').tagName).toBe('BUTTON')
  })
})
