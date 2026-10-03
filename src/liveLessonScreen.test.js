import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Экран живого урока держит в ref-ах следование за классом, очередь ответов на
// снимок рамки и буфер показа — всё про одно занятие. Без перемонтирования при
// смене урока (другой урок из расписания, новый сеанс аккаунта класса) они
// переживали бы её: ученик «следовал» бы за классом прошлого занятия.
const app = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'App.jsx'), 'utf8')

describe('App — экран живого урока', () => {
  it('монтируется заново при смене урока', () => {
    const mount = app.split('\n').find((line) => line.includes('<LiveLessonPage'))
    expect(mount).toMatch(/\bkey=\{liveLessonId\}/)
  })
})
