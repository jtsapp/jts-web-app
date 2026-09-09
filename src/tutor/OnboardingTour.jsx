import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n/LanguageContext.jsx'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// Раскладка поповера: у элемента справа — слева от него, иначе снизу/сверху.
// Если элемент такой высокий, что поповер не помещается ни там, ни там (частый
// случай на телефоне), прибиваем поповер к низу экрана — раньше он ложился
// прямо на подсвеченный элемент или упирался в статусбар.
//
// rect — прямоугольник «дырки», собранный руками: {left, top, width, height},
// без bottom. Раньше место под элементом считалось через rect.bottom, выходил
// NaN, и ветка «под элементом» не срабатывала НИ РАЗУ: карточку всегда
// прибивало к низу экрана — оттуда и жалоба «поповер накрывает подсветку».
function placePopover(rect, popW, popH) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const m = 16
  if (!rect) return { left: (vw - popW) / 2, top: (vh - popH) / 2 }
  const bottom = rect.top + rect.height
  const spaceLeft = rect.left
  const spaceBelow = vh - bottom
  const centeredLeft = clamp(rect.left + rect.width / 2 - popW / 2, m, vw - popW - m)
  if (rect.left > vw * 0.55 && spaceLeft > popW + m) {
    return {
      left: rect.left - popW - m,
      top: clamp(rect.top, m, vh - popH - m),
    }
  }
  if (spaceBelow > popH + m) {
    return { left: centeredLeft, top: bottom + m }
  }
  if (rect.top - popH - m > m) {
    return { left: centeredLeft, top: rect.top - popH - m }
  }
  return { left: centeredLeft, top: vh - popH - m }
}

// Ключ отметки «тур уже показан» и её чтение живут рядом с тем, кто её пишет
// (finish ниже). Раньше storageKey никто не передавал, отметка не писалась
// и читать её было некому — тур выходил заново после каждой смены тьютора, потому
// что смена гоняет ту же онбординг-цепочку, а его включение висит на её конце.
//
// Ключ включает id профиля (`user-<id>` у залогиненного, device-id у анонима) —
// именно из-за этого браузерный флаг когда-то и убрали: он был один на
// устройство, и второй аккаунт на том же браузере тура не видел.
//
// scope разводит туры разных экранов; у дашборда он остался 'dash', поэтому
// старые отметки в силе и второй раз тьюторский тур никому не выпадет.
export function tourKeyFor(profileId, scope = 'dash') {
  return `jts_tour_${scope}:${profileId || 'anon'}`
}

