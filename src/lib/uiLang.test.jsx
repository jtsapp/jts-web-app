// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UI_LANG_ATTR, UI_LANG_BOOT, applyUiLang } from './uiLang.js'
import { I18nProvider, useI18n } from '../i18n.jsx'

/**
 * Казахский интерфейс целиком идёт на Inter (src/kk-font.css), а CSS узнаёт
 * язык только по атрибуту на <html>. Нет атрибута — шрифт молча остаётся
 * Manrope, поэтому проверяем все три пути, которыми он ставится.
 */
const attr = () => document.documentElement.getAttribute(UI_LANG_ATTR)

describe('язык интерфейса на <html>', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(UI_LANG_ATTR)
    localStorage.clear()
  })

  it('applyUiLang ставит, меняет и снимает атрибут', () => {
    applyUiLang('kk')
    expect(attr()).toBe('kk')
    applyUiLang('ru')
    expect(attr()).toBe('ru')
    applyUiLang(null)
    expect(attr()).toBeNull()
  })

  it('загрузочный скрипт берёт сохранённый язык до гидратации', () => {
    localStorage.setItem('lang', 'kk')
    new Function(UI_LANG_BOOT)()
    expect(attr()).toBe('kk')
  })

  it('без сохранённого языка скрипт атрибут не ставит', () => {
    new Function(UI_LANG_BOOT)()
    expect(attr()).toBeNull()
  })

  it('I18nProvider переставляет атрибут при смене языка', () => {
    function Switch() {
      const { setLang } = useI18n()
      return <button onClick={() => setLang('kk')}>kk</button>
    }
    render(
      <I18nProvider>
        <Switch />
      </I18nProvider>,
    )
    expect(attr()).toBe('ru')
    fireEvent.click(screen.getByText('kk'))
    expect(attr()).toBe('kk')
  })
})
