import { describe, it, expect } from 'vitest'
import { isGraded } from './CourseStepPlayer.jsx'

// Шаг, который плеер считает проверяемым, требует ответа перед «Продолжить».
// Если ответить нечем, урок встаёт намертво — поэтому граница «что проверяем»
// вынесена отдельной функцией и закрыта тестами.
describe('CourseStepPlayer — что считается проверяемым шагом', () => {
  it('слушание с вариантами проверяется', () => {
    expect(isGraded({ type: 'listen', options: ['a', 'b'], answer: 'a' })).toBe(true)
  })

  it('слушание без вариантов НЕ проверяется: отвечать нечем', () => {
    // Экстрактор вынимает кнопку плеера из строки урока отдельным блоком, и
    // такой шаг — просто «послушай и иди дальше». Пока он считался
    // проверяемым, «Проверить» не включалась никогда: 24 таких экрана в A0
    // блокировали стадию Listening целиком.
    expect(isGraded({ type: 'listen', options: [], answer: undefined })).toBe(false)
    expect(isGraded({ type: 'listen', src: 'https://files-dev.justtostudy.kz/a0/audio/x.mp3' })).toBe(false)
  })

  it('выбор, пропуск и порядок слов проверяются, заметка и карточки — нет', () => {
    expect(isGraded({ type: 'choice' })).toBe(true)
    expect(isGraded({ type: 'gap' })).toBe(true)
    expect(isGraded({ type: 'order' })).toBe(true)
    expect(isGraded({ type: 'note' })).toBe(false)
    expect(isGraded({ type: 'cards' })).toBe(false)
    expect(isGraded({ type: 'checklist' })).toBe(false)
  })
})
