// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const catalog = vi.fn()

vi.mock('../api.js', () => ({
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getCourseCatalog: vi.fn(async (...args) => catalog(...args)),
}))

import CourseCatalogPage from './CourseCatalogPage.jsx'

const level = (lessons) => ([{ level: 'A0', label: 'A0', units: [{ id: 1, name: 'Lessons 1–3', lessons }] }])

function show(onOpenLesson = () => {}) {
  return render(
    <I18nProvider>
      <CourseCatalogPage token="TOK" userName="Тест" onNav={() => {}} onProfile={() => {}} onOpenLesson={onOpenLesson} />
    </I18nProvider>
  )
}

describe('CourseCatalogPage', () => {
  it('показывает человеческое название типа урока, а не ключ словаря', async () => {
    // Бэкенд отдаёт тип именем enum'а — в верхнем регистре.
    catalog.mockResolvedValue(level([{ id: 10, code: 'L02', title: 'Two hellos', type: 'LESSON' }]))
    show()

    await waitFor(() => expect(screen.getByText('Two hellos')).toBeTruthy())
    expect(screen.getByText('Урок')).toBeTruthy()
    expect(screen.queryByText(/catalog\.type/)).toBeNull()
  })

  it('урок с единственным режимом открывается прежней кнопкой', async () => {
    catalog.mockResolvedValue(level([{ id: 10, code: 'L02', title: 'Two hellos', type: 'LESSON', mode: 'SELF_STUDY' }]))
    const onOpen = vi.fn()
    show(onOpen)

    await waitFor(() => expect(screen.getByText('Two hellos')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Открыть' }))

    expect(onOpen).toHaveBeenCalledWith(10)
  })

  it('три режима одного урока — одна строка с выбором режима', async () => {
    catalog.mockResolvedValue(level([
      { id: 10, code: 'L02', title: 'Two hellos', type: 'LESSON', mode: 'SELF_STUDY' },
      { id: 11, code: 'L02-1TO1', title: 'Two hellos', type: 'LESSON', mode: 'ONE_TO_ONE' },
      { id: 12, code: 'L02-GROUP', title: 'Two hellos', type: 'LESSON', mode: 'GROUP' },
    ]))
    const onOpen = vi.fn()
    show(onOpen)

    // Название один раз, а не трижды: раньше каждый режим был отдельной строкой.
    await waitFor(() => expect(screen.getAllByText('Two hellos')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'Самостоятельно' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Группа' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '1 на 1' }))
    expect(onOpen).toHaveBeenCalledWith(11)
  })
})
