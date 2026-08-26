'use client'

// Язык приложения хранит I18nProvider (useI18n, ключ 'lang'); LanguageProvider
// (экраны тьютора, useT/useLang) — тонкий адаптер над ним с маппингом kk↔kz,
// поэтому порядок вложенности важен: LanguageProvider строго внутри.
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

    // Выделение в тексте урока разрешено: на нём держится перевод фразы (до 100
    // символов), а тапом переводится только одно слово. Копирование при этом
    // по-прежнему закрыто — `copy`/`cut`/`contextmenu`/`dragstart` гасятся везде,
    // так что выделить, чтобы перевести, можно, а унести текст — нет.
    const blockSelect = (e) => {
      if (inEditable(e.target)) return
      if (e.target?.closest?.('[data-selectable]')) return
      e.preventDefault()
    }

    const events = ['contextmenu', 'copy', 'cut', 'dragstart']
    events.forEach((ev) => document.addEventListener(ev, block))
    document.addEventListener('selectstart', blockSelect)
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, block))
      document.removeEventListener('selectstart', blockSelect)
    }
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
