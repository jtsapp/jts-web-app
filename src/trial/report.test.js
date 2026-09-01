// Что уезжает на бэкенд и что видит преподаватель на экране результата.
// Проверяется числами: payload попадает в базу, а сильные стороны и зоны
// роста преподаватель проговаривает вслух — ошибка здесь видна ученику.
import { describe, it, expect } from 'vitest'
import { trialResultPayload, strengthsAndGrowth, vocabMatchScore, sendResultWithRetry } from './report.js'

const result = {
  level: 'B1',
  theta: 0.123456,
  se: 0.4567,
  skills: {
    routing: { n: 6, correct: 5, score: 5 },
    listening: { n: 4, correct: 1, score: 1 },
    reading: { n: 4, correct: 4, score: 4 },
  },
  flags: ['video_unavailable'],
}

const session = { exportJson: () => ({ log: [{ id: 'x' }], result }) }

describe('payload результата', () => {
  it('собирает уровень, оценку и лог сессии', () => {
    const payload = trialResultPayload({
      result,
      session,
      startCando: 1,
      lang: 'ru',
      startedAt: 1000,
      now: 901000,
    })
    expect(payload.level).toBe('B1')
    expect(payload.theta).toBe(0.123)
    expect(payload.standardError).toBe(0.457)
    expect(payload.startCando).toBe(1)
    expect(payload.durationSeconds).toBe(900)
    expect(payload.flags).toEqual(['video_unavailable'])
    expect(payload.raw.log).toHaveLength(1)
  })

  it('без распознанного уровня не отправляется ничего', () => {
    expect(trialResultPayload({ result: { ...result, level: 'Z9' }, session, now: 1 })).toBeNull()
    expect(trialResultPayload({ result: {}, session, now: 1 })).toBeNull()
  })

  it('незаполненные числа не превращаются в NaN', () => {
    const payload = trialResultPayload({
      result: { level: 'A0', skills: {} },
      session: null,
      startCando: 0,
      lang: 'ru',
      startedAt: 0,
      now: 5000,
    })
    expect(payload.theta).toBeNull()
    expect(payload.standardError).toBeNull()
    expect(payload.durationSeconds).toBeNull()
    expect(payload.raw).toBeNull()
  })
})

describe('сильные стороны и зоны роста', () => {
  it('делит блоки по порогу 0.6', () => {
    const { strengths, growth } = strengthsAndGrowth(result, null)
    expect(strengths.map((s) => s.name)).toEqual(['Чтение', 'Разминка'])
    expect(growth.map((s) => s.name)).toEqual(['Аудирование'])
  })

  it('блок с одним заданием не попадает никуда — статистики мало', () => {
    const { strengths, growth } = strengthsAndGrowth(
      { level: 'A2', skills: { clip: { n: 1, correct: 0, score: 0 } } },
      null,
    )
    expect(strengths).toEqual([])
    expect(growth).toEqual([])
  })

  it('если сильных нет — показываем лучшее из имеющегося, а не пустой экран', () => {
    const { strengths } = strengthsAndGrowth(
      { level: 'A1', skills: { routing: { n: 6, correct: 1, score: 1 }, reading: { n: 4, correct: 0, score: 0 } } },
      null,
    )
    expect(strengths).toHaveLength(1)
    expect(strengths[0].name).toBe('Разминка')
  })

  it('словарный матчинг учитывается наравне с блоками движка', () => {
    const { strengths } = strengthsAndGrowth(result, { n: 2, score: 2 })
    expect(strengths.map((s) => s.name)).toContain('Словарь и идиомы')
  })
})

describe('счёт словарного матчинга', () => {
  it('суммирует частичные баллы из лога', () => {
    expect(vocabMatchScore([
      { block: 'vocab_match', correct: 1 },
      { block: 'vocab_match', correct: 0.5 },
      { block: 'reading', correct: 1 },
    ])).toEqual({ n: 2, score: 1.5 })
  })

  it('без заданий словаря — ничего', () => {
    expect(vocabMatchScore([{ block: 'reading', correct: 1 }])).toBeNull()
    expect(vocabMatchScore([])).toBeNull()
  })
})

/**
 * Отправка результата.
 *
 * Диагностика уходит один раз за урок и нигде на клиенте не остаётся: потеря
 * запроса — это потеря всего, ради чего урок проводили. Поэтому проверяется
 * именно путь потери, а не счастливый случай.
 */
describe('отправка результата с повтором', () => {
  const payload = { level: 'B1' }
  const noWait = () => Promise.resolve()

  it('удачная отправка не повторяется', async () => {
    let calls = 0
    await sendResultWithRetry(async () => { calls += 1; return { ok: true } }, payload, { wait: noWait })

    expect(calls).toBe(1)
  })

  it('обрыв связи закрывается вторым заходом', async () => {
    let calls = 0
    const send = async () => {
      calls += 1
      if (calls === 1) throw new Error('network')
      return { ok: true }
    }

    await expect(sendResultWithRetry(send, payload, { wait: noWait })).resolves.toEqual({ ok: true })
    expect(calls).toBe(2)
  })

  it('если и повтор не прошёл — ошибка доходит до экрана преподавателя', async () => {
    const send = async () => { throw new Error('down') }

    await expect(sendResultWithRetry(send, payload, { wait: noWait })).rejects.toThrow('down')
  })

  it('повтор отправляет то же тело, а не пустое', async () => {
    const bodies = []
    const send = async (body) => {
      bodies.push(body)
      if (bodies.length === 1) throw new Error('network')
      return { ok: true }
    }

    await sendResultWithRetry(send, payload, { wait: noWait })

    expect(bodies).toEqual([payload, payload])
  })
})
