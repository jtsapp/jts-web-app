// Промпт грейдера. Проверяем ровно то, что ломается молча: язык вывода и
// уровневую мерку — в работающем приложении и то и другое выглядит как
// «модель сегодня строгая» или «почему-то ответила по-английски».

import { describe, it, expect } from 'vitest'
import { ASSESS_SCHEMA, buildAssessPrompt, levelBar, resolveLangName } from './assessPrompt.js'

describe('resolveLangName', () => {
  it("'kz' и 'kk' — оба казахский", () => {
    // В приложении язык называется 'kz', в словаре Shadowing — 'kk'. Разойтись
    // тут значит молча отдать русский совет казахоязычному студенту.
    expect(resolveLangName('kz')).toBe('Kazakh')
    expect(resolveLangName('kk')).toBe('Kazakh')
    expect(resolveLangName('KZ')).toBe('Kazakh')
  })

  it('неизвестный код — русский, как дефолт i18n', () => {
    expect(resolveLangName('fr')).toBe('Russian')
    expect(resolveLangName(undefined)).toBe('Russian')
  })
})

describe('levelBar', () => {
  it('у каждого уровня своя планка', () => {
    const bars = ['a1', 'a2', 'b1', 'b2', 'c1'].map(levelBar)
    expect(new Set(bars).size).toBe(5)
    expect(levelBar('A1')).toContain('A1')
  })

  it('неизвестный уровень не роняет промпт', () => {
    expect(levelBar('zz')).toBe(levelBar('b1'))
  })
})

describe('buildAssessPrompt', () => {
  const base = {
    level: 'a1',
    task: 'Introduce yourself.',
    transcript: 'hello my name is aida i am from astana',
    seconds: 12,
    lang: 'ru',
    title: 'Hello! Nice to Meet You',
  }

  it('язык вывода задан и в system, и в user', () => {
    const { systemPrompt, userMessage } = buildAssessPrompt(base)
    expect(systemPrompt).toContain('Russian')
    expect(userMessage).toContain('Russian')
  })

  it('казахский интерфейс — казахский разбор', () => {
    const { systemPrompt, userMessage } = buildAssessPrompt({ ...base, lang: 'kz' })
    expect(systemPrompt).toContain('Kazakh')
    expect(userMessage).toContain('Kazakh')
  })

  it('уровень попадает в промпт мерой, а не просто кодом', () => {
    const { systemPrompt } = buildAssessPrompt(base)
    expect(systemPrompt).toContain(levelBar('a1'))
    // Ответ A1 не должен судиться как ответ носителя — это сказано прямо.
    expect(systemPrompt).toMatch(/not against a native speaker/i)
  })

  it('задание и транскрипт уходят в user-сообщение', () => {
    const { userMessage } = buildAssessPrompt(base)
    expect(userMessage).toContain('Introduce yourself.')
    expect(userMessage).toContain('hello my name is aida')
    expect(userMessage).toContain('Hello! Nice to Meet You')
  })

  it('считает темп речи для оценки беглости', () => {
    // 9 слов за 12 секунд = 45 слов в минуту.
    const { userMessage } = buildAssessPrompt(base)
    expect(userMessage).toContain('45 words per minute')
  })

  it('нулевая длительность не даёт NaN в промпте', () => {
    const { userMessage } = buildAssessPrompt({ ...base, seconds: 0 })
    expect(userMessage).not.toContain('NaN')
  })

  it('запрещает грамматику пунктуации: её в транскрипте нет', () => {
    const { systemPrompt } = buildAssessPrompt(base)
    expect(systemPrompt).toMatch(/never grade punctuation/i)
  })
})

describe('ASSESS_SCHEMA', () => {
  it('произношение модель не выставляет — его считает Azure', () => {
    expect(ASSESS_SCHEMA.properties.pronunciation).toBeUndefined()
    expect(ASSESS_SCHEMA.required).toEqual(
      expect.arrayContaining(['grammar', 'vocabulary', 'fluency', 'coherence', 'summary']),
    )
  })
})
