// Итоги урока и подписи стадий раньше были зашиты по-русски: экран итогов
// («Отличный результат», «Перейти на следующий урок»…) шёл мимо t(), а карта
// стадий умела только «Practice → Практика». При казахском или английском
// интерфейсе — переключатель языка стоит прямо в уроке — ученик видел русские
// итоги посреди переведённого урока. t() молча откатывается на русский, поэтому
// пропуск ключа в en/kk незаметен глазами — ловим его здесь.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { stageLabel } from './learning/CourseStepPlayer.jsx'

const here = dirname(fileURLToPath(import.meta.url))
const text = readFileSync(join(here, 'i18n.jsx'), 'utf8').replace(/\r\n/g, '\n')

function block(lang) {
  const start = new RegExp(`^  ${lang}: \\{$`, 'm').exec(text)
  const next = /^ {2}(?:ru|en|kk): \{$/gm
  next.lastIndex = start.index + 1
  const end = next.exec(text)
  return text.slice(start.index, end ? end.index : text.length)
}

const KEY = /^ {4}'(lesson\.(?:result|stage)\.[^']*)': '(.*)',$/gm
const keysOf = (lang) => Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))

describe('итоги урока и стадии — три языка', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('набор ключей одинаковый и не пустой', () => {
    expect(Object.keys(ru).length).toBeGreaterThan(10)
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
    expect(Object.keys(kk).sort()).toEqual(Object.keys(ru).sort())
  })

  it('перевод действительно переведён, а не скопирован с русского', () => {
    for (const k of Object.keys(ru)) {
      expect(en[k], k).not.toMatch(/[А-Яа-яЁё]/)
    }
    expect(kk['lesson.result.next']).not.toBe(ru['lesson.result.next'])
  })
})

describe('stageLabel', () => {
  const t = (key) => `<${key}>`

  it('английская подпись из данных A1–B2 и русская из A0 ведут на один ключ', () => {
    expect(stageLabel('Practice', t)).toBe('<lesson.stage.practice>')
    expect(stageLabel('Практика', t)).toBe('<lesson.stage.practice>')
    expect(stageLabel('Warm-up', t)).toBe('<lesson.stage.warmup>')
    expect(stageLabel('Итоги', t)).toBe('<lesson.stage.wrap>')
  })

  it('незнакомая подпись показывается как есть', () => {
    expect(stageLabel('Bonus', t)).toBe('Bonus')
  })
})
