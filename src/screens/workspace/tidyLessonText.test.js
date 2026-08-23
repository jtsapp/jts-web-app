import { describe, expect, it } from 'vitest'
import { tidyLessonText } from './tidyLessonText.js'

describe('tidyLessonText', () => {
  it('срезает хвост > из разбора курса', () => {
    expect(tidyLessonText('make: make small talk." >')).toBe('make: make small talk."')
    expect(tidyLessonText('interrupt somebody.">')).toBe('interrupt somebody."')
    expect(tidyLessonText('Offend is transitive – no to. >')).toBe('Offend is transitive – no to.')
  })

  it('не трогает сравнение внутри фразы', () => {
    expect(tidyLessonText('a > b in this sentence')).toBe('a > b in this sentence')
  })
})