/** Показывали ли уже тур. localStorage недоступен → false: лучше лишний тур, чем молча пропущенный. */
export function isTourSeen(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

/**
 * Тумблер «туры не показывать сами». Ключ отметки о показе включает id профиля,
 * а он приезжает с бэкенда — снаружи (e2e, поддержка) его не угадать, поэтому
 * гасить туры оптом нужно чем-то, что от профиля не зависит. Кнопку «?» не
 * трогает: по ней тур открывается всегда.
 */
function toursOff() {
  try {
    return localStorage.getItem('jts_tours_off') === '1'
  } catch {
    return false
  }
}

/**
 * Тур экрана: сам открывается при первом заходе и открывается заново по кнопке «?».
 * Возвращает { open, start, finish } — при open рисуем <OnboardingTour>.
 */
export function useScreenTour(storageKey) {
  const [open, setOpen] = useState(false)
  const armed = useRef(false)

  useEffect(() => {
    if (armed.current || !storageKey || toursOff()) return
    // Решаем ОДИН раз за монтирование: ключ включает id профиля, а тот приезжает
    // из /api/profile асинхронно — на смене device-id → user-<id> повторная
    // проверка открывала бы тур заново сразу после «Готово».
    armed.current = true
    // Отметку читаем эффектом, а не в useState: на сервере localStorage нет, и
    // посчитанное в рендере значение разошлось бы с клиентским (hydration
    // mismatch — по той же причине и ?screen= применяется после гидратации).
    if (!isTourSeen(storageKey)) setOpen(true)
  }, [storageKey])

  return {
    open,
    start: () => setOpen(true),
    finish: () => setOpen(false),
  }
}

// Гайд-тур: затемняет экран, «прожигает» дырку на текущем элементе (по CSS-селектору),
// рядом рисует поповер с текстом, прогрессом и кнопкой «ОК». По шагам вперёд; в конце
// ставит флаг в localStorage и вызывает onFinish.
export default function OnboardingTour({ steps, onFinish, storageKey }) {
  const t = useT()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  // Реальный размер карточки. Раньше он был зашит числами из макета (393×184),
  // и раскладка считалась по вымыслу: на десктопе карточка 300 шириной, а её
  // высота вообще зависит от длины текста шага — поповер ложился на подсветку.
  const popRef = useRef(null)
  const [popSize, setPopSize] = useState(null)
  // Показали ли хоть один шаг. Экран мог открыться пустым (домашних работ нет,
  // расписание не загрузилось) — тогда тур пропускает все шаги подряд и обязан
  // закрыться БЕЗ отметки: иначе он «пройден» молча и больше не выйдет никогда.
  const shownRef = useRef(false)
  const step = steps[i]
  const selector = step?.selector

  const finish = () => {
    try {
      if (storageKey && shownRef.current) localStorage.setItem(storageKey, '1')
    } catch {
      /* localStorage недоступен — просто закрываем */
    }
    onFinish?.()
  }
  useLayoutEffect(() => {
    if (!selector) return undefined
    const el = document.querySelector(selector)
    // Шаг без своего элемента на экране пропускаем: в Практике секции зависят от
    // контента и выбранного чипа, и подсветка несуществующего узла показала бы
    // «дырку» в пустоте (у тьютора это раньше отсеивал сам экран).
    if (!el) {
      if (i + 1 < steps.length) setI(i + 1)
      else finish()
      return undefined
    }
    shownRef.current = true
    // Скроллим мгновенно и запираем прокрутку страницы: под туром она жила
    // своей жизнью — прожектор и поповер уезжали с подсвеченного элемента.
    el.scrollIntoView({ block: 'center', behavior: 'auto' })
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    // Меряем цель не один раз, а следим за ней. Замер на монтировании врёт,
    // когда элемент дорастает позже: картинка острова догружается, ряд чипов
    // переносится во вторую строку по шрифту — прожектор оставался на старом
    // месте и уезжал за экран. ResizeObserver ловит и саму цель, и перекладку
    // страницы, слушатель scroll с capture — прокрутку внутренних контейнеров
    // (у карты уровней скроллится не документ, и запирать её нечем).
    const same = (a, b) =>
      a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
    const measure = () => {
      const node = document.querySelector(selector)
      const next = node ? node.getBoundingClientRect() : null
      setRect((prev) => (same(prev, next) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(document.documentElement)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      document.documentElement.style.overflow = prevOverflow
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [selector, i, steps.length])

  // Меряем карточку: текст шага меняет высоту, а на мобилке другая ширина
  // (медиазапрос) — за обоими следит ResizeObserver. offset*, а не
  // getBoundingClientRect: на первом кадре карточка внутри анимации появления
  // (scale .94), и рект вернул бы размер уменьшенной копии.
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el) return undefined
    const read = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      setPopSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const next = () => (i + 1 < steps.length ? setI(i + 1) : finish())

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'Enter' || e.key === ' ') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!step) return null

  const pad = 10
  let hole = rect
    ? {
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null
  if (hole && popSize) {
    // Элемент выше, чем остаток экрана под карточку (на телефоне это почти любая
    // секция ленты): раньше в таком случае поповер прибивался к низу и ложился
    // прямо на подсветку. Обрезаем прожектор сверху экрана и оставляем внизу
    // полосу под карточку — подсвечено начало элемента, а не «всё сразу».
    const maxH = window.innerHeight - popSize.h - 16 * 3
    if (hole.height > maxH) {
      hole = { ...hole, top: Math.max(16, hole.top), height: Math.max(80, maxH) }
    }
  }
  const pos = popSize ? placePopover(hole, popSize.w, popSize.h) : { left: 0, top: 0 }
  const last = i + 1 === steps.length

  // Портал в body: обёртка смены экранов (.scr-in) анимируется transform'ом и
  // становится containing block — position: fixed внутри неё ехал вместе со
  // скроллом страницы (поповер обрезался краем экрана).
  return createPortal(
    <div className="t-tour" role="dialog" aria-modal="true" aria-label={step.title}>
      {hole ? (
        <div className="t-tour__hole" style={hole} />
      ) : (
        <div className="t-tour__veil" />
      )}

      {/* До первого замера позиции ещё нет — прячем карточку, чтобы она не
          мигнула в углу. Замер идёт в layout-эффекте, то есть до пейнта. */}
      <div
        ref={popRef}
        className="t-tour__pop"
        style={{ left: pos.left, top: pos.top, visibility: popSize ? undefined : 'hidden' }}
      >
        <b className="t-tour__title">{step.title}</b>
        <p className="t-tour__text">{step.text}</p>

        <div className="t-tour__bar">
          <span style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="t-tour__foot">
          <button className="t-tour__skip" type="button" onClick={finish}>
            {t('tour.skip')}
          </button>
          <div className="t-tour__right">
            <span className="t-tour__count">
              {i + 1}/{steps.length}
            </span>
            <button className="t-tour__ok" type="button" onClick={next}>
              {last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
