// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider, LANGS } from '../i18n.jsx'
import LangSelector from './LangSelector.jsx'

/**
 * Переключатель языка.
 *
 * Он был только на входных экранах: зайдя в кабинет, сменить язык было нечем.
 * Теперь он стоит в шапке рядом с колокольчиком — а там нет ширины под полное
 * «Қазақша», отсюда компактный вид.
 */
function mount(props = {}) {
  return render(
    <I18nProvider>
      <LangSelector {...props} />
    </I18nProvider>,
  )
}

afterEach(() => {
  cleanup()
  try { localStorage.removeItem('lang') } catch { /* приватное окно */ }
})

describe('LangSelector', () => {
  it('три языка: русский, английский, казахский', () => {
    expect(LANGS.map((l) => l.code)).toEqual(['ru', 'en', 'kk'])
    expect(LANGS.map((l) => l.short)).toEqual(['RU', 'EN', 'KZ'])
  })

  it('обычный вид показывает полное название', () => {
    const { container } = mount()

    expect(container.querySelector('.lang-selector').textContent).toContain('Русский')
  })

  /* Полное название рядом с колокольчиком занимало бы половину строки, а на
     мобильной шапке не помещалось вовсе. */
  it('компактный — код языка вместо названия и без стрелки', () => {
    const { container } = mount({ compact: true })
    const button = container.querySelector('.lang-selector')

    expect(button.textContent).toContain('RU')
    expect(button.textContent).not.toContain('Русский')
    expect(button.classList.contains('lang-selector--compact')).toBe(true)
    expect(container.querySelector('.chev')).toBeNull()
  })

  /* Кнопка сжата, но подпись для скринридера должна остаться человеческой:
     «RU» вслух — не название языка. */
  it('у компактной кнопки остаётся полное название для доступности', () => {
    const { container } = mount({ compact: true })

    expect(container.querySelector('.lang-selector').getAttribute('aria-label')).toBe('Русский')
  })

  it('в списке названия полные и там же переключается язык', () => {
    const { container } = mount({ compact: true })
    fireEvent.click(container.querySelector('.lang-selector'))

    const options = [...container.querySelectorAll('.lang-option')].map((o) => o.textContent)
    expect(options).toEqual(['Русский', 'English', 'Қазақша'])

    fireEvent.click(container.querySelectorAll('.lang-option')[2])

    expect(container.querySelector('.lang-selector').textContent).toContain('KZ')
    // Выбор переживает перезагрузку — иначе язык пришлось бы ставить каждый раз.
    expect(localStorage.getItem('lang')).toBe('kk')
  })

  it('после выбора список закрывается', () => {
    const { container } = mount({ compact: true })
    fireEvent.click(container.querySelector('.lang-selector'))

    fireEvent.click(container.querySelectorAll('.lang-option')[1])

    expect(container.querySelector('.lang-menu')).toBeNull()
  })
})
