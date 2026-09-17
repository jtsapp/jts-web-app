// @vitest-environment jsdom
// Фоновое обновление кэша словаря не должно двигать экран. Кэш отвечает сразу,
// свежая версия приходит позже через onFresh — и раньше она заново ставила
// экран: ученик успевал открыть урок, а его выбрасывало на список уроков.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const SCOPE = {
  units: [{ no: 1, title: 'Unit 1', lessons: [1] }],
  lessons: { 1: { no: 1, title: 'Hello', cards: [{ id: 'c1', en: 'hello', ru: 'привет' }] } },
}
const late = { scope: null, mine: null }

vi.mock('../api.js', () => ({
  getVocabCatalog: vi.fn(async () => ({ levels: [{ id: 'A1', name: 'Starter' }], fields: [] })),
  getVocabScope: vi.fn(async (_t, _id, onFresh) => {
    late.scope = onFresh
    return SCOPE
  }),
  openLessonVocab: vi.fn(async (_id, _t, onFresh) => {
    if (onFresh) late.mine = onFresh
    return { words: [] }
  }),
  saveStudentVocab: vi.fn(),
  deleteStudentVocabWord: vi.fn(),
  markVocabLearned: vi.fn(async () => {}),
}))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ loading: false, allowed: true }),
}))
vi.mock('../tutor/OnboardingTour.jsx', () => ({ default: () => null, useScreenTour: () => ({ open: false }) }))

import VocabularyPage from './VocabularyPage.jsx'

const TOKEN = 'x.eyJzdWIiOiIxIn0.y'

describe('VocabularyPage — поздний ответ кэша', () => {
  it('открытый урок остаётся открытым', async () => {
    const { container } = render(
      <I18nProvider>
        <VocabularyPage token={TOKEN} userLevel="A1" />
      </I18nProvider>,
    )
    const card = await waitFor(() => {
      const el = container.querySelector('.vp-lvl-card[data-lv="A1"]')
      if (!el) throw new Error('нет карточки уровня')
      return el
    })
    fireEvent.click(card)
    fireEvent.click(await waitFor(() => {
      const el = container.querySelector('.vp-lesson')
      if (!el) throw new Error('нет урока')
      return el
    }))
    expect(container.querySelector('.vp-lesson')).toBeNull()

    await act(async () => late.scope?.(SCOPE))

    // Свежий набор пришёл — но урок по-прежнему открыт, а не список уроков.
    expect(container.querySelector('.vp-lesson')).toBeNull()
    expect(screen.getAllByText('hello').length).toBeGreaterThan(0)
  })
})
