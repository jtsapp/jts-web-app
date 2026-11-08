// Что браузер может прислать в POST /api/study/answers: поштучная очистка, пример — только у ошибки.
import { describe, expect, it } from 'vitest'
import { MAX_BATCH, cleanAnswer, cleanAnswers } from './contract.js'

describe('cleanAnswer', () => {
  it('тема игр, слово и урок проходят; ключи по источнику', () => {
    expect(cleanAnswer({ source: 'ggame', item: 'ggame:L2-03', ok: false, title: 'Past Simple', example: '  Yesterday I ___ (go).\n → went ', gap: 4200.4 }))
      .toEqual({ source: 'ggame', item: 'ggame:L2-03', ok: false, level: null, title: 'Past Simple', example: 'Yesterday I ___ (go). → went', gap: 4200 })
    expect(cleanAnswer({ source: 'vocab', item: 'word:do homework', ok: true, title: 'do homework', extra: { ru: 'делать уроки', kk: '' }, gap: null }))
      .toMatchObject({ item: 'word:do homework', extra: { ru: 'делать уроки' }, gap: null, example: null })
    expect(cleanAnswer({ source: 'lesson', item: 'lesson:b1:T3', ok: true, level: 'b1' })).toMatchObject({ level: 'B1' })
  })

  it('чужой источник, чужой ключ, ok не булево — мимо', () => {
    expect(cleanAnswer({ source: 'quiz', item: 'ggame:L2-03', ok: true })).toBeNull()
    expect(cleanAnswer({ source: 'ggame', item: 'word:x', ok: true })).toBeNull()
    expect(cleanAnswer({ source: 'ggame', item: 'ggame:L9-03', ok: true })).toBeNull()
    expect(cleanAnswer({ source: 'lesson', item: 'lesson:../x', ok: true })).toBeNull()
    expect(cleanAnswer({ source: 'ggame', item: 'ggame:L2-03', ok: 'yes' })).toBeNull()
  })

  it('пример у верного ответа не хранится; пауза за потолком — не мерили', () => {
    expect(cleanAnswer({ source: 'ggame', item: 'ggame:L2-03', ok: true, example: 'x', gap: 999_999 })).toMatchObject({ example: null, gap: null })
  })
})

describe('cleanAnswers', () => {
  it('отбрасывает кривые поштучно, режет пачку; пустое — null', () => {
    const good = { source: 'ggame', item: 'ggame:L2-03', ok: true }
    expect(cleanAnswers({ answers: [good, { source: 'x' }] })).toHaveLength(1)
    expect(cleanAnswers({ answers: Array(MAX_BATCH + 20).fill(good) })).toHaveLength(MAX_BATCH)
    expect(cleanAnswers({ answers: [{ source: 'x' }] })).toBeNull()
    expect(cleanAnswers(null)).toBeNull()
  })
})
