// @vitest-environment jsdom
import { it, expect, beforeEach } from 'vitest'
import { loadDraft, saveDraft, clearDraft } from './wizardDraft.js'

beforeEach(() => localStorage.clear())

it('round-trips a draft per student and survives broken storage', () => {
  saveDraft(7, { step: 'time', format: 'books', slots: [{ weekday: 1, start: '14:00:00' }], interests: ['Аниме'], choices: [3] })
  expect(loadDraft(7)).toMatchObject({ format: 'books', choices: [3] })
  expect(loadDraft(8)).toEqual({ step: null, format: null, slots: [], interests: [], choices: [] })
  localStorage.setItem('jts_matching_draft:9', '{oops')
  expect(loadDraft(9).slots).toEqual([])
  clearDraft(7)
  expect(loadDraft(7).format).toBeNull()
})
