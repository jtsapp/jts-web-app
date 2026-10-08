// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Ученик IELTS: в «Словаре» сверху полка IELTS Vocabulary (Figma 92:6134) — наборы из банка IELTS, подписи карточек
// по прогрессу с сервера; набор открывается списком слов со статусами и кнопками повторения.
const words = [
  { id: 'ENV-01', en: 'pollution', ru: 'загрязнение', ipa: 'pəˈluːʃn' },
  { id: 'ENV-02', en: 'emission', ru: 'выброс' },
  { id: 'ENV-03', en: 'habitat', ru: 'среда обитания' },
]
vi.mock('../api.js', () => ({
  getVocabCatalog: vi.fn(async () => ({ levels: [{ id: 'A1', name: 'Elementary' }], fields: [] })),
  getVocabScope: vi.fn(),
  openLessonVocab: vi.fn(async () => ({ words: [] })),
  saveStudentVocab: vi.fn(),
  deleteStudentVocabWord: vi.fn(),
  markVocabLearned: vi.fn(),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: true })),
  getIeltsTests: vi.fn(async () => [
    { id: 'VOC-EDU', category: 'education', title: 'Education', topic: { ru: 'Образование' }, questionCount: 40 },
    { id: 'VOC-ENV', category: 'environment', title: 'Environment', topic: { ru: 'Окружающая среда' }, questionCount: 40 },
  ]),
  getIeltsTest: vi.fn(async () => ({ document: { words } })),
  getVocabProgress: vi.fn(async () => ({ 'ielts-VOC-ENV': { seen: 15, learned: 12, due: 0 }, 'ielts-VOC-EDU': { seen: 10, learned: 4, due: 6 } })),
  getVocabProgressWords: vi.fn(async () => ({ 'env-01': { box: 3, learned: true, due: false }, 'env-02': { box: 1, learned: false, due: true } })),
  saveVocabProgress: vi.fn(async () => ({})),
}))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../practice/usePracticeEntitlement.js', () => ({ usePracticeEntitlement: () => ({ loading: false, allowed: true }) }))
vi.mock('../tutor/OnboardingTour.jsx', () => ({ default: () => null, useScreenTour: () => ({ open: false }) }))

import VocabularyPage from './VocabularyPage.jsx'

describe('Словарь — IELTS Vocabulary', () => {
  it('полка тем с прогрессом и экран набора', async () => {
    render(<I18nProvider><VocabularyPage token="x.eyJzdWIiOiIxIn0.y" userLevel="B1" /></I18nProvider>)
    expect(await screen.findByText('IELTS Vocabulary')).toBeTruthy()
    // порядок — как в макете (Environment первым), подписи — по прогрессу
    const cards = document.querySelectorAll('.vp-ielts-card b')
    expect([...cards].map((b) => b.textContent)).toEqual(['Environment', 'Education'])
    expect(screen.getByText('12 из 40 изучено')).toBeTruthy()
    expect(screen.getByText('6 слов к повторению')).toBeTruthy()

    fireEvent.click(screen.getByText('Environment'))
    expect(await screen.findByText('pollution')).toBeTruthy()
    expect(screen.getByText('Изучено', { selector: '.vp-iset__st' })).toBeTruthy()
    expect(screen.getByText('К повторению', { selector: '.vp-iset__st' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Повторить 1/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Учить новые · 1/ })).toBeTruthy()
  })
})
