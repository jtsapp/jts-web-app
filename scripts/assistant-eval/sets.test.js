import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { TEACHER_SET, TOPICS, KIND_OF_TOPIC } from './teacher-set.js'
import { LUNA_CASES } from './luna-cases.js'
import { SCREENS, PROFILES } from './fixtures.js'
import { reviewDoc } from './review-doc.js'
import { openingFocus } from '../../src/lib/assistant/opening.js'

// Наборы прогона Луны (run.js) — данные, а не код, но ошибка в них тихо портит замер: вопрос без ключей судья
// зачтёт как угодно, а опечатка в экране даст ход без снимка.

describe('эталонный набор учителя (ТЗ v2.0, 8.3а)', () => {
  it('около ста вопросов, id уникальны, у каждого ключи и критерий', () => {
    expect(TEACHER_SET.length).toBeGreaterThanOrEqual(100)
    const ids = TEACHER_SET.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of TEACHER_SET) {
      expect(TOPICS[q.topic], q.id).toBeTruthy()
      expect(KIND_OF_TOPIC[q.topic], q.id).toBeTruthy()
      expect(['ru', 'kk', 'en'], q.id).toContain(q.lang)
      expect(['A1', 'A2', 'B1', 'B2'], q.id).toContain(q.level)
      expect(q.keys.length, q.id).toBeGreaterThan(0)
      expect(q.pass.trim(), q.id).not.toBe('')
      expect(q.review, q.id).toBe('на проверку методисту')
      if (q.screen) expect(SCREENS[q.screen], q.id).toBeTruthy()
    }
  })

  it('есть вопросы на казахском и на английском в каждой большой теме', () => {
    for (const topic of ['grammar', 'translate', 'vocab', 'check']) {
      const langs = new Set(TEACHER_SET.filter((q) => q.topic === topic).map((q) => q.lang))
      expect([...langs].sort(), topic).toEqual(['en', 'kk', 'ru'])
    }
    expect(TEACHER_SET.filter((q) => q.topic === 'errors' && q.lang === 'kk').length).toBeGreaterThanOrEqual(5)
  })

  it('документ для методиста собран из набора', () => {
    const doc = readFileSync(fileURLToPath(new URL('../../docs/assistant-eval/luna-teacher-set.md', import.meta.url)), 'utf8')
    expect(doc.replace(/\r\n/g, '\n'), 'пересобери: node scripts/assistant-eval/review-doc.js').toBe(reviewDoc())
  })
})

describe('кейсы раздела 10 для зонда', () => {
  it('экраны и профили существуют, id уникальны', () => {
    const ids = LUNA_CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of LUNA_CASES) {
      expect(SCREENS[c.screen], c.id).toBeTruthy()
      expect(PROFILES[c.profile], c.id).toBeTruthy()
      expect(Number.isInteger(c.tz), c.id).toBe(true)
      expect(Boolean(c.q) !== Boolean(c.ask), `${c.id}: вопрос или служебный ход, одно из двух`).toBe(true)
    }
  })

  // Кейсы «готовый ответ не назван» держатся на том, что код видит непроверенное задание (openingFocus) — иначе
  // указание «не называй ответ» рядом с вопросом не встанет, и замер мерил бы не то.
  it('снимки заданий размечены так, как их читает код', () => {
    expect(openingFocus(SCREENS.lessonUnchecked.text)).toEqual({ task: true, unchecked: true })
    expect(openingFocus(SCREENS.homeworkUnchecked.text)).toEqual({ task: true, unchecked: true })
    expect(openingFocus(SCREENS.lessonWrongShown.text)).toEqual({ task: true, unchecked: false })
    expect(openingFocus(SCREENS.home.text).task).toBe(false)
  })
})
