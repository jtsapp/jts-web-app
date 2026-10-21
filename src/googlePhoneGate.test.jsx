// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from './i18n.jsx'
import GoogleGateStep from './screens/auth/GoogleGateStep.jsx'

// После входа через Google у ученика нет ни номера, ни даты рождения (Google их не отдаёт), а школе нужно и то и
// другое: связь, напоминания, CRM — и дата, которую бэкенд требует у каждой регистрации. Дальше экрана «Остался
// один шаг» (макет «Вход через Google», 21.10.2026) не пускаем — ни при самом входе, ни при восстановлении сессии.
// Порядок в App.jsx проверяем по исходникам: экран целиком слишком тяжёлый, чтобы монтировать его ради этого
// (тот же приём, что в liveLessonScreen.test.js); сам экран гейта — рендером.
const dir = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(join(dir, p), 'utf8')
const app = read('App.jsx')
const i18n = read('i18n.jsx')

function body(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  expect(start, `нет ${startMarker}`).toBeGreaterThan(-1)
  const end = source.indexOf(endMarker, start)
  expect(end, `нет ${endMarker}`).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('Google-вход: номер и дата обязательны', () => {
  const google = body(app, 'async function handleGoogleCredential', 'async function handleGoogleGateSubmit')

  it('гейт включают флаг бэкенда, пустой телефон и пустая дата в профиле', () => {
    expect(google).toMatch(/data\?\.phoneRequired === true/)
    expect(google).toMatch(/me && !me\.phone/)
    expect(google).toMatch(/!me\?\.birthDate/)
    expect(google).toContain("setScreen('reg-google')")
  })

  it('без гейта вход идёт дальше только мимо экрана гейта', () => {
    const gateAt = google.indexOf("setScreen('reg-google')")
    const finishAt = google.indexOf('finishGoogleSession(tok)')
    expect(gateAt).toBeGreaterThan(-1)
    expect(finishAt).toBeGreaterThan(gateAt)
  })

  it('экран гейта без кнопки «назад»', () => {
    const screen = body(app, '<GoogleGateStep', '/>')
    expect(screen).not.toMatch(/onBack=/)
  })

  it('номер и дата уходят в профиль одним запросом, свежая пара токенов подменяет старую', () => {
    const save = body(app, 'async function handleGoogleGateSubmit', '// Уровень, поставленный тестом, пишем в оба стора')
    expect(save).toContain("updateUser(token, {")
    expect(save).toContain('saveToken(tok, saved.refreshToken || null)')
    expect(save).toContain('setPhoneGate(false)')
    expect(save).toContain('setBirthDateGate(false)')
    expect(save).toContain('finishGoogleSession(tok)')
  })

  it('восстановленная сессия ученика без номера тоже упирается в гейт', () => {
    expect(app).toMatch(/session && session\.role === 'STUDENT' && !session\.phone && !session\.boothAccount/)
    const restore = body(app, "session.role === 'STUDENT' && !session.phone", '// Заявка с лендинга')
    expect(restore).toContain("setScreen('reg-google')")
  })
})

function renderGate(props) {
  return render(
    <I18nProvider>
      <GoogleGateStep onSubmit={() => {}} {...props} />
    </I18nProvider>,
  )
}

describe('экран «Остался один шаг»', () => {
  it('спрашивает только недостающее', () => {
    const onlyPhone = renderGate({ needPhone: true, needBirth: false })
    expect(onlyPhone.container.querySelector('.rg-phone')).not.toBeNull()
    expect(onlyPhone.container.querySelector('.dob-field')).toBeNull()
    onlyPhone.unmount()
    const onlyBirth = renderGate({ needPhone: false, needBirth: true })
    expect(onlyBirth.container.querySelector('.rg-phone')).toBeNull()
    expect(onlyBirth.container.querySelector('.dob-field')).not.toBeNull()
  })

  it('без номера целиком не отправляет и показывает ошибку под полем', () => {
    const onSubmit = vi.fn()
    const { container } = renderGate({ needPhone: true, needBirth: false, onSubmit })
    fireEvent.change(container.querySelector('#rg-gphone'), { target: { value: '70012' } })
    fireEvent.submit(container.querySelector('form'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.querySelector('.rg-note--error')).not.toBeNull()
  })

  it('отдаёт номер и дату вместе', () => {
    const onSubmit = vi.fn()
    const { container } = renderGate({ needPhone: true, needBirth: true, onSubmit })
    fireEvent.change(container.querySelector('#rg-gphone'), { target: { value: '7001234567' } })
    const [d, m, y] = container.querySelectorAll('.dob-field__part')
    fireEvent.change(d, { target: { value: '14' } })
    fireEvent.change(m, { target: { value: '03' } })
    fireEvent.change(y, { target: { value: '1998' } })
    fireEvent.submit(container.querySelector('form'))
    expect(onSubmit).toHaveBeenCalledWith({ phone: '+77001234567', birthDate: '1998-03-14' })
  })

  it('подписи гейта есть во всех трёх языках', () => {
    for (const key of ['rg.google.title', 'rg.google.sub', 'rg.google.subPhone', 'rg.google.subBirth']) {
      expect(i18n.split(`'${key}':`).length - 1, key).toBe(3)
    }
  })
})
