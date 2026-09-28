import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from './engine.js'
import { TOPICS, nextTopic, topicText, topicTranslated } from './topics.js'

describe('arcade topics', () => {
  it('по набору тем на каждую сложность', () => {
    expect(TOPICS).toHaveLength(DIFFICULTIES.length)
  })

  it('переводы идут в том же порядке и того же размера, что английский', () => {
    for (const set of TOPICS)
      for (const lang of ['ru', 'kk']) if (set[lang]) expect(set[lang]).toHaveLength(set.en.length)
  })

  it('Easy и Medium переведены, Hard и Very Hard — только по-английски', () => {
    expect([0, 1, 2, 3].map((l) => topicTranslated(l, 'ru'))).toEqual([true, true, false, false])
    expect([0, 1, 2, 3].map((l) => topicTranslated(l, 'kk'))).toEqual([true, true, false, false])
    expect(topicTranslated(0, 'en')).toBe(false)
    expect(topicText(3, 0, 'ru')).toBe(TOPICS[3].en[0])
    expect(topicText(0, 1, 'kk')).toBe(TOPICS[0].kk[1])
  })

  it('следующая тема никогда не повторяет прошлую', () => {
    for (let previous = 0; previous < 6; previous++)
      for (const r of [0, 0.2, 0.5, 0.99]) expect(nextTopic(0, previous, () => r)).not.toBe(previous)
    expect(nextTopic(0, null, () => 0.99)).toBe(5)
  })
})
