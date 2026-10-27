// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getMatchingTeacher: vi.fn(async () => null),
  getMatchingTeacherPhoto: vi.fn(async () => null),
  confirmMatchingSchedule: vi.fn(async () => ({ apiVersion: 2, matchStatus: 'done' })),
  counterMatchingSchedule: vi.fn(async () => ({ apiVersion: 2, matchStatus: 'confirm', requests: [] })),
  requestTeacherChange: vi.fn(async () => ({ apiVersion: 2, matchStatus: 'change' })),
  getStudentMatching: vi.fn(async () => ({ status: 'unavailable' })),
  getMatchingHandoffs: vi.fn(async () => []),
}))
import * as api from '../api.js'
import TimeGrid from './TimeGrid.jsx'
import TeacherCard from './TeacherCard.jsx'
import ConfirmCard from './ConfirmCard.jsx'
import InterestsPicker from './InterestsPicker.jsx'
import TeacherProfileModal from './TeacherProfileModal.jsx'
import { ChangeTeacherModal } from './ChangeModals.jsx'

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('TimeGrid', () => {
  const cells = [
    { weekday: 1, start: '14:00:00', teacherIds: [3, 4, 5] },
    { weekday: 3, start: '14:00:00', teacherIds: [3] },
  ]

  it('shows counts, disables empty cells and toggles picks', () => {
    const onChange = vi.fn()
    wrap(<TimeGrid cells={cells} duration={60} tz="Asia/Almaty" picked={[]} onChange={onChange} />)
    const mon = screen.getByRole('button', { name: /Пн 19:00: свободно 3/ })
    expect(mon.classList.contains('mt-slot--many')).toBe(true)
    expect(screen.getByRole('button', { name: /Ср 19:00: свободно 1/ }).classList.contains('mt-slot--few')).toBe(true)
    expect(screen.getByRole('button', { name: /Вт 19:00: свободно 0/ }).disabled).toBe(true)
    fireEvent.click(mon)
    expect(onChange).toHaveBeenCalledWith(['1-14:00'])
  })

  it('half-hour starts for a 30-minute plan', () => {
    wrap(<TimeGrid cells={cells} duration={30} tz="Asia/Almaty" picked={[]} onChange={() => {}} />)
    expect(screen.getAllByRole('button', { name: /19:30/ })).toHaveLength(7)
  })
})

