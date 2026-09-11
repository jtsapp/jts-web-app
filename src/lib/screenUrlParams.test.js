import { describe, it, expect } from 'vitest'
import { screenUrlParams, applyScreenUrlParams } from './screenUrlParams.js'

/**
 * Адрес — единственное, что переживает F5, и цена ошибки тут не абстрактная:
 * из-за неё ученик посреди живого урока улетал на главную. Поэтому решение и
 * вынесено из эффекта в чистую функцию.
 */
const пусто = { screen: null, live: null, catalog: null, card: null }

describe('параметры адреса по экрану', () => {
  it('обычный экран пишется одним ?screen=', () => {
    expect(screenUrlParams({ screen: 'homework', persists: true }))
      .toEqual({ ...пусто, screen: 'homework' })
  })

  it('экран, который по адресу не открывается, не пишется вовсе', () => {
    // Иначе F5 привёл бы на экран, который без своего id пустой.
    expect(screenUrlParams({ screen: 'otp', persists: false })).toEqual(пусто)
  })

  it('живой урок берёт с собой свой id', () => {
    expect(screenUrlParams({ screen: 'live-lesson', persists: false, liveLessonId: 17 }))
      .toEqual({ ...пусто, screen: 'live-lesson', live: '17' })
  })

  it('живой урок без id в адрес не едет: открылся бы пустым', () => {
    expect(screenUrlParams({ screen: 'live-lesson', persists: false })).toEqual(пусто)
  })

  /**
   * Ссылка из домашки. Экран урока в PERSISTABLE_SCREENS не входит намеренно —
   * без id он открылся бы демонстрационным уроком, — но с полным адресом
   * карточки он обязан пережить F5: иначе обновление страницы теряет заданное.
   */
  it('урок с карточкой пишется полным адресом', () => {
    expect(screenUrlParams({
      screen: 'lesson-workspace', persists: false, liveWorkspaceId: 314, workspaceCardId: 'cad401560',
    })).toEqual({ screen: 'lesson-workspace', live: null, catalog: '314', card: 'cad401560' })
  })

  it('урок без карточки в адрес не едет — это обычное открытие из каталога', () => {
    expect(screenUrlParams({ screen: 'lesson-workspace', persists: false, liveWorkspaceId: 314 }))
      .toEqual(пусто)
  })

  it('карточка без урока — тоже не едет: искать её негде', () => {
    expect(screenUrlParams({ screen: 'lesson-workspace', persists: false, workspaceCardId: 'cad401560' }))
      .toEqual(пусто)
  })

  it('id приводятся к строке: в адресе строки, а в состоянии бывают числа', () => {
    const p = screenUrlParams({ screen: 'live-lesson', persists: false, liveLessonId: 17 })
    expect(p.live).toBe('17')
  })
})

describe('запись параметров в адрес', () => {
  const url = (s) => new URL(s)

  it('ставит недостающее и сообщает, что изменила', () => {
    const u = url('https://app.example/')
    expect(applyScreenUrlParams(u, { ...пусто, screen: 'homework' })).toBe(true)
    expect(u.search).toBe('?screen=homework')
  })

  it('ничего не делает, когда уже так', () => {
    const u = url('https://app.example/?screen=homework')
    expect(applyScreenUrlParams(u, { ...пусто, screen: 'homework' })).toBe(false)
  })

  /** Служебный параметр живёт и умирает вместе со `screen`. */
  it('стирает служебные хвосты прошлого экрана', () => {
    const u = url('https://app.example/?screen=lesson-workspace&catalog=314&card=cad401560')
    expect(applyScreenUrlParams(u, { ...пусто, screen: 'homework' })).toBe(true)
    expect(u.search).toBe('?screen=homework')
  })

  /**
   * Чужие параметры не трогаем: по `?invite=` человек пришёл регистрироваться,
   * и стереть его значило бы потерять приглашение.
   */
  it('чужие параметры остаются на месте', () => {
    const u = url('https://app.example/?invite=abc&utm_source=sms')
    applyScreenUrlParams(u, { ...пусто, screen: 'homework' })
    expect(u.searchParams.get('invite')).toBe('abc')
    expect(u.searchParams.get('utm_source')).toBe('sms')
  })

  it('пустой набор вычищает адрес целиком', () => {
    const u = url('https://app.example/?screen=live-lesson&live=17')
    expect(applyScreenUrlParams(u, пусто)).toBe(true)
    expect(u.search).toBe('')
  })
})
