import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Подписи ступеней на карточке «ВАШ УРОВЕНЬ».
 *
 * Они были сдвинуты на ступень вниз: A1 подписан Beginner, A2 — Elementary.
 * Ученица с закреплённым A2 видела «A2 · Elementary», хотя преподаватель открыл
 * ей Pre-Intermediate, и написала, что уровни не совпадают. A0 в таблице не было
 * вовсе — на его месте показывался бы сам ключ.
 *
 * Названия обязаны совпадать с курсами школы и с панелью преподавателя
 * (web-admin, enums.level.*): один и тот же уровень не может называться
 * по-разному на двух экранах — именно из-за этого и возник вопрос.
 *
 * Тест читает словарь текстом: предмет проверки — сами значения, а не то, как
 * их показали (тот же приём, что в lessonWorkspace.design.test.js).
 */
const here = dirname(fileURLToPath(import.meta.url))
const i18n = readFileSync(join(here, 'i18n.jsx'), 'utf8').replace(/\r\n/g, '\n')

/** Все значения ключа во всех языковых блоках. */
function valuesOf(key) {
  return [...i18n.matchAll(new RegExp(`'${key}':\\s*'([^']*)'`, 'g'))].map((m) => m[1])
}

const LADDER = {
  'cefr.A0': 'Beginner',
  'cefr.A1': 'Elementary',
  'cefr.A2': 'Pre-Intermediate',
  'cefr.B1': 'Intermediate',
  'cefr.B2': 'Upper-Intermediate',
}

describe('подписи ступеней совпадают с курсами школы', () => {
  for (const [key, name] of Object.entries(LADDER)) {
    it(`${key} — ${name}`, () => {
      const values = valuesOf(key)

      // Языковых блоков три (ru, en, kk), и ступень называется одинаково во
      // всех: это название курса, а не переводимое слово.
      expect(values.length).toBe(3)
      expect([...new Set(values)]).toEqual([name])
    })
  }

  it('A2 не называется Elementary — так зовут ступень ниже', () => {
    expect(valuesOf('cefr.A2')).not.toContain('Elementary')
  })
})
