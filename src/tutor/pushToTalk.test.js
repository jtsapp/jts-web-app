import { describe, it, expect } from 'vitest'
import { HOLD_MIN_MS, holdVerdict, isEditableTarget, isPushToTalkKey } from './pushToTalk.js'

/** Событие клавиатуры «как из браузера», с нужными полями по умолчанию. */
function key(over = {}) {
  return {
    type: 'keydown',
    code: 'Space',
    key: ' ',
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    target: { nodeType: 1, closest: () => null },
    ...over,
  }
}

describe('isPushToTalkKey', () => {
  it('ловит пробел', () => {
    expect(isPushToTalkKey(key())).toBe(true)
    expect(isPushToTalkKey(key({ type: 'keyup' }))).toBe(true)
  })

  it('не ловит другие клавиши', () => {
    expect(isPushToTalkKey(key({ code: 'Enter', key: 'Enter' }))).toBe(false)
    expect(isPushToTalkKey(key({ code: 'KeyA', key: 'a' }))).toBe(false)
  })

  it('игнорирует автоповтор', () => {
    // Пока клавишу держат, keydown летит десятками раз: без этого каждый повтор
    // начинал бы новый ход.
    expect(isPushToTalkKey(key({ repeat: true }))).toBe(false)
  })

  it('не ловит пробел с модификатором на нажатии', () => {
    expect(isPushToTalkKey(key({ ctrlKey: true }))).toBe(false)
    expect(isPushToTalkKey(key({ metaKey: true }))).toBe(false)
    expect(isPushToTalkKey(key({ shiftKey: true }))).toBe(false)
  })

  it('но ловит его на отпускании', () => {
    // Ученик зацепил shift, пока говорил. Строгая проверка на keyup оставила бы
    // рацию залипшей открытой до конца звонка.
    expect(isPushToTalkKey(key({ type: 'keyup', shiftKey: true }))).toBe(true)
  })

  it('не ловит пробел в поле ввода', () => {
    const input = { nodeType: 1, closest: (sel) => (sel.includes('input') ? {} : null) }
    expect(isPushToTalkKey(key({ target: input }))).toBe(false)
  })

  it('переживает событие без target', () => {
    expect(isPushToTalkKey(key({ target: null }))).toBe(true)
    expect(isPushToTalkKey(null)).toBe(false)
  })
})

describe('isEditableTarget', () => {
  it('поднимается от текстового узла к элементу', () => {
    // У текстового узла нет closest() — на этом уже спотыкалось выделение слов.
    const el = { nodeType: 1, closest: () => ({}) }
    expect(isEditableTarget({ nodeType: 3, parentElement: el })).toBe(true)
  })

  it('текстовый узел без родителя не роняет проверку', () => {
    expect(isEditableTarget({ nodeType: 3, parentElement: null })).toBe(false)
  })
})

describe('holdVerdict', () => {
  it('короткий тап отменяет ход', () => {
    // Иначе промах по кнопке уходит в агента пустым ходом, и тьютор отвечает
    // на тишину: в ручном режиме LiveKit генерит реплику и без транскрипта.
    expect(holdVerdict(0)).toBe('cancel_turn')
    expect(holdVerdict(HOLD_MIN_MS - 1)).toBe('cancel_turn')
  })

  it('нормальное удержание закрывает ход', () => {
    expect(holdVerdict(HOLD_MIN_MS)).toBe('end_turn')
    expect(holdVerdict(3000)).toBe('end_turn')
  })
})
