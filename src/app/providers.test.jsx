// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import Providers from './providers.jsx'

/**
 * Запрет копирования и перевод фразы.
 *
 * Текст уроков закрыт от копирования — гасятся `copy`, `cut`, `contextmenu`,
 * `dragstart` и раньше гасился `selectstart`. Последнее заодно ломало перевод:
 * выделить фразу было нельзя, и у ученика работал только тап по одному слову,
 * хотя лимит в 100 символов и сообщение о нём давно написаны.
 *
 * Теперь выделение разрешено там, где стоит `data-selectable` (текст урока), а
 * копирование закрыто по-прежнему: выделить, чтобы перевести, — можно, унести
 * текст из урока — нет. Тесты держат ровно эту границу.
 */
function fire(el, type) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  el.dispatchEvent(event)
  return event
}

function mount(html) {
  const { container } = render(
    <Providers>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Providers>,
  )
  return container
}

afterEach(cleanup)

describe('NoCopyGuard — выделение и копирование', () => {
  it('в тексте урока выделение начать можно', () => {
    const container = mount('<div data-selectable=""><p id="text">Answer them all</p></div>')

    const event = fire(container.querySelector('#text'), 'selectstart')

    expect(event.defaultPrevented).toBe(false)
  })

  /* Chrome шлёт selectstart на ТЕКСТОВОМ узле, если нажатие пришлось на саму
     букву (на пустое место в абзаце — на элементе). У текстового узла нет
     closest(), и проверка молча уходила в preventDefault: выделение начиналось
     с пробела и не начиналось с буквы — жалоба «выделяется буквально на
     рандом». Тест дежурит именно на текстовом узле. */
  it('в тексте урока выделение начинается и с самой буквы (target — текстовый узел)', () => {
    const container = mount('<div data-selectable=""><p id="text">Answer them all</p></div>')

    const event = fire(container.querySelector('#text').firstChild, 'selectstart')

    expect(event.defaultPrevented).toBe(false)
  })

  it('вне урока выделение по-прежнему запрещено', () => {
    const container = mount('<p id="text">Обычный текст интерфейса</p>')

    const event = fire(container.querySelector('#text'), 'selectstart')

    expect(event.defaultPrevented).toBe(true)
  })

  /* Главное, ради чего запрет вообще стоит: выделять для перевода — можно,
     копировать — нельзя, и внутри урока тоже. */
  it('копирование закрыто и в уроке', () => {
    const container = mount('<div data-selectable=""><p id="text">Answer them all</p></div>')
    const text = container.querySelector('#text')

    expect(fire(text, 'copy').defaultPrevented).toBe(true)
    expect(fire(text, 'cut').defaultPrevented).toBe(true)
    expect(fire(text, 'contextmenu').defaultPrevented).toBe(true)
    expect(fire(text, 'dragstart').defaultPrevented).toBe(true)
  })

  /* Поля ввода — исключение из запрета целиком: ученик пишет в них ответы, и без
     выделения там не поправить опечатку. */
  it('в полях ввода можно всё', () => {
    const container = mount('<input id="gap" value="answer">')
    const input = container.querySelector('#gap')

    expect(fire(input, 'selectstart').defaultPrevented).toBe(false)
    expect(fire(input, 'copy').defaultPrevented).toBe(false)
  })
})
