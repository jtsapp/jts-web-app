// Патч состояния раздела «Практики»: что ученик поменял, пока сервер не
// знал. Нужен разделам-объектам (воркбук, «Письмо», глаголы…), которые сервер
// хранит заменой: раньше их запись до ответа сервера уходила целиком и
// стирала серверный прогресс (ревью 08.10.2026, #78).
import { describe, it, expect } from 'vitest'
import { applyPatch, composePatch, diffState, isEmptyPatch, isValidPatch, subtractPatch } from './statePatch.js'

const viaJson = (p) => JSON.parse(JSON.stringify(p))

describe('diffState / applyPatch', () => {
  it('ловит добавленный, изменённый и снятый ключ', () => {
    const prev = { saved: { go: true, be: true }, progress: { a: 1 } }
    const next = { saved: { go: true, do: true }, progress: { a: 2 } }
    const p = diffState(prev, next)
    expect(applyPatch({ saved: { be: true, run: true }, progress: { a: 1, z: 9 } }, p)).toEqual({
      saved: { run: true, do: true },
      progress: { a: 2, z: 9 },
    })
  })

  it('без изменений — пустой патч', () => {
    expect(isEmptyPatch(diffState({ tasks: { a: 1 } }, { tasks: { a: 1 } }))).toBe(true)
  })

  // Ревью PR: «изучено» уровня с другого устройства стиралось — список
  // заменялся целиком одним новым словом.
  it('список — множество: добавленное ложится к серверному, а не вместо', () => {
    const p = diffState({ scopes: {} }, { scopes: { A0: ['like'] } })
    expect(applyPatch({ scopes: { A0: ['go', 'run'] } }, viaJson(p))).toEqual({ scopes: { A0: ['go', 'run', 'like'] } })
  })

  it('снятое из списка снимается и на серверном', () => {
    const p = diffState({ scopes: { A0: ['go', 'like'] } }, { scopes: { A0: ['go'] } })
    expect(applyPatch({ scopes: { A0: ['go', 'like', 'run'] } }, p)).toEqual({ scopes: { A0: ['go', 'run'] } })
  })

  // Корзина режима глаголов — словарь внутри словаря: правка одного глагола
  // не должна заменять всю корзину.
  it('словарь внутри словаря правится по ключам', () => {
    const p = diffState({ progress: {} }, { progress: { 'm-3-a1': { go: { ok: 1 } } } })
    expect(applyPatch({ progress: { 'm-3-a1': { be: { ok: 2 } } } }, p)).toEqual({
      progress: { 'm-3-a1': { be: { ok: 2 }, go: { ok: 1 } } },
    })
  })

  it('сменился только порядок списка — это не правка', () => {
    expect(isEmptyPatch(diffState({ seen: { easy: ['a', 'b'] } }, { seen: { easy: ['b', 'a'] } }))).toBe(true)
  })

  it('не меняет исходное состояние', () => {
    const base = { tasks: { a: 1 } }
    applyPatch(base, diffState({ tasks: {} }, { tasks: { b: 2 } }))
    expect(base).toEqual({ tasks: { a: 1 } })
  })

  it('патч переживает JSON — его храним в localStorage', () => {
    const p = viaJson(diffState({ saved: { go: true } }, { saved: {} }))
    expect(applyPatch({ saved: { go: true } }, p)).toEqual({ saved: {} })
  })
})

describe('composePatch', () => {
  it('позднее перекрывает раннее, удаление тоже переносится', () => {
    const a = diffState({ saved: {} }, { saved: { go: true } })
    const b = diffState({ saved: { go: true } }, { saved: {} })
    const c = diffState({ saved: {} }, { saved: { be: true } })
    const p = composePatch(composePatch(a, b), c)
    expect(applyPatch({ saved: { go: true, run: true } }, p)).toEqual({ saved: { run: true, be: true } })
  })

  it('раздел снят, потом в нём новая правка — не тащит служебную метку', () => {
    const a = diffState({ saved: { go: true } }, {})
    const b = diffState({}, { saved: { be: true } })
    expect(applyPatch({ saved: { go: true, run: true } }, composePatch(a, b))).toEqual({ saved: { be: true } })
  })

  it('список: добавили, сняли, снова добавили — слово на месте', () => {
    const s0 = { scopes: { A0: [] } }
    const s1 = { scopes: { A0: ['go'] } }
    const p = [diffState(s0, s1), diffState(s1, s0), diffState(s0, s1)].reduce((acc, d) => composePatch(acc, d), {})
    expect(applyPatch({ scopes: { A0: ['run'] } }, p)).toEqual({ scopes: { A0: ['run', 'go'] } })
  })
})

describe('subtractPatch', () => {
  it('подтверждённое убирается, сделанное после отправки — остаётся', () => {
    const sent = diffState({ tasks: {} }, { tasks: { a: 1 } })
    const later = composePatch(sent, diffState({ tasks: { a: 1 } }, { tasks: { a: 1, b: 1 } }))
    expect(subtractPatch(later, sent)).toEqual(diffState({ tasks: { a: 1 } }, { tasks: { a: 1, b: 1 } }))
  })

  it('ключ переправлен после отправки на другое значение — не убирается', () => {
    const sent = diffState({ tasks: {} }, { tasks: { a: 1 } })
    const now = composePatch(sent, diffState({ tasks: { a: 1 } }, { tasks: { a: 2 } }))
    expect(applyPatch({ tasks: {} }, subtractPatch(now, sent))).toEqual({ tasks: { a: 2 } })
  })

  it('чужая правка другой вкладки не стирается подтверждением этой', () => {
    const mine = diffState({ scopes: {} }, { scopes: { A0: ['go'] } })
    const theirs = diffState({ scopes: {} }, { scopes: { A1: ['be'] } })
    const stored = composePatch(theirs, mine)
    expect(applyPatch({}, subtractPatch(stored, mine))).toEqual({ scopes: { A1: ['be'] } })
  })
})

describe('isValidPatch', () => {
  it('битая запись из хранилища не проходит', () => {
    expect(isValidPatch({ tasks: {} })).toBe(false)
    expect(isValidPatch({ tasks: { sub: { a: 'x' } } })).toBe(false)
    expect(isValidPatch(viaJson(diffState({ tasks: {} }, { tasks: { a: 1 } })))).toBe(true)
  })
})

// Повторное ревью PR: правка полей записи, которую на сервере уже сняли,
// оставляла обрубок без word/ru/kk — пустую карточку «хуже запомненных».
describe('записи и атомарные разделы', () => {
  it('запись правится целиком: снятая на сервере возвращается полной, а не обрубком', () => {
    const prev = { words: { go: { word: 'go', ru: 'идти', misses: 2, at: 1 } } }
    const next = { words: { go: { word: 'go', ru: 'идти', misses: 3, at: 2 } } }
    expect(applyPatch({ words: {} }, viaJson(diffState(prev, next)))).toEqual(next)
  })

  it('словарь по id первого уровня с простыми значениями — по ключам, не целиком', () => {
    const p = diffState({ saved: { go: true } }, { saved: { go: true, be: true } })
    expect(applyPatch({ saved: { run: true } }, p)).toEqual({ saved: { run: true, be: true } })
  })

  it('atomic: промахи экрана — список последней попытки, а не множество', () => {
    const p = diffState({ miss: { k: ['a', 'b'] } }, { miss: { k: ['c'] } }, { atomic: ['miss'] })
    expect(applyPatch({ miss: { k: ['a', 'b', 'x'], j: ['z'] } }, p)).toEqual({ miss: { k: ['c'], j: ['z'] } })
  })
})
