// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { screenBlocks } from './proactiveDom.js'

const mount = (inner, outer = '') => {
  document.body.innerHTML = `<div class="scr-in">${inner}</div>${outer}`
}
afterEach(() => {
  document.body.innerHTML = ''
})

describe('можно ли Луне написать первой — по экрану', () => {
  it('обычный экран — можно', () => {
    mount('<h1>Главная</h1><button>Начать</button>')
    expect(screenBlocks({ type: 'step_completed' })).toBe(null)
  })

  it('тест и экзамен — нельзя никогда', () => {
    mount('<div data-assistant-test=""><p>Вопрос 3</p></div>')
    expect(screenBlocks({ type: 'day_start' })).toBe('test')
  })

  it('окно поверх экрана (тур, анкета) — нельзя; своё окно Луны не в счёт', () => {
    mount('<p>Главная</p>', '<div role="dialog" aria-modal="true">Тур</div>')
    expect(screenBlocks({ type: 'day_start' })).toBe('overlay')
    mount('<p>Главная</p>', '<div data-assistant-ignore=""><div aria-modal="true">Луна</div></div>')
    expect(screenBlocks({ type: 'day_start' })).toBe(null)
  })

  it('ученик печатает в задании — нельзя', () => {
    mount('<input id="a" type="text" />')
    document.getElementById('a').focus()
    expect(screenBlocks({ type: 'return_after_pause' })).toBe('typing')
  })

  it('посреди задания — только приход ученика', () => {
    mount('<p>He ___ football.</p><input type="text" /><button>Проверить</button>')
    expect(screenBlocks({ type: 'wandering' })).toBe('task')
    expect(screenBlocks({ type: 'step_completed' })).toBe('task')
    expect(screenBlocks({ type: 'return_after_pause' })).toBe(null)
  })

  it('экрана нет — нельзя', () => {
    document.body.innerHTML = '<p>вход</p>'
    expect(screenBlocks({ type: 'day_start' })).toBe('no-screen')
  })
})
