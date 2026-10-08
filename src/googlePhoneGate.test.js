import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// После входа через Google номера у ученика нет (Google его не отдаёт), а школе он нужен всегда: связь,
// напоминания об уроках, CRM. Поэтому дальше экрана номера не пускаем — ни при самом входе, ни при
// восстановлении сессии. Тесты читают исходники: экраны App.jsx слишком тяжёлые, чтобы монтировать их
// ради проверки порядка шагов (тот же приём, что в liveLessonScreen.test.js).
const dir = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(join(dir, p), 'utf8')
const app = read('App.jsx')
const phonePage = read('screens/RegisterPhonePage.jsx')
const i18n = read('i18n.jsx')

function body(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  expect(start, `нет ${startMarker}`).toBeGreaterThan(-1)
  const end = source.indexOf(endMarker, start)
  expect(end, `нет ${endMarker}`).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('Google-вход: номер обязателен', () => {
  const google = body(app, 'async function handleGoogleCredential', 'async function continueGoogleOnboarding')

  it('номер спрашивается раньше даты рождения', () => {
    const phoneAt = google.indexOf("setScreen('reg-phone')")
    const birthAt = app.indexOf("setScreen('reg-birth')", app.indexOf('async function continueGoogleOnboarding'))
    expect(phoneAt).toBeGreaterThan(-1)
    expect(birthAt).toBeGreaterThan(-1)
    // дата рождения живёт уже в continueGoogleOnboarding, куда вход попадает только после номера
    expect(google).not.toContain("setScreen('reg-birth')")
  })

  it('гейт включают и флаг бэкенда, и пустой телефон в профиле', () => {
    expect(google).toMatch(/data\?\.phoneRequired === true/)
    expect(google).toMatch(/me && !me\.phone/)
    expect(google).toContain('setPhoneGate(true)')
  })

  it('экран номера в режиме Google не даёт вернуться назад', () => {
    expect(app).toMatch(/googleGate=\{phoneGate\}/)
    expect(app).toMatch(/onBack=\{phoneGate \? undefined/)
  })

  it('отправка номера при гейте идёт в профиль, а не в шаг почты', () => {
    const submit = body(app, 'function handleRegPhoneSubmit', "setScreen('reg-email')")
    expect(submit).toContain('if (phoneGate) return handleGooglePhoneSubmit(fullPhone)')
  })

  it('свежая пара токенов после смены номера подменяет старую', () => {
    const save = body(app, 'async function handleGooglePhoneSubmit', '// Завершение письменного CEFR-теста')
    expect(save).toContain('updateUser(token, { name: name || \'User\', phone: fullPhone })')
    expect(save).toContain('saveToken(tok, saved.refreshToken || null)')
    expect(save).toContain('setPhoneGate(false)')
    expect(save).toContain('continueGoogleOnboarding(tok, null)')
  })

  it('восстановленная сессия ученика без номера тоже упирается в гейт', () => {
    expect(app).toMatch(/session && session\.role === 'STUDENT' && !session\.phone && !session\.boothAccount/)
  })
})

describe('экран номера и переводы', () => {
  it('в режиме Google берёт свои заголовок и подсказку', () => {
    expect(phonePage).toContain("t(googleGate ? 'regphone.titleGoogle' : 'regphone.title')")
    expect(phonePage).toContain("t(googleGate ? 'regphone.subtitleGoogle' : 'regphone.subtitle')")
  })

  it('ключи есть во всех трёх языках', () => {
    for (const key of ['regphone.titleGoogle', 'regphone.subtitleGoogle']) {
      const times = i18n.split(`'${key}':`).length - 1
      expect(times, key).toBe(3)
    }
  })
})
