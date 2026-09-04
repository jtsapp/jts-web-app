import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { splitBank, mergeKeys } from './bankSplit.js'
import keys from './keys.generated.json'

const publicBank = JSON.parse(
  readFileSync(join(process.cwd(), 'public/practice/placement/bank.json'), 'utf8'),
)

/** Все значения полей с именем [name] во вложенной структуре. */
function valuesOf(node, name, out = []) {
  if (Array.isArray(node)) node.forEach((v) => valuesOf(v, name, out))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === name && v != null) out.push(v)
      valuesOf(v, name, out)
    }
  }
  return out
}

describe('публичный банк', () => {
  it('не содержит ответов', () => {
    // Банк лежит в public/ и доступен всем; ключ к тесту в нём — это ключ к
    // уровню, который потом уезжает в профиль.
    expect(valuesOf(publicBank, 'key')).toEqual([])
    expect(valuesOf(publicBank.bank, 'answer')).toEqual([])
    expect(valuesOf(publicBank.bank, 'gloss')).toEqual([])
    // Единственное уцелевшее поле `answer` — у сборки предложения, и в нём
    // лежит перемешанный набор слов (см. отдельную проверку ниже).
    expect(valuesOf(publicBank.bank2, 'answer').length)
      .toBe(publicBank.bank2.interactive.order.length)
  })

  it('у заданий на подстановку остались только пропуски, без слов', () => {
    for (const q of publicBank.bank2.interactive.bankfill) {
      expect(q.answers.every((a) => a === '')).toBe(true)
      expect(q.bank.length).toBeGreaterThan(q.answers.length) // пул с дистракторами
    }
  })

  it('у утверждений аудирования нет T/F/NS', () => {
    const tfns = publicBank.bank2.listening2.items.filter((q) => q.type === 'tfns')
    expect(tfns.length).toBeGreaterThan(0)
    for (const q of tfns) {
      expect(q.statements.every((st) => st.t && st.key === undefined)).toBe(true)
    }
  })

  it('в сопоставлении правая колонка перемешана', () => {
    const shuffled = publicBank.bank2.interactive.match.filter(
      (q, i) => JSON.stringify(q.pairs) !== JSON.stringify(keys.items[q.id].pairs),
    )
    expect(shuffled.length).toBe(publicBank.bank2.interactive.match.length)
  })

  it('в задании на порядок слов остались слова, но не их порядок', () => {
    for (const q of publicBank.bank2.interactive.order) {
      const truth = keys.items[q.id].answer.replace(/[.!?]$/, '')
      expect(q.answer.split(' ').sort()).toEqual(truth.split(' ').sort()) // тот же набор
      expect(q.answer).not.toBe(truth) // но не тот же порядок
    }
  })

  it('данных для отрисовки хватает: у каждого задания есть текст и варианты', () => {
    for (const item of publicBank.bank.items) {
      expect(typeof item.id).toBe('string')
      if (item.options) expect(item.options.every((o) => typeof o.t === 'string')).toBe(true)
    }
  })
})

describe('splitBank', () => {
  it('обратим: публичная часть + ключи = исходный банк', () => {
    // Иначе перегенерация банка тихо теряла бы данные методистов.
    const full = mergeKeys(publicBank, keys)
    const { public: again, keys: keysAgain } = splitBank(full)

    expect(again).toEqual(publicBank)
    expect(keysAgain).toEqual(keys)
  })

  it('детерминирован: тот же банк даёт тот же результат', () => {
    const full = mergeKeys(publicBank, keys)
    expect(splitBank(full).public).toEqual(splitBank(full).public)
  })
})
