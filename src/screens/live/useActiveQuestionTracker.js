import { useEffect, useLayoutEffect, useRef } from 'react'

// Какой вопрос активного шага сейчас в кадре у ученика — два независимых
// сигнала. Скролл — throttled (см. pick ниже): слушаем на document с
// capture:true, а не на самом контейнере, потому что колонка урока
// скроллится по-разному в зависимости от ширины экрана (.lw-live-main
// получает overflow-y:auto только в широкой раскладке, иначе скроллится
// окно) — capture-фаза видит скролл любого предка, event bubbling тут ни при
// чём, scroll не всплывает вовсе. Фокус — мгновенный, без троттлинга (см.
// onFocusIn ниже): несколько коротких заданий на одном экране (типично для
// «Type it») переключаются табом/кликом вообще без скролла, и без этого
// сигнала смотрящий застревал бы на первом поле, пока студент печатает в
// третьем.
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
      // «Ближе всего к центру экрана» тут не работает: длинная карточка
      // (например "Why" на пол-экрана) держит центр даже когда студент уже
      // читает следующую, короткую, у самого верха — отстающий блок
      // систематически выигрывал бы гонку. Вместо этого — «линия чтения»
      // чуть ниже верха вьюпорта: текущий блок это последний, чей верх её
      // уже пересёк (порядок NodeList совпадает с порядком в документе) —
      // тот же приём, которым доки со sticky-оглавлением подсвечивают
      // активный пункт при скролле.
      const readingLine = 100
      let best = nodes[0]
      nodes.forEach((node) => {
        if (node.getBoundingClientRect().top <= readingLine) best = node
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

    // Скролл — не единственный способ уйти на другой вопрос: если несколько
    // заданий помещаются на экране разом (типично для «Type it» — короткие
    // карточки одна под другой), студент переходит между полями табом/кликом
    // без единого пикселя скролла, и pick() выше просто не срабатывает —
    // смотрящий застревает на первом поле, пока студент уже печатает в
    // третьем. focusin — сильный и точный сигнал сам по себе (в отличие от
    // проскроллённой мимо карточки, фокус — это буквально «здесь печатают
    // прямо сейчас»), поэтому у него нет троттлинга: он и так не может
    // сработать чаще, чем реально переключается поле ввода.
    function onFocusIn(e) {
      const target = e.target.closest?.('[data-question-id]')
      if (!target) return
      const id = target.getAttribute('data-question-id')
      if (id && id !== lastRef.current) {
        lastRef.current = id
        onActiveChangeRef.current(id)
      }
    }

    // Сразу, без ожидания первого скролла — иначе смотрящий не узнает
    // позицию, пока ученик не шевельнёт колесом.
    pick()
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    containerEl.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      containerEl.removeEventListener('focusin', onFocusIn)
      clearTimeout(timerRef.current)
    }
    // onActiveChange нарочно не в списке зависимостей — читаем его через ref
    // (см. onActiveChangeRef выше), чтобы не пересобирать слушатель на каждый
    // чужой ре-рендер LiveLessonPage.
  }, [containerRef, enabled])
}
