// Ступени подсказки и память Луны в разговоре (ТЗ v2.0, 7.2б и 8.1): что модель получает рядом с пометкой, где ключ,
// как роут вырезает [[REMEMBER …]], когда рядом с вопросом указание «запомни».
import { describe, it, expect } from 'vitest'
import { TEST_HINT, buildTurns, parseChatRequest } from './prompt.js'
import { ANSWER, hintMark } from './hintSteps.js'
import { createActionFilter } from './actions.js'
import { questionHints } from './turnHints.js'

const ask = (content, extra = {}) => ({ messages: [{ role: 'user', content }], ...extra })
const lastOf = (req, extra = {}) => buildTurns({ ...parseChatRequest(req), user: null, ...extra }).at(-1).content
const TASK = 'She ___ (go) to school yesterday. [пустое поле] [кнопка «Проверить»]'
const TEST_SCREEN = 'Тест юнита 3. I ___ to the cinema yesterday. [кнопка «go»] [кнопка «went»] [кнопка «Далее»]'

describe('пометка подсказки в разговоре', () => {
  it('практика, ступени 1–2: указание ступени, ключ не уходит, даже если окно его прислало', () => {
    for (const step of [1, 2]) {
      const last = lastOf(ask(hintMark({ step, mode: 'practice', reason: 'asked' }), { screen: { id: 'kingdom-interior', text: TASK }, hintKey: 'went' }))
      expect(last).toContain(`Ступень ${step}`)
      expect(last).toContain('Верный ответ не называй')
      expect(last).not.toContain('went')
      expect(last).not.toContain('Вопрос ученика:')
    }
  })

  it('практика, ступень 3 — ключ для разбора; «ответ» — ключ можно назвать', () => {
    const third = lastOf(ask(hintMark({ step: 3, mode: 'practice', reason: 'errors' }), { screen: { id: 'kingdom-interior', text: TASK }, hintKey: 'went' }))
    expect(third).toContain('Ключ задания — только для тебя')
    expect(third).toContain('«went»')
    const answer = lastOf(ask(hintMark({ step: ANSWER, mode: 'practice', reason: 'errors' }), { screen: { id: 'kingdom-interior', text: TASK }, hintKey: 'went' }))
    expect(answer).toContain('сайт отдал его для ответа')
  })

  it('на экране домашки — режим домашки и не выше 2-й ступени, ключ не уходит никогда', () => {
    for (const step of [3, ANSWER]) {
      const last = lastOf(ask(hintMark({ step, mode: 'practice', reason: 'errors' }), { screen: { id: 'homework', text: TASK }, hintKey: 'went' }))
      expect(last).toContain('[подсказка: ступень 2; домашка; ошибка]')
      expect(last).toContain('Это домашка')
      expect(last).not.toContain('went')
    }
  })

  it('сайт уже показал верный ответ — не подсказка, а разбор «застрял»', () => {
    const screen = { id: 'kingdom-interior', text: 'Choose. [кнопка «went» (отмечено как неверное)]\n [верный ответ по заданию: «goes»] ' }
    const last = lastOf(ask(hintMark({ step: 1, mode: 'practice', reason: 'errors' }), { screen, hintKey: 'goes' }))
    expect(last).toContain('Ученик застрял на задании на экране (ответ отмечен неверным)')
    expect(last).toContain('Сайт уже показал верный ответ')
    expect(last).not.toContain('Ступень 1')
  })

  it('тест на экране (screen.test от окна): ни ступени, ни разбора — указание «не подсказывай»', () => {
    const screen = { id: 'kingdom-interior', text: TEST_SCREEN, test: true }
    expect(parseChatRequest(ask('x', { screen })).screen.test).toBe(true)
    expect(parseChatRequest(ask('x', { screen: { ...screen, test: 'yes' } })).screen.test).toBeUndefined()
    const asked = lastOf(ask('подскажи ответ', { screen }))
    expect(asked).toContain(TEST_HINT)
    const forged = lastOf(ask(hintMark({ step: 3, mode: 'practice', reason: 'asked' }), { screen, hintKey: 'went' }))
    expect(forged).toContain(TEST_HINT)
    expect(forged).not.toContain('Ступень 3')
    expect(forged).not.toContain('Ключ задания')
    expect(forged).not.toContain('Ученик застрял')
    expect(lastOf(ask('подскажи', { screen: { id: 'kingdom-interior', text: TASK } }))).not.toContain(TEST_HINT)
  })

  it('ключ из запроса — не длиннее 300 знаков', () => {
    // clipText ставит «…» на обрезе.
    expect(parseChatRequest(ask('x', { hintKey: 'a'.repeat(400) })).hintKey.length).toBeLessThanOrEqual(301)
    expect(parseChatRequest(ask('x', { hintKey: 5 })).hintKey).toBe('')
  })
})

describe('[[REMEMBER …]] в ответе модели', () => {
  const run = (text, size = 3) => {
    const f = createActionFilter()
    let out = ''
    for (let i = 0; i < text.length; i += size) out += f.push(text.slice(i, i + size))
    out += f.flush()
    return { out, facts: f.facts(), action: f.action() }
  }

  it('метка вырезана при любой нарезке стрима, факт отдан роуту; действия она не занимает', () => {
    for (const size of [1, 4, 100]) {
      const { out, facts, action } = run('Понимаю, подготовимся спокойно.\n[[REMEMBER боится говорить на уроках]]', size)
      expect(out).toBe('Понимаю, подготовимся спокойно.\n')
      expect(facts).toEqual(['боится говорить на уроках'])
      expect(action).toBe(null)
    }
  })

  it('рядом с меткой действия — оба; больше двух фактов за ответ не берём', () => {
    const both = run('Тогда начнём со Speaking. Открыть?\n[[REMEMBER готовится к IELTS к маю]]\n[[OPEN practice-speaking]]')
    expect(both.facts).toEqual(['готовится к IELTS к маю'])
    expect(both.action).toMatchObject({ kind: 'open', target: 'practice-speaking' })
    expect(both.out).not.toContain('[[')
    const many = run('Ок.\n[[REMEMBER раз факт]]\n[[REMEMBER два факт]]\n[[REMEMBER три факт]]')
    expect(many.facts).toEqual(['раз факт', 'два факт'])
  })
})

describe('указание «запомни» рядом с вопросом', () => {
  it('ученик рассказал о себе — указание с меткой; обычный вопрос — нет', () => {
    for (const q of ['я готовлюсь к IELTS к маю', 'мне страшно говорить на уроке', 'у меня собеседование в декабре', 'мен IELTS-ке дайындалып жатырмын', "I'm preparing for an interview"]) {
      expect(questionHints({ question: q }).join('\n'), q).toContain('[[REMEMBER')
    }
    for (const q of ['как открыть словарь?', 'что такое present perfect', 'проверь мой ответ']) {
      expect(questionHints({ question: q }).join('\n'), q).not.toContain('[[REMEMBER')
    }
  })

  it('по-казахски — факт тоже по-казахски', () => {
    expect(questionHints({ question: 'маған грамматика қиын', answerLang: 'kk' }).join('\n')).toContain('факт в метке — тоже')
  })
})
