// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { pressButton } from './clicker.js'
import { snapshotWithRefs } from './screenSnapshot.js'

const setup = (html) => {
  document.body.innerHTML = `<div class="scr-in">${html}</div>`
  const root = document.querySelector('.scr-in')
  return { root, ...snapshotWithRefs(root) }
}

describe('pressButton', () => {
  it('жмёт кнопку по номеру снимка', () => {
    const { root, refs } = setup('<button>Послушать</button><button>Далее</button>')
    const spy = vi.fn()
    refs.get(2).el.addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '2', label: 'Далее' }, { refs, root })).toBe('pressed')
    expect(spy).toHaveBeenCalledOnce()
  })

  it('экран перерисован — ищет по подписи', () => {
    const { root, refs } = setup('<button>Далее</button>')
    root.innerHTML = '<p>новое</p><button id="n">Далее</button>'
    const spy = vi.fn()
    document.getElementById('n').addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '1', label: 'Далее' }, { refs, root })).toBe('pressed')
    expect(spy).toHaveBeenCalledOnce()
  })

  it('пропала, неактивна, две одинаковые', () => {
    const { root, refs } = setup('<button>Далее</button>')
    root.innerHTML = '<button disabled>Далее</button>'
    expect(pressButton({ kind: 'click', target: '1', label: 'Далее' }, { refs, root })).toBe('missing')
    root.innerHTML = '<button>Послушать</button><button>Послушать</button>'
    expect(pressButton({ kind: 'click', target: '7', label: 'Послушать' }, { refs: new Map(), root })).toBe('ambiguous')
  })

  it('опасную не жмёт даже по номеру', () => {
    document.body.innerHTML = '<div class="scr-in"><button>Выйти</button></div>'
    const root = document.querySelector('.scr-in')
    const el = root.querySelector('button')
    const spy = vi.fn()
    el.addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '1', label: 'Выйти' }, { refs: new Map([[1, { el, label: 'Выйти' }]]), root })).toBe('forbidden')
    expect(spy).not.toHaveBeenCalled()
  })

  it('спрятанная (display: none у предка) — не жмёт', () => {
    const { root, refs } = setup('<div><button>Далее</button></div>')
    root.firstElementChild.style.display = 'none'
    expect(pressButton({ kind: 'click', target: '1', label: 'Далее' }, { refs, root })).toBe('missing')
  })

  it('кнопка-значок «×» — по сырой подписи', () => {
    const { root, refs } = setup('<button>×</button>')
    const spy = vi.fn()
    refs.get(1).el.addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '1', label: '×' }, { refs, root })).toBe('pressed')
    expect(spy).toHaveBeenCalledOnce()
  })

  it('кнопка окна-портала находится и по подписи', () => {
    document.body.innerHTML = '<div class="scr-in"></div><div data-assistant-overlay="карточка"><button id="o">Закрыть</button></div>'
    const spy = vi.fn()
    document.getElementById('o').addEventListener('click', spy)
    expect(pressButton({ kind: 'click', target: '1', label: 'Закрыть' }, { refs: new Map(), root: document.querySelector('.scr-in') })).toBe('pressed')
    expect(spy).toHaveBeenCalledOnce()
  })
})
