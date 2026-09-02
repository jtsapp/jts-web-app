import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
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

  // Экраны курса нового поколения: «найди ошибку» и разбор по колонкам — это
  // упражнения с ответом, а строки для повтора вслух и запись своего голоса
  // сверять не с чем.
  it('поиск ошибки и колонки проверяются, фразы и запись — нет', () => {
    expect(isGraded({ type: 'mistake', tokens: ['I', 'no', 'like'], bad: 1 })).toBe(true)
    expect(isGraded({ type: 'cols', items: [{ text: 'I', col: 0 }] })).toBe(true)
    // Пустой экран проверять нечем — он не должен запирать урок.
    expect(isGraded({ type: 'mistake', tokens: [] })).toBe(false)
    expect(isGraded({ type: 'cols', items: [] })).toBe(false)
    expect(isGraded({ type: 'phrases' })).toBe(false)
    expect(isGraded({ type: 'record' })).toBe(false)
  })
})

// Вариант «выбери что ближе» рассчитан на слово с эмодзи, но у курса это бывает
// целая ситуация на десять слов (85 экранов B2, 29 у B1): в колонку 173px такой
// текст не влезал и вылезал за карточку. Длинные варианты идут строками, и
// адаптив обязан этот вид уважать — иначе на планшете они снова схлопнутся
// в три колонки и всё вернётся.
describe('CourseStepPlayer — длинные варианты «выбери что ближе»', () => {
  const css = fs.readFileSync(new URL('../course.css', import.meta.url), 'utf8')
  // Комментарий перед правилом попадает в тот же кусок, что и селектор, —
  // режем его, иначе селектор базового правила никогда не совпадёт.
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, head, body]) => ({
    head: head.replace(/\/\*[\s\S]*?\*\//g, '').trim(),
    body,
  }))
  const columnRules = rules.filter((r) => r.head.includes('.cp-picks') && /grid-template-columns/.test(r.body))

  it('строчный вид — одна колонка', () => {
    const rows = columnRules.find((r) => r.head.includes('.is-rows'))
    expect(rows).toBeTruthy()
    expect(rows.body).toMatch(/grid-template-columns:\s*minmax\(0,\s*620px\)/)
  })

  it('медиазапросы перекладывают только карточный вид', () => {
    const clashing = columnRules.filter((r) => r.head !== '.cp-picks' && !r.head.includes('is-rows') && !r.head.includes(':not(.is-rows)'))
    expect(clashing.map((r) => r.head)).toEqual([])
  })
})
