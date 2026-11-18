import { describe, expect, it, vi } from 'vitest'
import { parsePhrase } from './phrase.js'
import { DictationSession } from './session.js'

const phrase = (text, n) => ({ n, start: n * 3, end: n * 3 + 2, ...parsePhrase(text) })
const MUDDY = phrase('I [love] jumping in [muddy] puddles!', 0) // цель lovemuddy
const TEDDY = phrase('Where is my teddy?', 1) // цель whereismyteddy

function make(phrases = [MUDDY, TEDDY]) {
  const onPhrase = vi.fn()
  const onDone = vi.fn()
  const s = new DictationSession({ phrases, onPhrase, onDone })
  return { s, onPhrase, onDone, snap: () => s.getSnapshot() }
}

function started(phrases) {
  const m = make(phrases)
  m.s.start()
  return m
}

describe('начало', () => {
  it('до «Начать» фразы нет; start открывает первую, повторный start ничего не делает', () => {
    const { s, snap } = make()
    expect(snap()).toMatchObject({ phase: 'intro', index: 0, total: 2, item: null })
    s.start()
    expect(snap().phase).toBe('phrase')
    expect(snap().item).toMatchObject({ typed: '', tries: 0, done: false, mark: null })
    expect(snap().item.phrase).toBe(MUDDY)
    s.start()
    expect(snap().index).toBe(0)
  })

  it('урок без фраз — сразу итог 0 из 0', () => {
    expect(make([]).snap()).toMatchObject({ phase: 'result', summary: { n: 0, clean: 0, mistakes: [] } })
  })
})

describe('набор и проверка', () => {
  it('набор — только латинские буквы, не длиннее цели', () => {
    const { s, snap } = started()
    s.type("Love, Mud-dy!! xyz 42")
    expect(snap().item.typed).toBe('lovemuddy')
  })

  it('пустой набор не проверяется и попытку не тратит', () => {
    const { s, snap } = started()
    s.check()
    expect(snap().item.tries).toBe(0)
  })

  it('верно с первой попытки без подсказок — clean', () => {
    const { s, snap, onPhrase } = started()
    s.type('lovemuddy')
    s.check()
    expect(snap().item).toMatchObject({ done: true, outcome: 'clean', mark: 'ok' })
    expect(onPhrase).toHaveBeenCalledWith({ n: 0, text: 'I love jumping in muddy puddles!', outcome: 'clean', attempt: '' })
  })

  it('одна буква мимо — near, не засчитано; вторая попытка верна — ok, но не с первого раза', () => {
    const { s, snap } = started()
    s.type('lovemudy')
    s.check()
    expect(snap().item).toMatchObject({ done: false, mark: 'near', tries: 1 })
    s.type('lovemuddy')
    expect(snap().item.mark).toBeNull()
    s.check()
    expect(snap().item).toMatchObject({ done: true, outcome: 'ok', mark: 'ok' })
  })

  it('две неудачи — фраза показана: miss, ячейки — цель, набранное — в attempt', () => {
    const { s, snap, onPhrase } = started()
    s.type('zzzzzzzzz')
    s.check()
    expect(snap().item.mark).toBe('bad')
    s.type('qqqq')
    s.check()
    expect(snap().item).toMatchObject({ done: true, outcome: 'miss', mark: 'shown', typed: 'lovemuddy', attempt: 'qqqq' })
    expect(onPhrase).toHaveBeenLastCalledWith({ n: 0, text: 'I love jumping in muddy puddles!', outcome: 'miss', attempt: 'qqqq' })
  })

  it('закрытая фраза не принимает набор, проверку и подсказку', () => {
    const { s, snap } = started()
    s.type('lovemuddy')
    s.check()
    s.type('zzz')
    s.hint()
    s.check()
    expect(snap().item).toMatchObject({ typed: 'lovemuddy', tries: 1, hintsUsed: 0 })
  })
})

describe('подсказка', () => {
  it('открывает следующую букву, сохраняя верное начало; верный ответ после подсказки — ok', () => {
    const { s, snap } = started()
    s.type('lox')
    s.hint()
    expect(snap().item).toMatchObject({ typed: 'lov', revealed: 3, hintsUsed: 1 })
    s.type('lovemuddy')
    s.check()
    expect(snap().item.outcome).toBe('ok')
  })

  it('подсказка до последней буквы проверяет сама', () => {
    const { s, snap } = started([phrase('[Hi] there', 0)])
    s.hint()
    s.hint()
    expect(snap().item).toMatchObject({ typed: 'hi', done: true, outcome: 'ok' })
  })
})

describe('следующая фраза и итог', () => {
  it('«Дальше» — только после закрытой фразы; после последней — итог и onDone', () => {
    const { s, snap, onDone } = started()
    s.next()
    expect(snap().index).toBe(0)
    s.type('lovemuddy')
    s.check()
    s.next()
    expect(snap()).toMatchObject({ phase: 'phrase', index: 1 })
    expect(snap().item.phrase).toBe(TEDDY)
    s.type('whereismyted')
    s.check()
    s.type('whereismyteddy')
    s.check()
    s.next()
    const summary = { n: 2, clean: 1, ok: 1, miss: 0, mistakes: [1] }
    expect(snap()).toMatchObject({ phase: 'result', item: null, summary })
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining(summary))
    expect(onDone.mock.calls[0][0].items.map((r) => r.outcome)).toEqual(['clean', 'ok'])
  })
})
