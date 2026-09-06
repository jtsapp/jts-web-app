// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { saveUserSnapshot, patchUserSnapshot, patchBoothAccount } from './session.js'

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

// patchUserSnapshot дописывает поля в уже сохранённый снимок отдельно от
// saveUserSnapshot — признак класса узнаётся отдельным запросом ПОСЛЕ входа
// (getIsBoothAccount), когда обработчики входа уже вызвали saveUserSnapshot
// без него. Без дописывания перезагрузка при недоступном бэкенде вернула бы
// снимок с boothAccount: false.
describe('patchUserSnapshot', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('дописывает поле, не теряя соседних', () => {
    saveUserSnapshot({ userId: 501, name: 'Класс · Айгуль', role: 'STUDENT' })

    patchUserSnapshot({ boothAccount: true })

    const snap = JSON.parse(localStorage.getItem('jts_user_snapshot'))
    expect(snap.boothAccount).toBe(true)
    expect(snap.userId).toBe(501)
    expect(snap.name).toBe('Класс · Айгуль')
  })

  it('ничего не создаёт при пустом хранилище', () => {
    patchUserSnapshot({ boothAccount: true })

    expect(localStorage.getItem('jts_user_snapshot')).toBeNull()
  })

  it('переживает битый JSON в хранилище', () => {
    localStorage.setItem('jts_user_snapshot', '{не json')

    expect(() => patchUserSnapshot({ boothAccount: true })).not.toThrow()
    // Битый снимок не читается как валидный — patchUserSnapshot его не трогает,
    // а не подменяет наугад собранным объектом.
    expect(localStorage.getItem('jts_user_snapshot')).toBe('{не json')
  })
})

// patchBoothAccount — находка 4а финального ревью: getIsBoothAccount отвечает
// false не только на настоящий «не класс», но и на любую сетевую осечку
// (задокументировано в api.js), и слепой патч этим false одной неудачной
// секундой сети стёр бы уже подтверждённое true.
describe('patchBoothAccount', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('true патчится в снимок как обычно', () => {
    saveUserSnapshot({ userId: 501, name: 'Класс · Айгуль', role: 'STUDENT' })

    patchBoothAccount(true)

    expect(JSON.parse(localStorage.getItem('jts_user_snapshot')).boothAccount).toBe(true)
  })

  it('false не перезаписывает уже подтверждённое true', () => {
    saveUserSnapshot({ userId: 501, name: 'Класс · Айгуль', role: 'STUDENT' })
    patchBoothAccount(true)

    // Следующий вызов — та самая «неудачная секунда сети»: getIsBoothAccount
    // не смог отличить осечку от настоящего «не класс» и отдал false.
    patchBoothAccount(false)

    const snap = JSON.parse(localStorage.getItem('jts_user_snapshot'))
    expect(snap.boothAccount).toBe(true)
    expect(snap.userId).toBe(501)
  })
})
