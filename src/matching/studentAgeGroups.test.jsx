// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getMatchingTeachers: vi.fn(async () => []),
  saveMatchingInterests: vi.fn(async () => ({})),
  getMatchingTeacherPhoto: vi.fn(async () => null),
}))
import * as api from '../api.js'
import TeachersStep from './TeachersStep.jsx'
import TeacherCard from './TeacherCard.jsx'

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

const teacher = {
  id: 3, name: 'Айгерим Сапарова', yearsExperience: 4, specializations: [], isNew: false, matchPercent: 80,
  interests: [], formats: ['platform'], slots: [], hasPhoto: false, studentAgeGroups: ['kids', 'adults'],
}

describe('Возраст учеников учителя', () => {
  it('карточка показывает, кого учит учитель', () => {
    wrap(<TeacherCard token="t" teacher={teacher} tz="Asia/Almaty" pickedTotal={2} priority={-1} canPick myInterests={[]} onPick={() => {}} onUnpick={() => {}} onProfile={() => {}} />)
    expect(screen.getByText('Дети 7–12')).toBeTruthy()
    expect(screen.getByText('Взрослые')).toBeTruthy()
    expect(screen.queryByText('Подростки')).toBeNull()
  })

  it('без отметок чипов нет', () => {
    wrap(<TeacherCard token="t" teacher={{ ...teacher, studentAgeGroups: [] }} tz="Asia/Almaty" pickedTotal={2} priority={-1} canPick myInterests={[]} onPick={() => {}} onUnpick={() => {}} onProfile={() => {}} />)
    expect(screen.queryByText('Дети 7–12')).toBeNull()
  })

  it('фильтр «Кого учит» по умолчанию «Любой» и уходит на сервер параметром age', async () => {
    wrap(<TeachersStep token="t" tz="Asia/Almaty" kids={false} pickedTotal={2} interests={[]} onInterests={() => {}} choices={[]} onChoices={() => {}} onProfile={() => {}} onLimit={() => {}} toast={() => {}} />)
    await waitFor(() => expect(api.getMatchingTeachers).toHaveBeenCalledWith('t', null))
    fireEvent.change(screen.getByLabelText('Кого учит'), { target: { value: 'teens' } })
    await waitFor(() => expect(api.getMatchingTeachers).toHaveBeenLastCalledWith('t', 'teens'))
  })
})
