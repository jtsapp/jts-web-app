// @vitest-environment jsdom
// Ревью 08.10.2026, «Мой словарь» на главной Словаря:
//  - бэкенд отдаёт сохранённые слова от старых к новым, а полоса показывала
//    первые восемь — у ученика с 8+ словами только что сохранённое не
//    появлялось («не получается добавить слово в словарь»);
//  - ошибка загрузки глоталась, и экран писал «Пока нет сохранённых слов».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const api = vi.hoisted(() => ({ mine: null, fail: false }))

vi.mock('../api.js', () => ({
  getVocabCatalog: vi.fn(async () => ({ levels: [{ id: 'A1', name: 'Starter' }], fields: [] })),
  getVocabScope: vi.fn(async () => ({ units: [], lessons: {} })),
  openLessonVocab: vi.fn(async () => {
    if (api.fail) throw Object.assign(new Error('boom'), { status: 502 })
    return api.mine
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
const word = (n) => ({ id: n, word: `word${n}`, translationRu: `слово${n}` })

function open() {
  return render(
    <I18nProvider>
      <VocabularyPage token={TOKEN} userLevel="A1" />
    </I18nProvider>,
  )
}

describe('«Мой словарь» на главной', () => {
  beforeEach(() => {
    api.fail = false
    api.mine = null
  })

  it('только что сохранённое слово — в полосе первым', async () => {
    // id растут: 1 — самое старое, 10 — только что из книги.
    api.mine = { words: Array.from({ length: 10 }, (_, i) => word(i + 1)) }
    const { container } = open()
    const chips = await waitFor(() => {
      const list = [...container.querySelectorAll('.vp-mine-chip b')].map((b) => b.textContent)
      if (!list.length) throw new Error('нет слов')
      return list
    })
    expect(chips[0]).toBe('word10')
    expect(chips).toContain('word10')
    expect(chips).not.toContain('word1')
  })

  it('ошибка загрузки — не «пока нет слов»', async () => {
    api.fail = true
    const { container } = open()
    await waitFor(() => {
      const msg = container.querySelector('#vsec-mine .vp-state')
      if (!msg) throw new Error('нет сообщения')
      expect(msg.textContent).not.toMatch(/Пока нет/)
      expect(msg.textContent).toMatch(/Не удалось/)
    })
  })
})
