import { describe, it, expect } from 'vitest'
import { failureOutcome, publishOutcome, retryMinutes } from './outcome.js'

const response = (over = {}) => ({ decision: 'published', post: null, risk: 5, reasons: [], hits: [], removedMediaIds: [], feedbackId: null, ...over })

describe('итог публикации — таблица §3.3', () => {
  it.each([
    ['published', 'ok', 'birge.res.published.title'],
    ['hidden', 'ok', 'birge.res.published.title'],
    ['pending', 'warn', 'birge.res.pending.title'],
    ['tomorrow', 'warn', 'birge.res.tomorrow.title'],
  ])('%s → %s, поле очищается, карточка поста — в ленту', (decision, tone, titleKey) => {
    const post = { id: 202 }
    expect(publishOutcome(response({ decision, post }))).toMatchObject({ tone, titleKey, clear: true, post, reasons: [], hits: [] })
  })

  it('отказ: причины ключами без повторов, риск и hits; текст остаётся в поле', () => {
    const out = publishOutcome(
      response({
        decision: 'rejected',
        risk: 96,
        reasons: [{ code: 'PROFANITY', score: 96 }, { code: 'NEW_CODE', score: 50 }, { code: 'ALSO_NEW', score: 40 }],
        hits: ['х@й', '', 7],
      }),
    )
    expect(out).toMatchObject({
      tone: 'bad',
      titleKey: 'birge.res.rejected.title',
      textKey: 'birge.res.rejected.rewrite',
      clear: false,
      post: null,
      risk: 96,
      hits: ['х@й'],
      removedMediaIds: [],
    })
    expect(out.reasons).toEqual(['birge.reason.PROFANITY', 'birge.reason.OTHER'])
  })

  it('опасное фото: текст остаётся, убрать только то, что сервер удалил (removedMediaIds, §4)', () => {
    const out = publishOutcome(
      response({ decision: 'rejected', risk: 92, reasons: [{ code: 'IMAGE_UNSAFE', score: 92 }], removedMediaIds: [7, 'x', null] }),
    )
    expect(out).toMatchObject({ clear: false, removedMediaIds: [7] })
    expect(publishOutcome(response({ decision: 'rejected', removedMediaIds: undefined })).removedMediaIds).toEqual([])
  })

  it('в Feedback: поле очищается (обращение уже создано), есть ссылка на обращение', () => {
    const out = publishOutcome(response({ decision: 'feedback', risk: 78, reasons: [{ code: 'PLATFORM_COMPLAINT', score: 78 }], feedbackId: 55 }))
    expect(out).toMatchObject({
      tone: 'warn',
      titleKey: 'birge.res.feedback.title',
      textKey: 'birge.res.feedback.text',
      clear: true,
      feedback: true,
      feedbackId: 55,
      post: null,
    })
  })

  it('неизвестное решение — как сбой: текст не теряется', () => {
    expect(publishOutcome(response({ decision: 'maybe' }))).toMatchObject({ tone: 'bad', clear: false, textKey: 'birge.res.error' })
    expect(publishOutcome(null)).toMatchObject({ clear: false, textKey: 'birge.res.error' })
  })
})

describe('сбой публикации', () => {
  it('429 — минуты вверх и не меньше одной (§3.7)', () => {
    expect(failureOutcome({ status: 429, retryAfterSec: 1200 })).toMatchObject({
      tone: 'bad',
      titleKey: 'birge.res.notPublished',
      textKey: 'birge.res.rateLimit',
      vars: { n: 20 },
      clear: false,
    })
    expect(failureOutcome({ status: 429, retryAfterSec: 61 }).vars).toEqual({ n: 2 })
    expect(failureOutcome({ status: 429, retryAfterSec: 5 }).vars).toEqual({ n: 1 })
    expect(failureOutcome({ status: 429, retryAfterSec: null }).vars).toEqual({ n: 1 })
    // то же правило — у 429 на загрузке фото (форма зовёт retryMinutes сама)
    expect(retryMinutes({ status: 429, retryAfterSec: 600 })).toBe(10)
  })

  it('400 — проверка запроса: показать текст сервера («Напишите хотя бы пару слов»), текст в поле остаётся', () => {
    expect(failureOutcome({ status: 400, serverMessage: 'Напишите хотя бы пару слов' })).toMatchObject({
      tone: 'bad',
      titleKey: 'birge.res.notPublished',
      message: 'Напишите хотя бы пару слов',
      clear: false,
    })
    expect(failureOutcome({ status: 400, serverMessage: null })).toMatchObject({ textKey: 'birge.res.error', message: null })
  })

  it('сеть, 409, 5xx — общая ошибка, текст остаётся', () => {
    for (const status of [0, 409, 500]) {
      expect(failureOutcome({ status })).toMatchObject({ textKey: 'birge.res.error', clear: false, vars: {} })
    }
  })
})
