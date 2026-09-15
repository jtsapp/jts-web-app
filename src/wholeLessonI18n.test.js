import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Сторож против дыр в переводе.
 *
 * `t()` на отсутствующем ключе молча отдаёт сам ключ, и на экран выходит
 * «homework.openLesson». Заметить это можно только глазами и только переключив
 * язык — то есть практически никогда. Читаем словарь как ТЕКСТ: `dict` из
 * i18n.jsx не экспортируется, а рендерить провайдер трижды ради проверки
 * наличия ключа — дороже и хрупче.
 */
const dict = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'i18n.jsx'), 'utf8')

const КЛЮЧИ = [
  'homework.wholeLesson',
  'homework.openLesson',
  'homework.wholeLessonHint',
  'homework.autoCheck',
  'homework.autoPercent',
  'homework.submittedOn',
  'lesson.ws.finishTest',
  'lesson.ws.submitLesson',
  'lesson.ws.submitting',
  'lesson.ws.answeredCount',
  'lesson.ws.submitEmpty',
  'lesson.ws.testNoKeys',
  'lesson.ws.submitted',
  'lesson.ws.submitFailed',
  'lesson.ws.alreadySubmitted',
]

/** Сколько раз ключ объявлен — по одному на язык, ru/en/kk. */
function объявлений(key) {
  return dict.split(`'${key}':`).length - 1
}

describe('подписи урока, заданного на дом', () => {
  it.each(КЛЮЧИ)('%s заведён на все три языка', (key) => {
    expect(объявлений(key)).toBe(3)
  })

  // Подстановки — часть контракта подписи: {percent} без значения выйдет на
  // экран фигурными скобками.
  it('подписи с числами несут свои подстановки', () => {
    expect(dict).toMatch(/'homework\.autoPercent':\s*'[^']*\{percent\}/)
    expect(dict).toMatch(/'homework\.submittedOn':\s*'[^']*\{date\}/)
    expect(dict).toMatch(/'lesson\.ws\.submitted':\s*'[^']*\{percent\}/)
    expect(dict).toMatch(/'lesson\.ws\.answeredCount':\s*'[^']*\{answered\}[^']*\{total\}/)
  })
})
