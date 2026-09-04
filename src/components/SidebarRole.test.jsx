// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'

// Баланс тянется с бэкенда — в тесте сети нет, и без заглушки компонент
// уронил бы необработанный reject.
vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBalance: vi.fn().mockResolvedValue({ coins: 0, streak: 0, streakActiveToday: false }),
  // Сайдбар спрашивает демо-статус сам — пункт «Главная» и плашка скидки.
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
}))

function tokenFor(role) {
  const b64 = (value) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 1 })}.sig`
}

function renderSidebar(role) {
  return render(
    <I18nProvider>
      <Sidebar userName="Айгуль" userLevel="A2" token={tokenFor(role)} onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

// Аудит нашёл ровно это: преподаватель видел «Ты Рыцарь A1», стрик, монеты и
// все ученические разделы — сущности, которых у него нет.
describe('Sidebar — преподаватель', () => {
  it('не показывает уровень, роль в королевстве, стрик и монеты', () => {
    const { container } = renderSidebar('TEACHER')
    expect(container.querySelector('.sb__role')).toBeNull()
    expect(container.querySelector('.sb__balance')).toBeNull()
  })

  // «Практика» открыта преподавателю по просьбе самих преподавателей: заданий
  // там больше, чем в уроках, а выдать их на дом было неоткуда. Остальные
  // ученические разделы (Тьютор, IELTS, Словарь, Обучение, Домашняя работа)
  // по-прежнему скрыты — это его собственное обучение, которого у него нет.
  it('оставляет из разделов «Уроки» и «Практику»', () => {
    const { container } = renderSidebar('TEACHER')
    const labels = [...container.querySelectorAll('.sb__item')].map((el) => el.textContent)
    expect(labels).toHaveLength(2)
    expect(labels.some((l) => /урок/i.test(l))).toBe(true)
    expect(labels.some((l) => /практик/i.test(l))).toBe(true)
    expect(labels.some((l) => /словар|тьютор|ielts/i.test(l))).toBe(false)
  })

  it('профиль остаётся — он нужен обеим ролям', () => {
    const { container } = renderSidebar('TEACHER')
    expect(container.querySelector('.sb__profile')).toBeTruthy()
    expect(screen.getByText('Айгуль')).toBeTruthy()
  })
})

describe('Sidebar — ученик', () => {
  it('видит геймификацию и все разделы', () => {
    const { container } = renderSidebar('STUDENT')
    expect(container.querySelector('.sb__role')).toBeTruthy()
    expect(container.querySelector('.sb__balance')).toBeTruthy()
    expect(container.querySelectorAll('.sb__item').length).toBeGreaterThan(1)
  })

  // Без токена (или с битым) роль неизвестна — показываем ученический вид:
  // это дефолт приложения, и он безопаснее, чем спрятать разделы у всех.
  it('без токена остаётся ученический вид', () => {
    const { container } = render(
      <I18nProvider>
        <Sidebar userName="Гость" onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    expect(container.querySelectorAll('.sb__item').length).toBeGreaterThan(1)
  })
})
