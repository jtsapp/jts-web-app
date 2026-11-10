// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { watchAppTheme } from './hostTheme.js'

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('watchAppTheme', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'))

  it('ставит хосту тему приложения сразу и следит за кнопкой темы', async () => {
    const host = document.createElement('div')
    document.documentElement.setAttribute('data-theme', 'dark')
    const stop = watchAppTheme(host)
    expect(host.getAttribute('data-theme')).toBe('dark')

    // ThemeToggle в светлой теме снимает атрибут, а не ставит «light»
    document.documentElement.removeAttribute('data-theme')
    await tick()
    expect(host.getAttribute('data-theme')).toBe('light')

    stop()
    document.documentElement.setAttribute('data-theme', 'dark')
    await tick()
    expect(host.getAttribute('data-theme')).toBe('light')
  })
})
