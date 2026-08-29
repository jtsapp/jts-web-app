// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import TemperToggle from './TemperToggle.jsx'
import { TUTORS } from './tutors.js'

const withTempers = TUTORS.find((t) => t.tempers)

// LanguageProvider — адаптер над I18nProvider (см. src/app/providers.jsx),
// в одиночку не поднимается.
function wrap(children) {
  return render(
    <I18nProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nProvider>
  )
}

function setup(props = {}) {
  const onToggle = vi.fn()
  const utils = wrap(
    <TemperToggle tutor={withTempers} temper="calm" onToggle={onToggle} {...props} />
  )
  return { ...utils, onToggle, btn: utils.container.querySelector('button') }
}

describe('кнопка 18+', () => {
  it('обычная кнопка переключает нрав', () => {
    const { onToggle, btn } = setup()
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledWith(withTempers.key)
    expect(btn.getAttribute('aria-disabled')).toBe('false')
  })

  it('заперта возрастом — клик ничего не включает', () => {
    const { onToggle, btn } = setup({ locked: true })
    fireEvent.click(btn)
    expect(onToggle).not.toHaveBeenCalled()
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    expect(btn.className).toContain('t-adult--locked')
  })

  it('заперта — подсказка объясняет причину', () => {
    const { btn } = setup({ locked: true })
    expect(btn.getAttribute('title')).toMatch(/18/)
  })

  // Кнопка живёт внутри кликабельной карточки тьютора: её клик не должен
  // всплывать и выбирать тьютора вместо переключения нрава.
  it('клик не всплывает наверх', () => {
    const onCard = vi.fn()
    const { container } = wrap(
      <div onClick={onCard}>
        <TemperToggle tutor={withTempers} temper="calm" onToggle={() => {}} locked />
      </div>
    )
    fireEvent.click(container.querySelector('button'))
    expect(onCard).not.toHaveBeenCalled()
  })

  it('у тьютора без оси нрава кнопки нет', () => {
    const noTempers = TUTORS.find((t) => !t.tempers)
    const { container } = wrap(
      <TemperToggle tutor={noTempers} temper={null} onToggle={() => {}} />
    )
    expect(container.querySelector('button')).toBeNull()
  })
})
