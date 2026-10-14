import { describe, it, expect, beforeEach } from 'vitest'
import {
  pushNav, popNav, readNavStack, writeNavStack, NAV_STACK_KEY,
  rememberPlace, placeOf, setResume, resumeOf, backLabelKey,
} from './navStack.js'

// Путь ученика: цепочка переходов, как их делает App (каждый переход — pushNav).
function walk(...screens) {
  let stack = []
  for (let i = 1; i < screens.length; i += 1) stack = pushNav(stack, screens[i - 1], screens[i])
  return stack
}

describe('стек «откуда пришли»', () => {
  it('«назад» из раздела ведёт туда, откуда его открыли', () => {
    expect(popNav(walk('home', 'listening'), 'listening').entry.screen).toBe('home')
    expect(popNav(walk('practice', 'listening'), 'listening').entry.screen).toBe('practice')
    expect(popNav(walk('homework', 'reading'), 'reading').entry.screen).toBe('homework')
  })

  it('без истории (диплинк, первый экран) идти некуда — экран берёт свой запасной', () => {
    expect(popNav([], 'reading')).toBeNull()
  })

  it('цепочка разматывается по порядку', () => {
    // Домашка → урок → словарь: из словаря в урок, из урока в домашку.
    let stack = walk('homework', 'lesson-workspace', 'vocab')
    const first = popNav(stack, 'vocab')
    expect(first.entry.screen).toBe('lesson-workspace')
    stack = first.rest
    expect(popNav(stack, 'lesson-workspace').entry.screen).toBe('homework')
  })

  // Старые «назад» зашиты прямыми переходами. Переход на экран, который уже в
  // стеке, — это возврат: всё, что выше, срезается, иначе следующий «назад»
  // увёл бы в экран, из которого только что вышли.
  it('переход на экран из стека срезает всё выше него', () => {
    const stack = walk('home', 'tutor-dashboard', 'tutor-scenarios', 'tutor-dashboard')
    expect(stack).toEqual([{ screen: 'home' }])
  })

  it('переход по кругу не зацикливает «назад»', () => {
    // Урок ↔ словарь туда-обратно прямыми ссылками: «назад» из урока всё равно домой.
    const stack = walk('homework', 'lesson-workspace', 'vocab', 'lesson-workspace')
    expect(popNav(stack, 'lesson-workspace').entry.screen).toBe('homework')
  })

  it('вход, регистрация, тест и анкета в стек не попадают', () => {
    const stack = walk('welcome', 'otp', 'success', 'home', 'ge-onboarding', 'test-intro', 'test', 'ge-route')
    expect(stack).toEqual([{ screen: 'home' }])
  })

  it('место ухода едет вместе с экраном', () => {
    const stack = pushNav([], 'practice', 'shadowing', { tab: 'speaking', expanded: 'shadowing' })
    expect(popNav(stack, 'shadowing').entry.place).toEqual({ tab: 'speaking', expanded: 'shadowing' })
  })

  it('глубина ограничена', () => {
    let stack = []
    for (let i = 0; i < 100; i += 1) stack = pushNav(stack, `s${i}`, `s${i + 1}`)
    expect(stack.length).toBe(30)
    expect(stack.at(-1).screen).toBe('s99')
  })
})

describe('хранение стека', () => {
  const memory = () => {
    const m = new Map()
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
  }

  it('переживает перезагрузку (возврат с оплаты, F5)', () => {
    const s = memory()
    writeNavStack(s, walk('home', 'kingdom', 'pricing'))
    expect(readNavStack(s)).toEqual([{ screen: 'home' }, { screen: 'kingdom' }])
  })

  it('мусор в хранилище не роняет экран', () => {
    const s = memory()
    s.setItem(NAV_STACK_KEY, '{oops')
    expect(readNavStack(s)).toEqual([])
    s.setItem(NAV_STACK_KEY, JSON.stringify([{ screen: 'otp' }, null, { screen: 'home' }]))
    expect(readNavStack(s)).toEqual([{ screen: 'home' }])
  })

  it('пустой стек стирается, а не пишется', () => {
    const s = memory()
    writeNavStack(s, walk('home', 'practice'))
    writeNavStack(s, [])
    expect(s.getItem(NAV_STACK_KEY)).toBeNull()
  })

  it('недоступное хранилище не бросает', () => {
    expect(readNavStack(null)).toEqual([])
    expect(() => writeNavStack({ setItem: () => { throw new Error('quota') } }, [{ screen: 'home' }])).not.toThrow()
  })
})

describe('место на экране', () => {
  beforeEach(() => setResume(null))

  it('экран видит своё место только после «назад» на него', () => {
    rememberPlace('practice', { tab: 'reading' })
    expect(placeOf('practice')).toEqual({ tab: 'reading' })
    expect(resumeOf('practice')).toBeNull()
    setResume('practice', { tab: 'reading' })
    expect(resumeOf('practice')).toEqual({ tab: 'reading' })
    expect(resumeOf('homework')).toBeNull()
  })
})

describe('подпись кнопки', () => {
  it('называет место назначения', () => {
    expect(backLabelKey('home')).toBe('nav.back.home')
    expect(backLabelKey('practice')).toBe('nav.back.practice')
    expect(backLabelKey('kingdom-interior')).toBe('nav.back.learning')
    expect(backLabelKey('tutor-dashboard')).toBe('nav.back.tutor')
    expect(backLabelKey('listening')).toBe('nav.back.listening')
    expect(backLabelKey('нечто')).toBe('nav.back.default')
    expect(backLabelKey(null)).toBe('nav.back.default')
  })
})
