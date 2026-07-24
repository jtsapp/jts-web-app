import { test, expect } from '@playwright/test'
import {
  norm,
  mix,
  buildSession,
  checkAnswer,
  feedbackBody,
  headingFor,
  SESSION_SIZE,
} from '../src/practice/listening/engine.js'

// Pure-logic unit tests for the listening engine (no DOM). These run in the
// node context of Playwright, so they need no browser.

test.describe('listening engine — norm()', () => {
  test('нормализует регистр, кавычки, пунктуацию и апострофы', () => {
    expect(norm("I'm from the UK")).toBe('im from the uk')
    expect(norm('I’m  from   the UK.')).toBe('im from the uk')
    expect(norm('Yes, he is!')).toBe('yes he is')
    expect(norm("It's — a test")).toBe('its a test')
  })
})

test.describe('listening engine — checkAnswer()', () => {
  test('choice: точное совпадение строки', () => {
    const t = { type: 'listen_choice', answer: 'In Shanghai', options: ['In Shanghai', 'In Beijing'] }
    expect(checkAnswer(t, 'In Shanghai').ok).toBe(true)
    expect(checkAnswer(t, 'In Beijing').ok).toBe(false)
  })
  test('type: сравнение по norm (регистр/пунктуация не важны)', () => {
    const t = { type: 'listen_type', answer: "I'm from the UK" }
    expect(checkAnswer(t, 'im from the uk').ok).toBe(true)
    expect(checkAnswer(t, "I'M FROM THE UK!").ok).toBe(true)
    expect(checkAnswer(t, 'I am from the UK').ok).toBe(false)
  })
  test('assemble: сравнение собранного массива токенов по norm', () => {
    const t = { type: 'listen_assemble', tokens: ["I'm", 'from', 'Istanbul'], text: "I'm from Istanbul" }
    expect(checkAnswer(t, ["I'm", 'from', 'Istanbul']).ok).toBe(true)
    expect(checkAnswer(t, ['from', "I'm", 'Istanbul']).ok).toBe(false)
  })
})

test.describe('listening engine — feedbackBody()', () => {
  test('верный ответ показывает объяснение', () => {
    const t = { type: 'listen_choice', answer: 'A', explanation: 'потому что A' }
    expect(feedbackBody(t, true, false)).toBe('потому что A')
  })
  test('неверный ответ добавляет правильный ответ и метку реквью', () => {
    const t = { type: 'listen_choice', answer: 'In Shanghai', explanation: 'см. запись' }
    const body = feedbackBody(t, false, true)
    expect(body).toContain('Правильный ответ: <b>In Shanghai</b>')
    expect(body).toContain('Это задание вернётся в конце.')
  })
  test('type неверный — показывает услышанное', () => {
    const t = { type: 'listen_type', answer: "I'm from the UK", explanation: '' }
    expect(feedbackBody(t, false, false)).toContain('Вы услышали: <b>I’m from the UK</b>'.replace('’', "'"))
  })
})

test.describe('listening engine — headingFor()', () => {
  test('русские заголовки для assemble/type, промпт для choice', () => {
    expect(headingFor({ type: 'listen_assemble' })).toBe('Соберите предложение')
    expect(headingFor({ type: 'listen_type' })).toBe('Напишите, что вы услышали')
    expect(headingFor({ type: 'listen_choice', prompt: 'Where is Li?' })).toBe('Where is Li?')
  })
})

test.describe('listening engine — buildSession()', () => {
  const tasks = Array.from({ length: 30 }, (_, i) => ({
    id: 't' + i,
    type: ['listen_choice', 'listen_assemble', 'listen_type'][i % 3],
    audio: 'a.mp3',
  }))

  test('длина = SESSION_SIZE и все клоны помечены _retry:false', () => {
    const s = buildSession(tasks, SESSION_SIZE, 0)
    expect(s.length).toBe(SESSION_SIZE)
    expect(s.every((t) => t._retry === false)).toBe(true)
  })
  test('без двух одинаковых типов подряд', () => {
    for (let start = 0; start < 6; start++) {
      const s = buildSession(tasks, SESSION_SIZE, start)
      for (let i = 1; i < s.length; i++) expect(s[i].type).not.toBe(s[i - 1].type)
    }
  })
  test('берёт только задания с аудио', () => {
    const withGaps = [
      { id: 'a', type: 'listen_choice', audio: 'a.mp3' },
      { id: 'b', type: 'listen_type' }, // no audio -> skipped
      { id: 'c', type: 'listen_assemble', audio: 'c.mp3' },
    ]
    const s = buildSession(withGaps, 8, 0)
    expect(s.every((t) => t.audio)).toBe(true)
    expect(s.length).toBe(2)
  })
})
