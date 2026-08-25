import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Входы через Apple ID и Google с сайта убраны по решению владельца
// (2026-08-24): на сайте остаётся вход по номеру телефона.
//
// Убирали их из шести мест сразу — экран регистрации, два экрана входа, App.jsx,
// клиент api.js и модуль GIS, — поэтому вернуться они могут так же незаметно:
// достаточно одной кнопки в новом экране. Тест читает исходники как текст,
// потому что предмет проверки — отсутствие кода, а не поведение.

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

// Google тут упоминается по другим поводам: шрифты, Google Meet в расписании,
// Cloud TTS у голоса Луны. Ищем только следы ВХОДА.
const AUTH_MARKS = [
  /googleAuth/,
  /renderGoogleButton|isGoogleAuthEnabled/,
  /loginWithGoogle/,
  /GOOGLE_CLIENT_ID/,
  /['"]\/auth\/google['"]/,
  /AppleIcon|GoogleIcon/,
  /auth-btn--(apple|google)|google-slot/,
]

describe('вход только по номеру телефона', () => {
  it('в исходниках не осталось следов входа через Apple ID и Google', () => {
    const hits = []
    for (const file of sources()) {
      const text = readFileSync(file, 'utf8')
      for (const mark of AUTH_MARKS) {
        if (mark.test(text)) hits.push(`${file.slice(src.length + 1)} — ${mark}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('модуль Google Identity Services удалён', () => {
    expect(existsSync(join(src, 'lib', 'googleAuth.js'))).toBe(false)
  })

  it('стилей чужих кнопок входа в styles.css тоже нет', () => {
    const css = readFileSync(join(src, 'styles.css'), 'utf8')
    expect(css).not.toMatch(/auth-btn|google-slot|auth-divider/)
  })

  it('на экране регистрации ровно одна кнопка входа — по телефону', () => {
    const page = readFileSync(join(src, 'screens', 'RegistrationPage.jsx'), 'utf8')
    expect(page).toMatch(/auth-primary/)
    expect(page.match(/className="auth[^"]*"/g)).toEqual(['className="auth"', 'className="auth-primary"'])
  })

  it('ключи переводов для чужих кнопок убраны', () => {
    const dict = readFileSync(join(src, 'i18n.jsx'), 'utf8')
    for (const key of ['auth.apple', 'auth.appleSoon', 'auth.google']) {
      expect(dict).not.toContain(`'${key}'`)
    }
  })
})
