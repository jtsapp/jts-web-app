// @vitest-environment jsdom
// Ревью 08.10.2026: задание непривычного формата (57 «Sort» B1) роняло при
// рендере всё приложение — вокруг урока грамматики не было границы ошибок,
// ученик видел белый экран без сайдбара и кнопки «назад». Формат починен в
// activityShape.js, а граница нужна на случай следующего такого расхождения.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  completeLessonModule: vi.fn(async () => ({})),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0 })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
}))

// Задание, которое плеер точно не нарисует: у «собери предложение» нет банка.
vi.mock('../practice/grammar/grammarData.js', () => ({
  loadGrammarLevel: vi.fn(async () => ({
    units: { 7: { learn: [{ title: 'Rule', html: '<p>rule</p>' }], learnTr: [], activities: [{ type: 'order', words: null, answer: 'x' }] } },
  })),
}))

import GrammarLesson from './GrammarLesson.jsx'

describe('GrammarLesson — падение задания не роняет приложение', () => {
  it('вместо белого экрана — «урок не открылся» и выход', async () => {
    const onExit = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <I18nProvider>
        <GrammarLesson level="b1" units={[{ id: 7 }]} unit={{ id: 7 }} token={null} onExit={onExit} onOpenUnit={() => {}} />
      </I18nProvider>,
    )
    await waitFor(() => screen.getByRole('button', { name: 'Практика' }))
    fireEvent.click(screen.getByRole('button', { name: 'Практика' }))
    expect(screen.getByRole('alert').textContent).toMatch(/Урок не открылся/)
    // Шапка урока осталась — выйти можно.
    expect(screen.getAllByRole('button', { name: /Назад/ }).length).toBeGreaterThan(0)
  })
})
