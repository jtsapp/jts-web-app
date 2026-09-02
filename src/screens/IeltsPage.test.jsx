// @vitest-environment jsdom
//
// Регрессия ревью: коммит 7039dba развёл секции IELTS на бэкенде - квоту
// теперь тратят только Speaking и Writing, Reading/Listening проверяются
// локально и ничего не стоят (см. src/lib/ielts/quota.js). Но экран запирал
// все четыре модуля одним общим флагом outOfAttempts - демо-ученик,
// исчерпавший квоту на Speaking/Writing, терял доступ и к бесплатным
// Reading/Listening, хотя цель бэкенд-правки была именно в обратном.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// LearningLayout тянет Sidebar (getBalance) и NotificationBell
// (getUnreadNotificationCount) - без заглушки эти сетевые вызовы валят экран
// (см. тот же приём в CourseCatalogPage.test.jsx).
vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  // Сайдбар спрашивает демо-статус сам — пункт «Главная» и плашка скидки.
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
}))

// Фиксируем состояние «квота исчерпана» без реального похода в сеть -
// useIeltsEntitlement сам по себе не тестируется здесь, тестируется только
// то, как экран реагирует на allowed:false.
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  useIeltsEntitlement: () => ({
    loading: false,
    allowed: false,
    limit: 1,
    used: 1,
    source: 'DEMO',
    sourceName: 'Demo',
  }),
}))

import IeltsPage from './IeltsPage.jsx'

function renderIeltsPage() {
  render(
    <I18nProvider>
      <IeltsPage token="TOK" userName="Тест" onNav={() => {}} onProfile={() => {}} onGo={() => {}} />
    </I18nProvider>
  )
}

describe('IeltsPage: замок при исчерпанной квоте бьёт только по платным секциям', () => {
  it('Reading и Listening остаются кликабельными карточками', () => {
    renderIeltsPage()

    const reading = screen.getByText('Reading').closest('.ie-mod')
    const listening = screen.getByText('Listening').closest('.ie-mod')

    // Живая (некликабельная) карточка рендерится как div, доступная - как
    // button (см. IeltsPage.jsx: `live && !outOfAttempts ? <button> : <div>`).
    expect(reading.tagName).toBe('BUTTON')
    expect(listening.tagName).toBe('BUTTON')
  })

  it('Speaking и Writing заблокированы', () => {
    renderIeltsPage()

    const speaking = screen.getByText('Speaking').closest('.ie-mod')
    const writing = screen.getByText('Writing').closest('.ie-mod')

    expect(speaking.tagName).toBe('DIV')
    expect(writing.tagName).toBe('DIV')
  })
})
