import { describe, it, expect, vi, afterEach } from 'vitest'
import { homeScreenFor } from './homeScreen.js'

// Роль читается из payload JWT (lib/jwt.js), подпись никто не проверяет —
// собираем токен руками, как в screens/LessonsPage.test.jsx.
const tokenFor = (role) => {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${b64({ alg: 'HS256' })}.${b64({ role, userId: 1 })}.sig`
}
const STUDENT = tokenFor('STUDENT')
const TEACHER = tokenFor('TEACHER')

describe('домашний экран после входа', () => {
  it('аккаунт класса ведёт в класс, а не в кабинет', () => {
    expect(homeScreenFor({ token: STUDENT, boothAccount: true })).toBe('booth')
  })

  // Признак класса перевешивает всё: пришедший на пробный не должен ни сдавать
  // тест уровня, ни попадать в «Уроки», — аккаунт служебный, и что там за роль
  // в токене, значения не имеет.
  it('признак класса перевешивает роль и непройденный тест уровня', () => {
    expect(homeScreenFor({ token: TEACHER, boothAccount: true, needsLevelTest: true })).toBe('booth')
  })

  it('преподаватель — в «Уроки»', () => {
    expect(homeScreenFor({ token: TEACHER })).toBe('lessons')
  })

  it('ученик без уровня в профиле — на тест уровня', () => {
    expect(homeScreenFor({ token: STUDENT, needsLevelTest: true })).toBe('test-intro')
  })

  it('ученик с уровнем — в королевства', () => {
    expect(homeScreenFor({ token: STUDENT })).toBe('kingdom')
  })

  // Восстановление сессии зовёт функцию без needsLevelTest: пройден тест или
  // нет, оно не знает. Умолчание обязано быть «не приставать с тестом».
  it('без аргументов вообще — королевства, а не тест', () => {
    expect(homeScreenFor({})).toBe('kingdom')
  })
})

// TUTOR_ONLY — флаг сборки (config.js), в develop он false. Сброс модулей и
// динамический импорт — приём из screens/bookCache.test.js; сам конфиг сверх
// того подменяем vi.doMock, иначе импортированный модуль унесёт с собой
// настоящее false.
describe('домашний экран в режиме «только тьютор»', () => {
  afterEach(() => {
    vi.doUnmock('../config.js')
    vi.resetModules()
  })

  it('без анкеты — онбординг тьютора, с анкетой — дашборд, класс важнее обоих', async () => {
    vi.resetModules()
    vi.doMock('../config.js', () => ({ TUTOR_ONLY: true, TUTOR_ONLY_SECTIONS: [] }))
    const { homeScreenFor: inTutorOnly } = await import('./homeScreen.js')

    expect(inTutorOnly({ token: STUDENT })).toBe('tutor-welcome')
    expect(inTutorOnly({ token: STUDENT, tutorOnboarded: true })).toBe('tutor-dashboard')
    expect(inTutorOnly({ token: STUDENT, boothAccount: true })).toBe('booth')
  })
})
