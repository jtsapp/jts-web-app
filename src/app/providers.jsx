'use client'

// Язык приложения хранит I18nProvider (useI18n, ключ 'lang'); LanguageProvider
// (экраны тьютора, useT/useLang) — тонкий адаптер над ним с маппингом kk↔kz,
// поэтому порядок вложенности важен: LanguageProvider строго внутри.
import { useEffect } from 'react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import { appTheme, createLessonFrameTheme } from '../lib/lessonFrameTheme.js'

// Рамки живых уроков получают тему приложения: при старте по своему запросу и при каждом переключении.
function LessonFrameThemeBridge() {
  useEffect(() => {
    const root = document.documentElement
    const frames = createLessonFrameTheme(window, () => appTheme(root))
    const observer = new MutationObserver(() => frames.themeChanged())
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      observer.disconnect()
      frames.stop()
    }
  }, [])
  return null
}

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

    // Чат живого урока — исключение и из запрета копирования (просьба 12.11.2026):
    // в чате присылают ссылки, слова и фразы, которые ученику надо унести в
    // словарь, тетрадь или переводчик. Помечается `data-copyable`. Копирование
    // разрешаем, только если ВСЁ выделение лежит внутри одной такой области:
    // иначе протянутое от чата в текст урока выделение уносило бы и урок.
    const elementOf = (node) => (node && node.nodeType === 3 ? node.parentElement : node)
    const copyableRoot = (node) => elementOf(node)?.closest?.('[data-copyable]') || null
    const selectionCopyable = () => {
      const sel = typeof window.getSelection === 'function' ? window.getSelection() : null
      if (!sel || sel.isCollapsed || !sel.rangeCount) return false
      const root = copyableRoot(sel.anchorNode)
      return !!root && root === copyableRoot(sel.focusNode)
    }

    const block = (e) => {
      if (inEditable(e.target)) return
      if ((e.type === 'copy' || e.type === 'cut') && selectionCopyable()) return
      // Правый клик (и долгое нажатие) в чате — меню «Копировать».
      if (e.type === 'contextmenu' && copyableRoot(e.target)) return
      e.preventDefault()
    }

    // Выделение в тексте урока разрешено: на нём держится перевод фразы (до 100
    // символов), а тапом переводится только одно слово. Копирование при этом
    // по-прежнему закрыто — `copy`/`cut`/`contextmenu`/`dragstart` гасятся везде,
    // так что выделить, чтобы перевести, можно, а унести текст — нет.
    // Целью selectstart Chrome ставит ТЕКСТОВЫЙ узел, если нажатие пришлось на
    // саму букву (на пустое место в абзаце — уже элемент). У текстового узла нет
    // closest(), поэтому `?.` молча проваливал проверку в preventDefault: с
    // пробела выделение начиналось, с буквы — нет. Отсюда жалоба «выделяется
    // буквально на рандом» (и невозможность выделить в contenteditable —
    // Блокнот Письма). Нормализуем узел до элемента ДО обеих проверок.
    const blockSelect = (e) => {
      const el = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target
      if (inEditable(el)) return
      if (el?.closest?.('[data-selectable], [data-copyable]')) return
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
        <LessonFrameThemeBridge />
        {children}
      </LanguageProvider>
    </I18nProvider>
  )
}
