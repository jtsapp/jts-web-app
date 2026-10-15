// Ключ «Глаголов» для помощника по сайту: когда он есть и как выглядит.
import { describe, expect, it } from 'vitest'
import { spokenExpected, writtenExpected } from './assistantExpected.js'
import { checkWritten, writtenFields } from './engine.js'

const BE = { v1: 'be', v2: 'was / were', v3: 'been' }
const GO = { v1: 'go', v2: 'went', v3: 'gone' }

function written(mode, item, v, values, reveal = false) {
  const fields = writtenFields(mode, item, v, 3)
  return { fields, result: { kind: 'written', score: checkWritten(fields, values, { mode, item, v, reveal }), revealed: reveal } }
}

describe('writtenExpected', () => {
  it('три формы с ошибкой — обе формы с метками и всеми вариантами', () => {
    const { fields, result } = written('write', null, BE, ['was', 'beed'])
    expect(writtenExpected(result, fields)).toBe('V2 → was / were; V3 → been')
  })

  it('всё верно, «показать ответ» и нет проверки — ключа нет', () => {
    const ok = written('write', null, BE, ['were', 'been'])
    expect(writtenExpected(ok.result, ok.fields)).toBe('')
    const shown = written('write', null, BE, ['', ''], true)
    expect(writtenExpected(shown.result, shown.fields)).toBe('')
    expect(writtenExpected(null, ok.fields)).toBe('')
  })

  it('исправление ошибки — слово задания, а не форма из таблицы', () => {
    const item = { text: 'I {goed} to school.', answer: 'went', form: 1 }
    const { fields, result } = written('fix', item, GO, ['goed'])
    expect(writtenExpected(result, fields)).toBe('V2 → went')
  })
})

describe('spokenExpected', () => {
  const speech = (heard) => ({ kind: 'speech', text: 'um', score: { hits: heard.filter(Boolean).length, total: heard.length, results: heard.map((h, i) => ({ form: String(i), heard: h })) } })

  it('пропуск: только пропущенная форма', () => {
    expect(spokenExpected(speech([false]), { verb: BE, mode: 'gap', formCount: 3, gap: 1 })).toBe('V2 → was / were')
  })

  it('ритм: все формы набора', () => {
    expect(spokenExpected(speech([true, false, true]), { verb: GO, mode: 'repeat', formCount: 3, gap: 1 })).toBe('V1 → go; V2 → went; V3 → gone')
    expect(spokenExpected(speech([true, false]), { verb: GO, mode: 'repeat', formCount: 2, gap: 1 })).toBe('V1 → go; V2 → went')
  })

  it('всё услышано и самопроверка — ключа нет', () => {
    expect(spokenExpected(speech([true]), { verb: BE, mode: 'gap', formCount: 3, gap: 1 })).toBe('')
    expect(spokenExpected({ kind: 'manual', text: '' }, { verb: BE, mode: 'gap', formCount: 3, gap: 1 })).toBe('')
  })
})
