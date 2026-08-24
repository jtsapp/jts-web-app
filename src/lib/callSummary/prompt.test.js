import { describe, it, expect } from 'vitest'

import {
  TRANSCRIPT_BUDGET,
  budgetTranscript,
  buildSummaryPrompt,
  isEmptySummary,
  resolveSummaryLang,
  validateSummary,
} from './prompt.js'

const TALK = [
  { role: 'tutor', text: 'Did you contemplate the offer?' },
  { role: 'learner', text: 'i start to contemplate about whether am i doing the right thing' },
]

describe('resolveSummaryLang', () => {
  // Ловушка, ради которой у модуля своя карта: resolveLangName из
  // shadowing/tipPrompt.js на 'kz' отдаёт Russian.
  it('kz — это казахский, а не русский', () => {
    expect(resolveSummaryLang('kz')).toBe('Kazakh')
  })
  it('ru и en как есть', () => {
    expect(resolveSummaryLang('ru')).toBe('Russian')
    expect(resolveSummaryLang('en')).toBe('English')
  })
  it('неизвестный код падает в русский', () => {
    expect(resolveSummaryLang('kk')).toBe('Russian')
    expect(resolveSummaryLang(undefined)).toBe('Russian')
  })
})

describe('buildSummaryPrompt: факты не из всех режимов', () => {
  it('free — факты и в схеме, и в инструкции', () => {
    const p = buildSummaryPrompt({ transcript: TALK, lang: 'ru', mode: 'free' })
    expect('facts' in p.schema.properties).toBe(true)
    expect(p.systemPrompt).toMatch(/- facts:/)
  })
  it('placement — тоже', () => {
    const p = buildSummaryPrompt({ transcript: TALK, lang: 'ru', mode: 'placement' })
    expect('facts' in p.schema.properties).toBe(true)
  })
  it('scenario — поля нет ни в схеме, ни в промпте', () => {
    const p = buildSummaryPrompt({ transcript: TALK, lang: 'ru', mode: 'scenario' })
    expect('facts' in p.schema.properties).toBe(false)
    expect(p.systemPrompt).not.toMatch(/- facts:/)
  })
  it('debate — тоже нет', () => {
    const p = buildSummaryPrompt({ transcript: TALK, lang: 'ru', mode: 'debate' })
    expect('facts' in p.schema.properties).toBe(false)
  })
})

describe('buildSummaryPrompt: новые слова только из реплик тьютора', () => {
  const p = buildSummaryPrompt({ transcript: TALK, lang: 'ru', mode: 'free' })

  it('реплики размечены ролями', () => {
    expect(p.userMessage).toContain('TUTOR: Did you contemplate the offer?')
    expect(p.userMessage).toContain('LEARNER: i start to contemplate')
  })
  it('правило про TUTOR-строки в промпте есть', () => {
    expect(p.systemPrompt).toMatch(/ONLY from lines labelled TUTOR/)
    expect(p.systemPrompt).toMatch(/never from LEARNER lines/)
  })
  it('про слипы распознавания предупреждено', () => {
    expect(p.systemPrompt).toMatch(/RECOGNITION ERRORS/)
  })
})

describe('buildSummaryPrompt: известная память', () => {
  it('факты и темы уезжают в промпт для дедупа', () => {
    const p = buildSummaryPrompt({
      transcript: TALK,
      mode: 'free',
      knownFacts: ['works as a nurse'],
      knownTopics: ['travel plans'],
    })
    expect(p.userMessage).toContain('KNOWN FACTS')
    expect(p.userMessage).toContain('works as a nurse')
    expect(p.userMessage).toContain('travel plans')
  })
  it('без памяти блоков нет', () => {
    const p = buildSummaryPrompt({ transcript: TALK, mode: 'free' })
    expect(p.userMessage).not.toContain('KNOWN FACTS')
  })
})

describe('budgetTranscript', () => {
  it('короткий транскрипт не режется', () => {
    const { text, omitted } = budgetTranscript(TALK)
    expect(omitted).toBe(0)
    expect(text.split('\n')).toHaveLength(2)
  })

  it('длинный: выкинута середина, начало и конец на месте', () => {
    const long = Array.from({ length: 400 }, (_, i) => ({
      role: i % 2 ? 'learner' : 'tutor',
      text: 'x'.repeat(300) + ' n' + i,
    }))
    const { text, omitted } = budgetTranscript(long)
    expect(omitted).toBeGreaterThan(0)
    expect(text.length).toBeLessThanOrEqual(TRANSCRIPT_BUDGET)
    expect(text).toMatch(/\[… omitted \d+ turns …\]/)
    expect(text.startsWith('TUTOR: ')).toBe(true)
    expect(text.trimEnd().endsWith('n399')).toBe(true)
  })

  it('пустые реплики отброшены', () => {
    const { text } = budgetTranscript([
      { role: 'tutor', text: '   ' },
      { role: 'learner', text: 'ok' },
      null,
    ])
    expect(text).toBe('LEARNER: ok')
  })
})

describe('validateSummary', () => {
  it('режет длины и количества, которые схема потеряла', () => {
    const v = validateSummary(
      {
        recap: 'x'.repeat(900),
        topics: Array.from({ length: 12 }, (_, i) => 'topic ' + i),
        facts: Array.from({ length: 12 }, (_, i) => 'fact ' + i),
        wins: Array.from({ length: 9 }, (_, i) => ({ title: 't' + i, quote: 'q' + i })),
        focus: 'y'.repeat(400),
      },
      { mode: 'free' },
    )
    expect(v.recap).toHaveLength(240)
    expect(v.topics).toHaveLength(5)
    expect(v.facts).toHaveLength(5)
    expect(v.wins).toHaveLength(3)
    expect(v.focus).toHaveLength(160)
  })

  it('не-строки и неполные объекты отброшены', () => {
    const v = validateSummary(
      {
        topics: ['ok', 42, null, '   '],
        mistakes: [{ title: 'a', quote: 'b' }, { title: 'a', quote: 'b', fix: 'c' }],
        newWords: [
          { term: 'contemplate', translation: 'обдумывать', example: 'Did you contemplate?' },
          { term: 'no-translation' },
        ],
      },
      { mode: 'free' },
    )
    expect(v.topics).toEqual(['ok'])
    // fix обязателен: «ошибка» без исправления ученику ничего не даёт.
    expect(v.mistakes).toHaveLength(1)
    // example необязателен, translation — обязателен.
    expect(v.newWords).toHaveLength(1)
    expect(v.newWords[0].term).toBe('contemplate')
  })

  it('в сценарии факты выбрасываются, даже если модель их прислала', () => {
    const v = validateSummary({ facts: ['works as a nurse'] }, { mode: 'scenario' })
    expect(v.facts).toEqual([])
  })

  it('мусор на входе не роняет', () => {
    const v = validateSummary(null, { mode: 'free' })
    expect(isEmptySummary(v)).toBe(true)
  })

  it('непустая выжимка не считается пустой', () => {
    const v = validateSummary({ recap: 'Поговорили о работе.' }, { mode: 'free' })
    expect(isEmptySummary(v)).toBe(false)
  })
})
