// Подпись «что задано» у выдачи (materialAssignments.js → assignmentScope) —
// три языка, один набор ключей. t() молча откатывается на русский, поэтому
// пропуск или копия русского в kk/en глазами не видны — ловим здесь. Тексты те
// же, что у преподавателя (web-admin, homework.materialPart.scope*): обе стороны
// называют выданное одинаково.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const text = readFileSync(join(here, 'i18n.jsx'), 'utf8').replace(/\r\n/g, '\n')

function block(lang) {
  const start = new RegExp(`^  ${lang}: \\{$`, 'm').exec(text)
  const next = /^ {2}(?:ru|en|kk): \{$/gm
  next.lastIndex = start.index + 1
  const end = next.exec(text)
  return text.slice(start.index, end ? end.index : text.length)
}

const KEY = /^ {4}'(homework\.scope\.[^']*)': '(.*)',$/gm
const keysOf = (lang) => Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))

describe('подпись «что задано» — три языка', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('русские подписи — те же, что у преподавателя', () => {
    expect(ru).toEqual({
      'homework.scope.fragment': 'Фрагмент урока',
      'homework.scope.tasks': 'Задания урока',
      'homework.scope.stages': 'Часть урока',
    })
  })

  it('ключи одинаковые во всех языках, перевод не скопирован с русского', () => {
    expect(Object.keys(ru)).toHaveLength(3)
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
    expect(Object.keys(kk).sort()).toEqual(Object.keys(ru).sort())
    for (const k of Object.keys(ru)) {
      expect(kk[k], k).not.toBe(ru[k])
      expect(en[k], k).not.toMatch(/[А-Яа-яЁё]/)
    }
  })
})
