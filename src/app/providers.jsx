'use client'

// Две системы i18n сосуществуют: I18nProvider (миры/обучение, useI18n) и
// LanguageProvider (экраны тьютора, useT/useLang). Оба контекста нужны App'у.
import { useEffect } from 'react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'

// Запрет копирования для обычного пользователя: правый клик, copy/cut,
// перетаскивание картинок, выделение мышью. Не мешает вводу — внутри
// input/textarea/contenteditable всё работает как обычно.
// Оговорка: это защита от случайного копирования, не от DevTools — полностью
// закрыть контент в вебе нельзя.
function NoCopyGuard() {
  useEffect(() => {
    const inEditable = (el) =>
      el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable)

    const block = (e) => {
      if (inEditable(e.target)) return
      e.preventDefault()
    }

    const events = ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart']
    events.forEach((ev) => document.addEventListener(ev, block))
    return () => events.forEach((ev) => document.removeEventListener(ev, block))
  }, [])

  return null
}

export default function Providers({ children }) {
  return (
    <I18nProvider>
      <LanguageProvider>
        <NoCopyGuard />
        {children}
      </LanguageProvider>
    </I18nProvider>
  )
}
