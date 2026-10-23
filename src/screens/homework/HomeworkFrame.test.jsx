// @vitest-environment jsdom
import { createRef } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkFrame from './HomeworkFrame.jsx'

/**
 * Рамка задания в домашней работе: на странице ей тесно (правая колонка за
 * списком, на телефоне — меньше 300px), поэтому её разворачивают во весь
 * экран. Главное — разворот не перезагружает урок: ученик не теряет решённое.
 */
const SRC = 'https://api.example/student/materials/14/render?assignmentId=40'

function показать(props = {}) {
  return render(
    <I18nProvider>
      <HomeworkFrame src={SRC} title="Present Perfect · practice test" {...props} />
    </I18nProvider>
  )
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('HomeworkFrame', () => {
  it('на странице: рамка с уроком и кнопка «Во весь экран», без своего заголовка', () => {
    const { container } = показать()
    const frame = container.querySelector('iframe')
    expect(frame.getAttribute('src')).toBe(SRC)
    expect(container.querySelector('.hw-frame--full')).toBeNull()
    expect(container.querySelector('.hw-frame__title')).toBeNull()
    expect(screen.getByRole('button', { name: 'Во весь экран' }).getAttribute('aria-pressed')).toBe('false')
  })

  // autoplay: разрешение выдаётся документу, а материал живёт в своём iframe — у заданий на слух без него
  // молчала бы запись. fullscreen — для встроенных в задание активностей вроде Wordwall: их кнопка «на
  // весь экран» работает, только если право выдано по всей цепочке рамок сверху вниз. Своя кнопка
  // «Во весь экран» от него не зависит: рамка разворачивается классом, а не Fullscreen API.
  it('рамка пускает звук и полный экран во вложенных активностях', () => {
    const { container } = показать()
    const allow = container.querySelector('iframe').getAttribute('allow').split(';').map((token) => token.trim())

    expect(allow).toEqual(expect.arrayContaining(['autoplay', 'fullscreen']))
  })

  it('разворачивает ту же рамку — iframe не пересоздаётся, урок не перезагружается', () => {
    const { container } = показать()
    const before = container.querySelector('iframe')

    fireEvent.click(screen.getByRole('button', { name: 'Во весь экран' }))

    expect(container.querySelector('.hw-frame--full')).not.toBeNull()
    expect(container.querySelector('iframe')).toBe(before)
    expect(container.querySelector('.hw-frame__title').textContent).toBe('Present Perfect · practice test')
    expect(screen.getByRole('button', { name: 'Свернуть' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('под развёрнутой рамкой страница не прокручивается, после — прежняя прокрутка', () => {
    document.body.style.overflow = 'auto'
    показать()

    fireEvent.click(screen.getByRole('button', { name: 'Во весь экран' }))
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Свернуть' }))
    expect(document.body.style.overflow).toBe('auto')
  })

  it('Esc сворачивает рамку', () => {
    const { container } = показать()
    fireEvent.click(screen.getByRole('button', { name: 'Во весь экран' }))

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(container.querySelector('.hw-frame--full')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('свернули, уйдя с задания, — блокировка прокрутки не остаётся висеть', () => {
    const { unmount } = показать()
    fireEvent.click(screen.getByRole('button', { name: 'Во весь экран' }))

    unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('отдаёт владельцу узел iframe — по нему часть-материал узнаёт свой мост', () => {
    const frameRef = createRef()
    const { container } = показать({ frameRef })
    expect(frameRef.current).toBe(container.querySelector('iframe'))
  })
})
