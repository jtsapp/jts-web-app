// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://dev-tutor.justtostudy.kz/"}
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'
import SectionClosedPage from '../screens/SectionClosedPage.jsx'
import { getMySections } from '../api.js'

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBalance: vi.fn().mockResolvedValue({ coins: 7, streak: 2, streakActiveToday: false }),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false, purchased: false })),
  getSatMeCached: vi.fn(async () => ({ access: false, purchased: false })),
  getMySections: vi.fn(),
}))

function tokenFor(role) {
  const b64 = (value) => btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 4 })}.sig`
}

// Подпись пункта — первый span: метка «new» и счётчики лежат рядом и в подпись не входят.
const labels = () => [...document.querySelectorAll('.sb__nav .sb__item > span')].map((b) => b.textContent)

describe('Sidebar — разделы по тарифу и формату', () => {
  it('закрытые разделы в меню не показываются, «Призы» и «Feedback» видны всем', async () => {
    getMySections.mockResolvedValue({
      known: true, tariff: 'SELF_STUDY', format: 'SELF',
      allowed: ['home', 'notifications', 'contracts', 'prizes', 'feedback', 'review', 'practice', 'grammar', 'vocabulary', 'speed'],
    })
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels()).toContain('Практика'))
    expect(labels()).not.toContain('Домашняя работа')
    expect(labels()).not.toContain('Speaking Buddy')
    expect(labels()).toEqual(expect.arrayContaining(['Главная', 'Повторение', 'Практика', 'Грамматика', 'Скорочтение', 'Словарь', 'Призы', 'Feedback']))
    // «Выбрать группу» — раздел `group` (ТЗ кабинетов, 14е): самостоятельному формату его не показываем.
    expect(labels()).not.toContain('Выбрать группу')
  })

  it('порядок по макету кабинета студента: Практика, Грамматика, Скорочтение, Speaking Buddy; «new» у Скорочтения, Призов и Feedback', async () => {
    getMySections.mockResolvedValue({ known: false, tariff: null, format: null, allowed: [] })
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels()).toContain('Скорочтение'))
    const all = labels()
    expect(all.indexOf('Практика')).toBeLessThan(all.indexOf('Грамматика'))
    expect(all.indexOf('Грамматика')).toBeLessThan(all.indexOf('Скорочтение'))
    expect(all.indexOf('Скорочтение')).toBeLessThan(all.indexOf('Speaking Buddy'))
    const fresh = [...document.querySelectorAll('.sb__nav .sb__item')].filter((b) => b.querySelector('.sb__badge--new')).map((b) => b.dataset.nav)
    expect(fresh).toEqual(['speed-reading', 'prizes', 'feedback'])
  })

  it('«Грамматика» и «Скорочтение» ведут на свои экраны', async () => {
    getMySections.mockResolvedValue({ known: false, tariff: null, format: null, allowed: [] })
    const onNav = vi.fn()
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={onNav} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels()).toContain('Грамматика'))
    document.querySelector('[data-nav="grammar-games"]').click()
    document.querySelector('[data-nav="speed-reading"]').click()
    expect(onNav.mock.calls.map((call) => call[0])).toEqual(['grammar-games', 'speed-reading'])
  })

  it('координатор закрыл «Грамматику» — пункта нет, «Скорочтение» остаётся', async () => {
    getMySections.mockResolvedValue({ known: true, tariff: 'GENERAL', format: 'INDIVIDUAL', allowed: ['home', 'practice', 'speed'] })
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels()).toContain('Скорочтение'))
    expect(labels()).not.toContain('Грамматика')
    expect(labels()).toContain('Скорочтение')
  })

  it('пока абонемента нет (онбординг), меню полное', async () => {
    getMySections.mockResolvedValue({ known: false, tariff: null, format: null, allowed: [] })
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels()).toContain('Уроки'))
    expect(labels()).toEqual(expect.arrayContaining(['Домашняя работа', 'Speaking Buddy']))
    // Пока абонемента нет, ученик выбирает формат — «Выбрать группу» доступна.
    expect(labels()).toContain('Выбрать группу')
  })

  it('ошибка ручки оставляет общие разделы; повтор загружает разрешённые вкладки', async () => {
    getMySections.mockRejectedValue(new Error('offline'))
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(screen.getByTestId('section-access-notice').textContent).toContain('Не удалось'))
    expect(labels()).not.toContain('Уроки')
    expect(labels()).not.toContain('Speaking Buddy')
    expect(labels()).toContain('Главная')
    expect(labels()).toContain('Договоры')
    getMySections.mockResolvedValue({ known: true, allowed: ['lessons'] })
    fireEvent.click(screen.getByRole('button', { name: 'Повторить проверку' }))
    await waitFor(() => expect(labels()).toContain('Уроки'))
    expect(screen.queryByTestId('section-access-notice')).toBeNull()
    expect(labels()).not.toContain('Speaking Buddy')
  })
})

describe('SectionClosedPage', () => {
  it('прямая ссылка на закрытый раздел: «не входит в ваш тариф» и кнопка на главную', async () => {
    const onNav = vi.fn()
    render(
      <I18nProvider>
        <SectionClosedPage active="lessons" userLevel="B1" userName="Аружан" token={tokenFor('STUDENT')} onNav={onNav} onProfile={() => {}} />
      </I18nProvider>
    )
    expect(screen.getByText('Этот раздел не входит в ваш тариф')).toBeTruthy()
    expect(screen.getByText(/Обратитесь к менеджеру/)).toBeTruthy()
    screen.getByRole('button', { name: 'На главную' }).click()
    expect(onNav).toHaveBeenCalledWith('home')
  })
})

describe('Sidebar — «Выбрать группу» по формату', () => {
  it('формат «в группе» видит раздел, индивидуальный — нет', async () => {
    getMySections.mockResolvedValue({ known: true, tariff: 'GENERAL', format: 'GROUP', allowed: ['home', 'group', 'lessons', 'homework', 'practice'] })
    const { unmount } = render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels()).toContain('Выбрать группу'))
    unmount()

    getMySections.mockResolvedValue({ known: true, tariff: 'GENERAL', format: 'INDIVIDUAL', allowed: ['home', 'teacher', 'lessons', 'homework', 'practice'] })
    render(
      <I18nProvider>
        <Sidebar userName="Аружан" userLevel="B1" token={tokenFor('STUDENT')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels()).toContain('Уроки'))
    expect(labels()).not.toContain('Выбрать группу')
    expect(labels()).toContain('Уроки')
  })

  it('преподавателю раздела нет вовсе', async () => {
    getMySections.mockResolvedValue(null)
    render(
      <I18nProvider>
        <Sidebar userName="Мадина" userLevel="B2" token={tokenFor('TEACHER')} onNav={() => {}} onProfile={() => {}} />
      </I18nProvider>
    )
    await waitFor(() => expect(labels().length).toBeGreaterThan(0))
    expect(labels()).not.toContain('Выбрать группу')
  })
})
