// Указание модели ученика рядом с вопросом: только когда в профиле есть сами строки методики и повторения.
import { describe, expect, it } from 'vitest'
import { modelHints } from './turnHint.js'
import { buildTurns } from '../assistant/prompt.js'

describe('modelHints', () => {
  it('пусто без строк модели; совет методики и повторение — каждый своим указанием', () => {
    expect(modelHints({ studentContext: 'Уровень курса: A2.' })).toEqual([])
    const both = modelHints({ studentContext: 'Темп сейчас … Совет методики (…): …\nПовторение по расписанию (…): …' })
    expect(both).toHaveLength(2)
    expect(both[0]).toContain('своих заданий не придумывай')
    expect(both[0]).toContain('Ответ задания на экране не называй')
    expect(both[1]).toContain('сначала шаги «Плана на сегодня»')
  })

  it('встаёт рядом с вопросом ученика, но не у служебного хода', () => {
    const ctx = 'Повторение по расписанию (…): темы «Past Simple».'
    const ask = buildTurns({ messages: [{ role: 'user', content: 'Что мне делать сегодня?' }], user: { name: 'А' }, screen: { id: 'home', text: 'Главная' }, lang: 'ru', studentContext: ctx })
    expect(ask.at(-1).content).toContain('повторение — после них, а не вместо')
  })
})
