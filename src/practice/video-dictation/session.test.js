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

  it('урок без фраз — сразу итог 0 из 0, onDone не вызывается, start и next ничего не делают', () => {
    const { s, snap, onDone } = make([])
    expect(snap()).toMatchObject({ phase: 'result', summary: { n: 0, clean: 0, mistakes: [] } })
    const before = snap()
    s.start()
    s.next()
    expect(snap()).toBe(before)
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe('набор и проверка', () => {
  it('чистка без обрезки: регистр, знаки и дефис убираются', () => {
    const { s, snap } = started()
    s.type('Love, Mud-dy')
    expect(snap().item.typed).toBe('lovemuddy')
  })

  it('обрезка без лишних знаков: не длиннее цели', () => {
    const { s, snap } = started()
    s.type('lovemuddyzzz')
    expect(snap().item.typed).toBe('lovemuddy')
  })

  it('заглавные приводятся к строчным, цифры и кириллица отбрасываются', () => {
    const { s, snap } = started()
    s.type('LOVE')
    expect(snap().item.typed).toBe('love')
    s.type('l1o2v3e')
    expect(snap().item.typed).toBe('love')
    s.type('лавmuddy')
    expect(snap().item.typed).toBe('muddy')
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

  it('near на второй попытке — miss, набранное сохранено в attempt', () => {
    const { s, snap } = started()
    s.type('lovemudy')
    s.check()
    expect(snap().item.mark).toBe('near')
    s.check()
    expect(snap().item).toMatchObject({ done: true, outcome: 'miss', mark: 'shown', attempt: 'lovemudy', tries: 2 })
  })

  it('no-op набор (значение не изменилось) не публикует снимок и не сбрасывает отметку', () => {
    const { s, snap } = started()
    s.type('lovemudy')
    s.check()
    const before = snap()
    const listener = vi.fn()
    s.subscribe(listener)
    s.type('Love-Mudy')
    expect(listener).not.toHaveBeenCalled()
    expect(snap()).toBe(before)
    expect(snap().item.mark).toBe('near')
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

  it('подсказка после неудачной попытки — ok, не clean', () => {
    const { s, snap } = started()
    s.type('zzzzzzzzz')
    s.check()
    expect(snap().item.mark).toBe('bad')
    s.type('lovemudd')
    s.hint()
    s.check()
    expect(snap().item).toMatchObject({ done: true, outcome: 'ok', tries: 2, hintsUsed: 1 })
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

describe('«Дальше» в итоге', () => {
  it('в фазе итога next, type, check, hint ничего не делают, onDone не повторяется', () => {
    const { s, snap, onDone } = started([TEDDY])
    s.type('whereismyteddy')
    s.check()
    s.next()
    const before = snap()
    s.next()
    s.type('x')
    s.check()
    s.hint()
    expect(snap()).toBe(before)
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})

describe('подписка (контракт useSyncExternalStore)', () => {
  function watched(phrases) {
    const m = started(phrases)
    const listener = vi.fn()
    m.s.subscribe(listener)
    return { ...m, listener }
  }

  it('getSnapshot возвращает тот же объект, пока ничего не менялось', () => {
    const { snap } = started()
    expect(snap()).toBe(snap())
  })

  it('type, check, hint, next уведомляют ровно один раз и дают новый снимок', () => {
    const { s, snap, listener } = watched()
    const steps = [
      () => s.type('lovemudy'),
      () => s.check(), // near
      () => s.hint(),
      () => s.type('lovemuddy'),
      () => s.check(), // ok — фраза закрыта
      () => s.next(),
    ]
    let prev = snap()
    steps.forEach((step, i) => {
      step()
      expect(listener).toHaveBeenCalledTimes(i + 1)
      expect(snap()).not.toBe(prev)
      prev = snap()
    })
  })

  it('start уведомляет один раз; повторный start — нет', () => {
    const m = make()
    const listener = vi.fn()
    m.s.subscribe(listener)
    m.s.start()
    m.s.start()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('отклонённые вызовы не уведомляют и не меняют снимок', () => {
    const { s, snap, listener } = watched()
    const before = snap()
    s.check() // пустой набор
    s.next() // фраза не закрыта
    expect(listener).not.toHaveBeenCalled()
    expect(snap()).toBe(before)
  })

  it('после итога и после закрытия фразы действия ничего не уведомляют', () => {
    const { s, snap, listener } = watched([TEDDY])
    s.type('whereismyteddy')
    s.check()
    listener.mockClear()
    s.type('x')
    s.check()
    s.hint()
    expect(listener).not.toHaveBeenCalled()
    s.next()
    expect(snap().phase).toBe('result')
    listener.mockClear()
    s.next()
    s.type('x')
    s.check()
    s.hint()
    expect(listener).not.toHaveBeenCalled()
  })

  it('подсказка, дописавшая слово и сама проверившая, уведомляет один раз', () => {
    const { s, snap, listener } = watched([phrase('[Hi] there', 0)])
    s.hint()
    listener.mockClear()
    s.hint()
    expect(snap().item.done).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('отписка прекращает уведомления', () => {
    const { s } = started()
    const listener = vi.fn()
    const unsubscribe = s.subscribe(listener)
    unsubscribe()
    s.type('love')
    expect(listener).not.toHaveBeenCalled()
  })

  it('подписчики видят закрытую фразу, даже если onPhrase бросает', () => {
    const onPhrase = vi.fn(() => {
      throw new Error('boom')
    })
    const s = new DictationSession({ phrases: [MUDDY], onPhrase })
    s.start()
    const seen = []
    s.subscribe(() => seen.push(s.getSnapshot().item.done))
    s.type('lovemuddy')
    expect(() => s.check()).toThrow('boom')
    expect(seen).toEqual([false, true])
    expect(s.getSnapshot().item).toMatchObject({ done: true, outcome: 'clean' })
  })
})