describe('TeacherCard', () => {
  const teacher = {
    id: 3, name: 'Айгерим Сапарова', yearsExperience: 4, specializations: ['General English'], sinceYear: 2023,
    isNew: false, matchPercent: 86, about: 'О себе', interests: ['Аниме', 'Футбол'], formats: ['platform'],
    slots: [{ weekday: 1, start: '14:00:00' }], hasPhoto: false,
  }

  it('shows matching time k of M, common interests and no student count', () => {
    const onPick = vi.fn()
    wrap(<TeacherCard token="t" teacher={teacher} tz="Asia/Almaty" pickedTotal={3} priority={-1} canPick myInterests={['Аниме']} onPick={onPick} onUnpick={() => {}} onProfile={() => {}} />)
    expect(screen.getByText(/Пн 19:00/)).toBeTruthy()
    expect(screen.getByText('(1 из 3)')).toBeTruthy()
    expect(screen.getByText('Аниме').classList.contains('mt-tag--hit')).toBe(true)
    expect(screen.getByText('Футбол').classList.contains('mt-tag--hit')).toBe(false)
    expect(screen.queryByText(/учеников/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать' }))
    expect(onPick).toHaveBeenCalledWith(3)
  })

  it('a fourth pick stays clickable for the limit toast but looks disabled', () => {
    const onPick = vi.fn()
    wrap(<TeacherCard token="t" teacher={teacher} tz="Asia/Almaty" pickedTotal={3} priority={-1} canPick={false} myInterests={[]} onPick={onPick} onUnpick={() => {}} onProfile={() => {}} />)
    const b = screen.getByRole('button', { name: 'Выбрать' })
    expect(b.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(b)
    expect(onPick).toHaveBeenCalled()
  })
})

describe('ConfirmCard', () => {
  const view = {
    status: 'schedule_proposed',
    tariff: { duration: 60, perWeek: 2 },
    proposal: {
      teacherId: 3, teacherName: 'Айгерим', by: 'teacher', deadline: '2026-10-27T15:00:00',
      slots: [{ weekday: 1, start: '14:00:00' }, { weekday: 3, start: '14:00:00' }],
      commonSlots: [{ weekday: 1, start: '14:00:00' }, { weekday: 3, start: '14:00:00' }, { weekday: 4, start: '14:00:00' }],
    },
  }

  it('confirms once even on a double click', async () => {
    const onDone = vi.fn()
    wrap(<ConfirmCard token="t" view={view} tz="Asia/Almaty" onDone={onDone} />)
    const b = screen.getByRole('button', { name: 'Подтвердить расписание' })
    fireEvent.click(b)
    fireEvent.click(b)
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(api.confirmMatchingSchedule).toHaveBeenCalledTimes(1)
  })

  it('other time: only common slots, exactly N on different days', async () => {
    wrap(<ConfirmCard token="t" view={view} tz="Asia/Almaty" onDone={() => {}} toast={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать другое время' }))
    const send = screen.getByRole('button', { name: 'Отправить учителю на согласование' })
    expect(send.disabled).toBe(false)
    const chips = screen.getAllByRole('button', { name: /19:00/ }).filter((b) => b.classList.contains('mt-chip'))
    expect(chips).toHaveLength(3)
    fireEvent.click(chips[0])
    expect(send.disabled).toBe(true)
    fireEvent.click(chips[2])
    expect(send.disabled).toBe(false)
    fireEvent.click(send)
    await waitFor(() => expect(api.counterMatchingSchedule).toHaveBeenCalledWith('t', [
      { weekday: 3, start: '14:00:00' }, { weekday: 4, start: '14:00:00' },
    ]))
  })

  it('offers adding time when there are not enough shared hours', () => {
    const onAddTime = vi.fn()
    const few = { ...view, proposal: { ...view.proposal, commonSlots: [{ weekday: 1, start: '14:00:00' }] } }
    wrap(<ConfirmCard token="t" view={few} tz="Asia/Almaty" onAddTime={onAddTime} />)
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать другое время' }))
    fireEvent.click(screen.getByRole('button', { name: 'Добавить время' }))
    expect(onAddTime).toHaveBeenCalled()
  })
})

describe('InterestsPicker', () => {
  it('refuses the sixth interest', () => {
    const onLimit = vi.fn()
    const onChange = vi.fn()
    wrap(<InterestsPicker value={['Аниме', 'K-pop', 'Музыка', 'Игры', 'Книги']} onChange={onChange} onLimit={onLimit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Наука' }))
    expect(onLimit).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('ChangeTeacherModal', () => {
  it('a complaint needs a comment', () => {
    wrap(<ChangeTeacherModal token="t" limits={{ teacherChangesLeft: 2 }} onClose={() => {}} onSent={() => {}} />)
    fireEvent.click(screen.getByLabelText(/Жалоба на учителя/))
    expect(screen.getByRole('button', { name: 'Отправить запрос' }).disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Опоздал дважды' } })
    expect(screen.getByRole('button', { name: 'Отправить запрос' }).disabled).toBe(false)
  })

  it('after two changes in 90 days it sends to the manager', () => {
    wrap(<ChangeTeacherModal token="t" limits={{ teacherChangesLeft: 0 }} onClose={() => {}} onSent={() => {}} onContact={() => {}} />)
    expect(screen.getByText('Дальнейшая смена — через менеджера')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Отправить запрос' })).toBeNull()
    cleanup()
  })
})

describe('TeacherProfileModal', () => {
  it('shows no phone, no chat button, no video and no student count', async () => {
    api.getMatchingTeacher.mockResolvedValue({
      card: { id: 3, name: 'Айгерим Сапарова', matchPercent: 86, specializations: ['General English'], yearsExperience: 4,
        formats: ['platform'], interests: ['Аниме'], levels: ['A0', 'B1–B2'], sinceYear: 2023, languages: ['Казахский'], slots: [] },
      experience: [], education: null, certificates: [{ name: 'CELTA', issuedBy: 'Cambridge', year: 2022 }],
      languages: [{ lang: 'Английский', level: 'C1' }], focus: [], methods: [],
    })
    wrap(<TeacherProfileModal token="t" teacherId={3} mode="wizard" tz="Asia/Almaty" myInterests={['Аниме']} onClose={() => {}} />)
    expect(await screen.findAllByText('Айгерим Сапарова')).not.toHaveLength(0)
    expect(screen.getByText('CELTA')).toBeTruthy()
    expect(screen.getAllByText(/Проверено/).length).toBeGreaterThan(0)
    expect(screen.getByText('A0–B2')).toBeTruthy()
    expect(screen.queryByText(/Видео/)).toBeNull()
    expect(screen.queryByText(/Написать/)).toBeNull()
    expect(screen.queryByText(/учеников сейчас/)).toBeNull()
    expect(document.body.textContent).not.toMatch(/\+7/)
  })
})
