import { useEffect, useLayoutEffect, useRef } from 'react'

// Какой вопрос активного шага сейчас в кадре у ученика — throttled по скроллу,
// а не по каждому кадру. Слушаем на document с capture:true, а не на самом
// контейнере: колонка урока скроллится по-разному в зависимости от ширины
// экрана (.lw-live-main получает overflow-y:auto только в широкой раскладке,
// иначе скроллится окно) — capture-фаза видит скролл любого предка, event
// bubbling тут ни при чём, scroll не всплывает вовсе.
//
// `containerEl` ограничивает поиск карточек своим деревом (а не всей
// страницей) — у преподавателя рядом может быть собственный readOnly-повтор
// того же LessonContent, и его карточки трогать не нужно.
export function useActiveQuestionTracker(containerRef, onActiveChange, enabled) {
  const lastRef = useRef(null)
  const timerRef = useRef(null)
  // `onActiveChange` — плюс function-компонент LiveLessonPage ре-рендерится
  // часто (поллинг статуса/чата каждые 5с), и без ref-обёртки эффект ниже
  // пересобирался бы на каждый такой ре-рендер: снятие+навешивание слушателя
  // scroll между двумя одноуровневыми событиями скролла реально теряло
  // реальные скроллы студента — поймано живьём (см. коммит).
  const onActiveChangeRef = useRef(onActiveChange)
  useLayoutEffect(() => {
    onActiveChangeRef.current = onActiveChange
  })

  useEffect(() => {
    lastRef.current = null
    if (!enabled) return undefined
    const containerEl = containerRef.current
    if (!containerEl) return undefined

    function pick() {
      timerRef.current = null
      const nodes = containerEl.querySelectorAll('[data-question-id]')
      if (!nodes.length) return
      const mid = window.innerHeight / 2
      let best = null
      let bestDist = Infinity
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) return
        const dist = Math.abs((rect.top + rect.bottom) / 2 - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = node
        }
      })
      const id = best?.getAttribute('data-question-id') || null
      if (id && id !== lastRef.current) {
        lastRef.current = id
        onActiveChangeRef.current(id)
      }
    }

    function onScroll() {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(pick, 200)
    }

    // Сразу, без ожидания первого скролла — иначе смотрящий не узнает
    // позицию, пока ученик не шевельнёт колесом.
    pick()
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      clearTimeout(timerRef.current)
    }
    // onActiveChange нарочно не в списке зависимостей — читаем его через ref
    // (см. onActiveChangeRef выше), чтобы не пересобирать слушатель на каждый
    // чужой ре-рендер LiveLessonPage.
  }, [containerRef, enabled])
}
