import { describe, it, expect } from 'vitest'
import { questionHints } from './turnHints.js'
import { buildTurns, parseChatRequest } from './prompt.js'

// Указания, которые подобраны прогоном эталонного набора Луны (scripts/assistant-eval, 07.11.2026). Тест держит смысл
// указания, а не его дословный текст: формулировку можно улучшать, но только с повторным замером.

describe('указания учителя по замеру эталонного набора', () => {
  it('проверка текста — ошибок столько, сколько есть, бывает и ни одной', () => {
    const [hint] = questionHints({ question: 'Проверь: I usually get up at seven and have breakfast.' })
    expect(hint).toContain('столько, сколько их на самом деле')
    expect(hint).toContain('ошибок нет — так и скажи')
  })

  it('проверочный вопрос в правиле — без рода', () => {
    const [hint] = questionHints({ question: 'Объясни present perfect' })
    expect(hint).toContain('без рода')
  })

  it('«устал», «не хочу» — поддержка и шаг на 10 минут, без давления', () => {
    for (const q of ['Я устал', 'Не хочу сегодня заниматься', 'Бүгін шаршадым', "I'm tired"]) {
      expect(questionHints({ question: q }).join('\n'), q).toContain('минут на 10')
    }
    expect(questionHints({ question: 'Объясни present perfect' }).join('\n')).not.toContain('минут на 10')
  })
})

describe('язык ответа рядом с вопросом', () => {
  const lastTurn = (text, lang) =>
    buildTurns({ ...parseChatRequest({ messages: [{ role: 'user', content: text }], lang }), user: null }).at(-1).content

  it('английский вопрос при английском интерфейсе — тоже указан: правила и база русские', () => {
    expect(lastTurn('What should I do today?', 'en')).toContain('Язык ответа: английский — на нём задан вопрос.')
  })

  it('казахский вопрос без казахских букв при казахском интерфейсе — не «русский»', () => {
    expect(lastTurn('«Take care» деген не?', 'kk')).not.toContain('Язык ответа: русский')
  })

  it('русский вопрос при русском интерфейсе — без лишней строки', () => {
    expect(lastTurn('Как перенести урок?', 'ru')).not.toContain('Язык ответа')
  })
})
