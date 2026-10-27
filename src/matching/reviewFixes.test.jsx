// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRef } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getMatchingTeacher: vi.fn(async () => null),
  getMatchingTeacherPhoto: vi.fn(async () => null),
  confirmMatchingSchedule: vi.fn(),
  counterMatchingSchedule: vi.fn(),
  requestTeacherChange: vi.fn(),
  getStudentMatching: vi.fn(async () => ({ status: 'unavailable' })),
  getMatchingHandoffs: vi.fn(async () => []),
}))
vi.mock('./matchingStore.js', async (importOriginal) => ({
  ...(await importOriginal()),
  refreshMatching: vi.fn(async () => {}),
}))
import * as api from '../api.js'
import { refreshMatching } from './matchingStore.js'
import { errorText } from './ui.jsx'
import ConfirmCard from './ConfirmCard.jsx'
import { ChangeTeacherModal } from './ChangeModals.jsx'
import { useDialogKeys } from '../lib/useDialogKeys.js'
import { draftIsCurrent, loadDraft, saveDraft } from './wizardDraft.js'
import { lessonsInPeriod } from '../screens/MyTeacherPage.jsx'

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)
const rejected = (code) => Object.assign(new Error('x'), { status: 409, code, serverMessage: 'Лимит учеников; Нет доступа General' })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('errorText', () => {
  const t = (k) => k
  it('берёт текст из словаря по коду, а не текст сервера с внутренними причинами', () => {
    expect(errorText(rejected('slot_taken'), t)).toBe('error.slot_taken')
    expect(errorText(rejected('teacher_unavailable'), t)).toBe('error.teacher_unavailable')
    expect(errorText(rejected(undefined), t)).toBe('error.generic')
    expect(errorText({ serverMessage: 'Лимит учеников' }, t)).toBe('error.generic')
  })
})

describe('ConfirmCard — встречное время', () => {
  const view = {
    status: 'change_requested',
    tariff: { duration: 60, perWeek: 2 },
    counter: { slots: [{ weekday: 2, start: '14:00:00' }], expiresAt: '2026-10-28T10:00:00' },
    proposal: {
      teacherId: 3, teacherName: 'Айгерим', by: 'teacher', deadline: '2026-10-27T15:00:00',
      slots: [{ weekday: 1, start: '14:00:00' }, { weekday: 3, start: '14:00:00' }],
      commonSlots: [{ weekday: 1, start: '14:00:00' }, { weekday: 3, start: '14:00:00' }],
    },
  }

  it('пока учитель отвечает на другое время, прежнее можно подтвердить', () => {
    wrap(<ConfirmCard token="t" view={view} tz="Asia/Almaty" onDone={() => {}} />)
    expect(screen.getByRole('button', { name: 'Подтвердить расписание' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Выбрать другое время' })).toBeNull()
  })

  it('отказ сервера: текст из словаря и перечитанная карточка', async () => {
    api.confirmMatchingSchedule.mockRejectedValue(rejected('slot_taken'))
    wrap(<ConfirmCard token="t" view={view} tz="Asia/Almaty" onDone={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить расписание' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Это время уже заняли')
    expect(screen.getByRole('alert').textContent).not.toContain('Лимит учеников')
    expect(refreshMatching).toHaveBeenCalledWith('t')
  })
})

describe('ChangeTeacherModal — лимит со стороны сервера', () => {
  it('limit_reached показывает путь через менеджера', async () => {
    api.requestTeacherChange.mockRejectedValue(rejected('limit_reached'))
    wrap(<ChangeTeacherModal token="t" limits={{ teacherChangesLeft: 2 }} onClose={() => {}} onSent={() => {}} onContact={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Отправить запрос' }))
    expect(await screen.findByText('Дальнейшая смена — через менеджера')).toBeTruthy()
    expect(refreshMatching).toHaveBeenCalled()
  })
})

function Dialog() {
  const ref = useRef(null)
  useDialogKeys(ref, () => {})
  return (
    <div ref={ref}>
      <button type="button">Первая</button>
      <textarea aria-label="Текст" />
      <button type="button">Отмена</button>
      <button type="button" disabled>Отправить</button>
    </div>
  )
}

describe('useDialogKeys', () => {
  it('поле ввода входит в замок, выключенная кнопка — нет', () => {
    render(<Dialog />)
    const first = screen.getByText('Первая')
    const cancel = screen.getByText('Отмена')
    cancel.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancel)
    // textarea — не край, Tab с неё браузер ведёт сам
    screen.getByLabelText('Текст').focus()
    const e = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    document.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
  })
})

describe('черновик мастера', () => {
  it('черновик старше смены статуса карточки не используется', () => {
    saveDraft(7, { step: 'teacher', format: null, slots: [], interests: [], choices: [3] })
    const d = loadDraft(7)
    expect(draftIsCurrent(d, '2000-01-01T00:00:00')).toBe(true)
    expect(draftIsCurrent(d, '2999-01-01T00:00:00')).toBe(false)
    expect(draftIsCurrent(loadDraft(null), null)).toBe(false)
  })
})

describe('lessonsInPeriod', () => {
  it('день урока — по Алматы, как даты отпуска', () => {
    // вс 19:00 UTC = пн 00:00 в Алматы: попадает в отпуск, который начинается в понедельник 02.11
    expect(lessonsInPeriod([{ weekday: 7, start: '19:00:00' }], '2026-11-02', '2026-11-02')).toBe(1)
    expect(lessonsInPeriod([{ weekday: 7, start: '19:00:00' }], '2026-11-01', '2026-11-01')).toBe(0)
  })
})
