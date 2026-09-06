// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { saveUserSnapshot } from './session.js'

// Снимок профиля в localStorage — запасной ответ на вопрос «кто вошёл», когда
// бэкенд отвечает 5xx: restoreSession тогда возвращает именно его и токен не
// выбрасывает. Поля снимок собирает поимённо, поэтому признак класса из него
// выпадает так же тихо, как и из серверной проверки токена, — с тем же итогом:
// аккаунт класса попадает в кабинет вместо урока.
describe('снимок профиля', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('признак аккаунта класса сохраняется', () => {
    saveUserSnapshot({ userId: 501, name: 'Класс · Айгуль', role: 'STUDENT', boothAccount: true })

    expect(JSON.parse(localStorage.getItem('jts_user_snapshot')).boothAccount).toBe(true)
  })

  it('обычный ученик — false, а не undefined', () => {
    saveUserSnapshot({ userId: 7, name: 'Асель', role: 'STUDENT' })

    expect(JSON.parse(localStorage.getItem('jts_user_snapshot')).boothAccount).toBe(false)
  })
})
