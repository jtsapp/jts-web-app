import { describe, it, expect, vi, afterEach } from 'vitest'
import { homeScreenFor, testExitScreen } from './homeScreen.js'

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

  it('ученик без уровня в профиле — тоже на «Главную»', () => {
    // С 14.10.2026 тест ждёт на «Главной» в закрытом блоке роадмапа, а не отдельным экраном после входа.
    expect(homeScreenFor({ token: STUDENT, needsLevelTest: true })).toBe('home')
  })

  it('ученик с уровнем — на «Главную»', () => {
    // И демо, и оплаченный: «Главная» — сводка кабинета, королевства теперь
    // один из разделов в ней, а не вход в приложение.
    expect(homeScreenFor({ token: STUDENT })).toBe('home')
  })

  // Восстановление сессии зовёт функцию без needsLevelTest: пройден тест или
  // нет, оно не знает. Умолчание обязано быть «не приставать с тестом».
  it('без аргументов вообще — «Главная», а не тест', () => {
    expect(homeScreenFor({})).toBe('home')
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

describe('выход с теста уровня', () => {
  // С 09.09.2026 первым экраном ученика стала «Главная», а выход с теста остался «как было» — в королевство: новичок
  // после регистрации и теста видел карту, а не «Главную» с туром и целью.
  it('без адреса возврата — на «Главную», как после входа', () => {
    expect(testExitScreen({ testReturn: null })).toBe('home')
  })

  it('пришёл из профиля или по ссылке — туда и возвращается', () => {
    expect(testExitScreen({ testReturn: 'profile' })).toBe('profile')
    expect(testExitScreen({ testReturn: 'homework' })).toBe('homework')
  })
})
