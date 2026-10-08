import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Чат регистрации по макету «Web» (кадры 1434:6021 → 1434:5833, правка
// 04.10.2026). Читаем исходники как текст: проверяется сценарий и словарь, а не
// таймеры «печатает…», ради которых пришлось бы гонять фейковые часы.

const src = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(src, 'screens', 'RegistrationPage.jsx'), 'utf8')
const dict = readFileSync(join(src, 'i18n.jsx'), 'utf8')

/** Ключи сценария Декстера в порядке показа. */
function scriptKeys() {
  const block = page.match(/const dexterScript = \[([\s\S]*?)\]/)
  return block ? [...block[1].matchAll(/key: '([\w.]+)'/g)].map((m) => m[1]) : []
}

describe('чат регистрации по макету', () => {
  it('после имени Декстер пишет четыре реплики, как в кадре 1434:5833', () => {
    expect(scriptKeys()).toEqual(['dexter.nice', 'dexter.features', 'dexter.fun', 'dexter.toReg'])
  })

  it('у каждой реплики и подписи поля есть перевод во всех трёх языках', () => {
    for (const key of ['dexter.features', 'dexter.fun', 'chat.prefix', 'chat.myName']) {
      const re = new RegExp(`'${key.replace('.', '\\.')}':`, 'g')
      expect(dict.match(re) || [], key).toHaveLength(3)
    }
  })

  it('старой реплики про «улучшишь английский» в словаре больше нет', () => {
    expect(dict).not.toMatch(/'dexter\.motiv':/)
  })

  it('поле ввода начинается с неизменяемой «Меня зовут», а пузырь ученика — фраза целиком', () => {
    expect(page).toMatch(/t\('chat\.prefix'\)/)
    expect(page).toMatch(/'chat\.myName'/)
  })
})
