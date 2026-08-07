// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import CatalogPicker from './CatalogPicker.jsx'
import { getCourseCatalog } from '../../api.js'

vi.mock('../../api.js', () => ({ getCourseCatalog: vi.fn() }))

const CATALOG = [
  {
    id: 1,
    code: 'A2',
    label: 'Pre-Intermediate A2',
    units: [
      {
        id: 11,
        name: 'Unit 1 — Daily life',
        lessons: [
          { id: 101, code: 'L01', title: 'Getting to know you', type: 'LESSON', fileUrl: 'https://x/L01.html' },
          { id: 102, code: 'R01', title: 'Unit 1 Review Test', type: 'REVIEW', fileUrl: 'https://x/R01.html' },
        ],
      },
      {
        id: 12,
        name: 'Unit 2 — Street life',
        lessons: [
          { id: 103, code: 'L04', title: 'My neighbourhood', type: 'LESSON', fileUrl: 'https://x/L04.html' },
          { id: 104, code: 'L05', title: 'Locked one', type: 'LESSON', locked: true },
        ],
      },
    ],
  },
]

function renderPicker(props = {}) {
  return render(
    <I18nProvider>
      <CatalogPicker token="t" onPick={() => {}} onClose={() => {}} {...props} />
    </I18nProvider>
  )
}

beforeEach(() => {
  getCourseCatalog.mockReset()
  getCourseCatalog.mockResolvedValue(CATALOG)
})

describe('CatalogPicker', () => {
  it('по умолчанию раскрывает только первый юнит', async () => {
    renderPicker()
    await waitFor(() => expect(screen.getByText('Getting to know you')).toBeTruthy())
    expect(screen.queryByText('My neighbourhood')).toBeNull()
  })

  it('разворачивает юнит по клику на шапку', async () => {
    renderPicker()
    await waitFor(() => expect(screen.getByText('Unit 2 — Street life')).toBeTruthy())
    fireEvent.click(screen.getByText('Unit 2 — Street life'))
    expect(screen.getByText('My neighbourhood')).toBeTruthy()
  })

  // Иначе найденное прячется под свёрнутыми шапками и выглядит как «ничего нет».
  it('поиск раскрывает всё найденное и прячет остальное', async () => {
    renderPicker()
    await waitFor(() => expect(screen.getByText('Getting to know you')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText(/найти урок/i), { target: { value: 'neighbourhood' } })
    expect(screen.getByText('My neighbourhood')).toBeTruthy()
    expect(screen.queryByText('Getting to know you')).toBeNull()
  })

  it('сообщает, когда поиск ничего не нашёл', async () => {
    renderPicker()
    await waitFor(() => expect(screen.getByText('Getting to know you')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText(/найти урок/i), { target: { value: 'zzz' } })
    expect(screen.getByText(/ничего не найдено/i)).toBeTruthy()
  })

  it('тип урока показан словом, а не эмодзи', async () => {
    renderPicker()
    await waitFor(() => expect(screen.getByText('Unit 1 Review Test')).toBeTruthy())
    expect(screen.getByText('Повторение')).toBeTruthy()
    expect(screen.queryByText(/📘|🏆|▶/)).toBeNull()
  })

  it('отдаёт выбранный урок целиком — вызывающему нужен fileUrl', async () => {
    const onPick = vi.fn()
    renderPicker({ onPick })
    await waitFor(() => expect(screen.getByText('Getting to know you')).toBeTruthy())
    fireEvent.click(screen.getByText('Getting to know you'))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 101, fileUrl: 'https://x/L01.html' }))
  })

  // Закрытый урок остаётся в списке: спрятать — значит оставить в программе
  // необъяснимый пропуск.
  it('закрытый урок показан, но не выбирается', async () => {
    const onPick = vi.fn()
    renderPicker({ onPick })
    await waitFor(() => expect(screen.getByText('Unit 2 — Street life')).toBeTruthy())
    fireEvent.click(screen.getByText('Unit 2 — Street life'))
    const locked = screen.getByText('Locked one').closest('button')
    expect(locked.disabled).toBe(true)
    fireEvent.click(locked)
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByText('Закрыт')).toBeTruthy()
  })

  it('сообщает об ошибке загрузки, а не показывает пустоту', async () => {
    getCourseCatalog.mockRejectedValue(new Error('нет сети'))
    renderPicker()
    await waitFor(() => expect(screen.getByText(/не удалось/i)).toBeTruthy())
  })
})
