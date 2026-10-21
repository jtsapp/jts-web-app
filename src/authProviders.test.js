import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Вход через Apple ID с сайта убран, вход через Google — оставлен (решение
// владельца, 2026-08-25: сначала убрали оба, потом Google вернули).
//
// 04.10.2026 владелец убрал Google из регистрации (чат с Декстером): он заводил
// аккаунт вовсе без номера. Вернули 07.10.2026 вместе с обязательным шагом
// «номер телефона» после Google-входа (App.jsx, phoneGate) — см. googlePhoneGate.test.jsx.
//
// Apple жил в шести местах сразу — два экрана входа, регистрация, иконки,
// переводы и стили, — поэтому вернуться он может так же незаметно: достаточно
// одной кнопки в новом экране. Тест читает исходники как текст, потому что
// предмет проверки — отсутствие кода, а не поведение.

const src = dirname(fileURLToPath(import.meta.url))

/** Все .js/.jsx проекта, кроме тестов. */
function sources(dir = src, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) sources(path, acc)
    else if (/\.jsx?$/.test(entry.name) && !entry.name.includes('.test.')) acc.push(path)
  }
  return acc
}

const files = sources().map((path) => [path, readFileSync(path, 'utf8')])

// Ищем только следы ВХОДА через Apple: слово apple встречается и в безобидных
// местах (apple-touch-icon, -apple-system в шрифтах).
const APPLE_MARKS = [/AppleIcon/, /auth-btn--apple/, /['"]auth\.apple/, /AppleID|appleid/]

describe('вход: Apple убран, Google на месте', () => {
  it('следов входа через Apple ID в исходниках нет', () => {
    const hits = []
    for (const [path, text] of files) {
      for (const mark of APPLE_MARKS) {
        if (mark.test(text)) hits.push(`${path.slice(src.length + 1)} — ${mark}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('стилей кнопки Apple в styles.css тоже нет', () => {
    expect(readFileSync(join(src, 'styles.css'), 'utf8')).not.toMatch(/auth-btn--apple/)
  })

  it('вход через Google на месте: модуль GIS, вызов бэкенда и кнопка на экранах входа', () => {
    expect(existsSync(join(src, 'lib', 'googleAuth.js'))).toBe(true)
    expect(readFileSync(join(src, 'api.js'), 'utf8')).toMatch(/loginWithGoogle/)
    const fields = readFileSync(join(src, 'screens', 'auth', 'fields.jsx'), 'utf8')
    expect(fields).toMatch(/renderGoogleButton/)
    const login = readFileSync(join(src, 'screens', 'auth', 'LoginScreens.jsx'), 'utf8')
    expect(login).toMatch(/<GoogleButton/)
    expect(login).toMatch(/text="signin_with"/)
  })

  // Макет «Регистрация» (21.10.2026): Google — под кнопкой «Продолжить» шага «Как с вами связаться?». Дальше
  // такой ученик проходит гейт «Остался один шаг» (номер и дата), см. googlePhoneGate.test.jsx.
  it('в регистрации Google на шаге почты и телефона — под основной кнопкой', () => {
    const reg = readFileSync(join(src, 'screens', 'auth', 'ContactsStep.jsx'), 'utf8')
    expect(reg).toMatch(/<GoogleButton/)
    expect(reg.indexOf('<PrimaryButton')).toBeLessThan(reg.indexOf('<GoogleButton'))
    const app = readFileSync(join(src, 'App.jsx'), 'utf8')
    expect(app).toMatch(/<ContactsStep[\s\S]*?onGoogleToken=\{handleGoogleCredential\}/)
  })

  it('подписи кнопки Google новых экранов есть во всех трёх языках', () => {
    const dict = readFileSync(join(src, 'i18n.jsx'), 'utf8')
    for (const key of ['rg.google.continue', 'rg.google.signin']) {
      expect(dict.split(`'${key}':`).length - 1, key).toBe(3)
    }
  })

  it('подписи кнопки есть во всех трёх языках', () => {
    const dict = readFileSync(join(src, 'i18n.jsx'), 'utf8')
    expect(dict.match(/'auth\.google':/g) || []).toHaveLength(3)
  })
})
