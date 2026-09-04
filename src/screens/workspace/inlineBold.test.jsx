// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { inlineBold } from './inlineBold.jsx'

/**
 * Живой случай из курса: «After <i>to</i>, only <b>be able to</b> works.» —
 * курсив разбирать не умели, и ученик читал `<i>` буквально.
 */
describe('inlineBold', () => {
  it('рисует жирный и курсив, а не печатает теги', () => {
    render(<p>{inlineBold('After <i>to</i>, only <b>be able to</b> works.')}</p>)
    expect(screen.getByText('to').tagName).toBe('EM')
    expect(screen.getByText('be able to').tagName).toBe('STRONG')
    expect(document.body.textContent).toBe('After to, only be able to works.')
  })

  it('<strong>/<em> понимает наравне с короткими тегами', () => {
    render(<p>{inlineBold('<strong>a</strong> и <em>b</em>')}</p>)
    expect(screen.getByText('a').tagName).toBe('STRONG')
    expect(screen.getByText('b').tagName).toBe('EM')
  })

  // Пробел вокруг вставки терять нельзя: без него слова слипаются.
  it('текст между вставками сохраняется как есть', () => {
    render(<p>{inlineBold('<b>a</b> и <i>b</i>')}</p>)
    expect(document.body.textContent).toBe('a и b')
  })

  it('незакрытый тег убирает, а не показывает', () => {
    render(<p>{inlineBold('почти <b>жирный')}</p>)
    expect(document.body.textContent).toBe('почти жирный')
  })

  // tidyLessonText идёт последним и только по последнему куску: пройдя первым,
  // он съел бы `>` у закрывающего тега.
  it('срезает битый хвост вёрстки, не ломая закрывающий тег', () => {
    render(<p>{inlineBold('нужно <b>be able to</b>." >')}</p>)
    expect(screen.getByText('be able to').tagName).toBe('STRONG')
    expect(document.body.textContent).toBe('нужно be able to."')
  })
})
