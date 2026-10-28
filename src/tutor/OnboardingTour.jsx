import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n/LanguageContext.jsx'
import { emitTourEnd, emitTourStep, toggleTourNarrationMute, useTourNarration, useToursHeld } from '../lib/tourBus.js'
import { unlockSpeech } from '../lib/speech.js'
import { isTourSeen, markTourSeen } from '../lib/tourMarks.js'

const LUNA_AVATAR = '/assets/luna-assistant.webp'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// Элемент или кто-то из предков спрятан display: none (медиазапросом). По
// стилю, а не по getClientRects: в jsdom боксов нет ни у кого, и тур в
// юнит-тестах пропускал бы все шаги подряд.
function isDisplayNone(el) {
  for (let node = el; node; node = node.parentElement) {
    if (getComputedStyle(node).display === 'none') return true
  }
  return false
}

// Сайдбар на телефоне не прячется display: none, а уезжает за левый край
// (drawer) — прожектор встал бы в пустоту за экраном. Элемент без размеров
// считаем видимым: в jsdom боксов нет ни у кого (см. isDisplayNone).
function isOffscreen(el) {
  const r = el.getBoundingClientRect()
  if (!r.width && !r.height) return false
  return r.right <= 0 || r.left >= window.innerWidth
}

// Цель шага — один селектор или несколько: макет «Первый заход» подсвечивает
// «Расписание» и «Домашнее задание» одной рамкой. Берём первое совпадение
// каждого селектора, видимые из них сводим в один прямоугольник.
function targetsOf(selector) {
  const list = Array.isArray(selector) ? selector : [selector]
  return list
    .map((s) => document.querySelector(s))
    .filter((el) => el && !isDisplayNone(el) && !isOffscreen(el))
}

function unionRect(els) {
  const rects = els.map((el) => el.getBoundingClientRect())
  const left = Math.min(...rects.map((r) => r.left))
  const top = Math.min(...rects.map((r) => r.top))
  const right = Math.max(...rects.map((r) => r.right))
  const bottom = Math.max(...rects.map((r) => r.bottom))
  return { left, top, width: right - left, height: bottom - top }
}

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

// Раскладка карточки «Главной» (макет «Первый заход и подсказки»): под блоком
// карточка встаёт по его левому краю, а не по центру; у блока справа — слева от
// него вровень с верхом; у прижатого к левому краю (сайдбар) — справа.
function placeCoach(rect, popW, popH) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const m = 16
  if (!rect) return { left: (vw - popW) / 2, top: Math.max(m, (vh - popH) / 2) }
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  if (right < vw * 0.3 && vw - right > popW + 28 + m) {
    // 40 от верха самого элемента: rect — уже прожектор с полем 8 вокруг.
    return { left: right + 28, top: clamp(rect.top + 48, m, vh - popH - m) }
  }
  if (rect.left > vw * 0.55 && rect.left > popW + m * 2) {
    return { left: rect.left - popW - m, top: clamp(rect.top, m, vh - popH - m) }
  }
  const left = clamp(rect.left, m, vw - popW - m)
  if (vh - bottom > popH + 12 + m) return { left, top: bottom + 12 }
  if (rect.top - popH - 12 > m) return { left, top: rect.top - popH - 12 }
  return { left, top: vh - popH - m }
}

const ArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M16.2 13H4v-2h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6Z" fill="currentColor" />
  </svg>
)

// Ключ отметки «тур уже показан» включает владельца (`user-<id>` у аккаунта,
// device-id у гостя) — браузерный флаг когда-то убрали именно потому, что он
// был один на устройство, и второй аккаунт на том же браузере тура не видел.
// Сами отметки аккаунта с 28.10.2026 лежат на сервере (lib/tourMarks.js), а
// ключ и его разбор — в lib/tourName.js. Отсюда реэкспорт: экраны и моки
// тестов берут их у тура.
export { tourKeyFor } from '../lib/tourName.js'
export { isTourSeen } from '../lib/tourMarks.js'

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
// ставит отметку (markTourSeen: браузер и сервер) и вызывает onFinish.
//
// Шаг может нести свой интерактив: `content` рисуется под текстом (список
// разделов на «Главной»), а `canNext: false` держит «Далее», пока выбор не сделан. Кликать
// сквозь затемнение по самой подсвеченной карточке не даём — тогда ожила бы вся
// карточка, а не только выбор, — поэтому интерактив живёт в поповере.
//
// look="coach" — вид «Главной» по макету «Первый заход и подсказки» (21.10.2026):
// приветствие с именем (intro) перед шагами, точки вместо счётчика, маскот в
// карточке (step.art), белая рамка прожектора. Остальные экраны пока на прежнем
// виде: макет нарисован только для «Главной». Шаг с optional: true без цели на
// экране не пропускается, а встаёт по центру — список разделов на телефоне, где
// сайдбар спрятан в drawer.
//
// Пока App держит своё окно (holdTours в tourBus.js), тура нет вовсе — ни
// затемнения, ни запертой прокрутки, ни Escape, который закрыл бы его вместе с
// окном. Открытый тур при этом снимается, а после окна начинается заново с
// приветствия: окно могло прийти посреди тура (демо-статус после входа
// приезжает позже, чем «Главная» решает открыть тур).
export default function OnboardingTour(props) {
  const held = useToursHeld()
  return held ? null : <TourOverlay {...props} />
}

function TourOverlay({ steps, onFinish, storageKey, look, intro }) {
  const t = useT()
  const coach = look === 'coach'
  const [phase, setPhase] = useState(coach && intro ? 'intro' : 'steps')
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
  const step = phase === 'steps' ? steps[i] : null
  const selector = step?.selector
  // Ключ эффекта: массив селекторов каждый рендер новый.
  const selectorKey = Array.isArray(selector) ? selector.join('|') : selector
  // Тур ведёт Луна: шаги она читает вслух (tourBus.js, AssistantWidget), а в
  // карточке — её строка и кнопка звука.
  const narration = useTourNarration()

  // Конец тура — Луне замолчать. По размонтированию, а не только в finish:
  // ушли с экрана посреди тура — тоже конец. Отложенно и со сверкой: в dev
  // StrictMode гоняет эффект «смонтировать — снять — смонтировать», и без
  // сверки озвучка гасла бы на первом же шаге.
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      setTimeout(() => {
        if (!mountedRef.current) emitTourEnd()
      }, 0)
    }
  }, [])

  const finish = () => {
    if (storageKey && shownRef.current) markTourSeen(storageKey)
    onFinish?.()
  }
  // Приветствие — тоже показ: пропустивший его увидел тур и второй раз его не ждёт.
  useEffect(() => {
    if (phase === 'intro') shownRef.current = true
  }, [phase])

  useLayoutEffect(() => {
    if (!selector) return undefined
    const els = targetsOf(selector)
    // Шаг без своего элемента на экране пропускаем: в Практике секции зависят от
    // контента и выбранного чипа, и подсветка несуществующего узла показала бы
    // «дырку» в пустоте (у тьютора это раньше отсеивал сам экран). Скрытый
    // элемент (display: none под медиазапросом — список домашних работ на
    // телефоне, кнопка «Все задания» на десктопе) — то же самое: боксов у него
    // нет, и прожектор встал бы в левый верхний угол нулевой точкой.
    if (!els.length && !step.optional) {
      if (i + 1 < steps.length) setI(i + 1)
      else finish()
      return undefined
    }
    shownRef.current = true
    // Шаг показан — сообщаем Луне (озвучит, если тур ведёт она). Только
    // показанный: пропущенный шаг без элемента рассказывать не о чем. next —
    // чтобы она успела синтезировать следующий шаг, пока звучит этот.
    const after = steps[i + 1]
    emitTourStep({
      index: i,
      total: steps.length,
      title: step.title,
      text: step.text,
      next: after ? { title: after.title, text: after.text } : null,
    })
    // Скроллим мгновенно и запираем прокрутку страницы: под туром она жила
    // своей жизнью — прожектор и поповер уезжали с подсвеченного элемента.
    // Несколько целей — к началу первой, чтобы рамка влезла целиком.
    els[0]?.scrollIntoView({ block: els.length > 1 ? 'start' : 'center', behavior: 'auto' })
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
      const nodes = targetsOf(selector)
      const next = nodes.length ? unionRect(nodes) : null
      setRect((prev) => (same(prev, next) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    els.forEach((el) => ro.observe(el))
    ro.observe(document.documentElement)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      document.documentElement.style.overflow = prevOverflow
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectorKey и есть selector, только стабильный
  }, [selectorKey, i, steps.length])

  // Меряем карточку: текст шага меняет высоту, а на мобилке другая ширина
  // (медиазапрос) — за обоими следит ResizeObserver. offset*, а не
  // getBoundingClientRect: на первом кадре карточка внутри анимации появления
  // (scale .94), и рект вернул бы размер уменьшенной копии.
  // От фазы: в приветствии карточки нет, и мерить её начинаем с первого шага.
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
  }, [phase])

  const blocked = step?.canNext === false
  const next = () => {
    if (phase === 'intro') {
      if (narration.on && !narration.muted) unlockSpeech()
      setPhase('steps')
      return
    }
    if (blocked) return
    // Нажатие «Далее» — жест: iPhone разрешит сыграть Луне следующий шаг,
    // который придёт после синтеза, уже без жеста.
    if (narration.on && !narration.muted) unlockSpeech()
    if (i + 1 < steps.length) setI(i + 1)
    else finish()
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
      // Enter/пробел на кнопке внутри карточки — это её собственное нажатие:
      // на чипе выбора уровня это выбор, а не «Далее», а на самой «ОК» браузер
      // и так пришлёт click. У пробела click приходит на keyup, уже после
      // перерисовки, — и тур перескакивал через шаг.
      else if ((e.key === 'Enter' || e.key === ' ') && !e.target?.closest?.('.t-tour button')) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'intro') {
    // Приветствие (макет: «Демо · приглашение в тур»): карточка по центру, маскоты
    // выглядывают из-за её краёв. Картинки — готовый рендер Figma, обрезанный
    // ровно так, как он виден в макете.
    return createPortal(
      <div className="t-tour t-tour--coach" role="dialog" aria-modal="true" aria-label={intro.title}>
        <div className="t-tour__veil t-tour__veil--intro" />
        <div className="t-tour__intro">
          <img className="t-tour__intro-art t-tour__intro-art--top1" src="/assets/first-login/welcome-top1.webp" alt="" />
          <img className="t-tour__intro-art t-tour__intro-art--top2" src="/assets/first-login/welcome-top2.webp" alt="" />
          <img className="t-tour__intro-art t-tour__intro-art--left" src="/assets/first-login/welcome-left.webp" alt="" />
          <img className="t-tour__intro-art t-tour__intro-art--right" src="/assets/first-login/welcome-right.webp" alt="" />
          <div className="t-tour__intro-card">
            <div className="t-tour__intro-copy">
              <h2 className="t-tour__intro-title">
                {intro.title}
                {intro.name && <span className="t-tour__intro-name">{intro.name}</span>}
              </h2>
              <p className="t-tour__intro-text">{intro.text}</p>
            </div>
            <div className="t-tour__intro-acts">
              <button type="button" className="t-tour__intro-go" onClick={next}>
                {intro.cta}
                <ArrowIcon />
              </button>
              <button type="button" className="t-tour__intro-skip" onClick={finish}>
                {intro.skip}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  if (!step) return null

  const pad = coach ? 8 : 10
  let hole = rect
    ? {
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null
  // У карточки «Главной» на десктопе высокие цели (сайдбар, колонка расписания) стоят сбоку от карточки, и резать
  // прожектор незачем — он обрезал сайдбар до верхних двух пунктов.
  if (hole && popSize && (!coach || window.innerWidth <= 560)) {
    // Элемент выше, чем остаток экрана под карточку (на телефоне это почти любая
    // секция ленты): раньше в таком случае поповер прибивался к низу и ложился
    // прямо на подсветку. Обрезаем прожектор сверху экрана и оставляем внизу
    // полосу под карточку — подсвечено начало элемента, а не «всё сразу».
    const maxH = window.innerHeight - popSize.h - 16 * 3
    if (hole.height > maxH) {
      hole = { ...hole, top: Math.max(16, hole.top), height: Math.max(80, maxH) }
    }
  }
  const pos = popSize ? (coach ? placeCoach : placePopover)(hole, popSize.w, popSize.h) : { left: 0, top: 0 }
  const last = i + 1 === steps.length

  const luna = narration.on && (
    <div className="t-tour__luna">
      <img src={narration.avatar || LUNA_AVATAR} alt="" width="24" height="24" />
      <span>{t('tour.luna')}</span>
      <button
        type="button"
        className={`t-tour__luna-sound${narration.muted ? ' is-muted' : ''}`}
        aria-pressed={!narration.muted}
        aria-label={t(narration.muted ? 'tour.luna.unmute' : 'tour.luna.mute')}
        title={t(narration.muted ? 'tour.luna.unmute' : 'tour.luna.mute')}
        onClick={() => {
          if (narration.muted) unlockSpeech()
          toggleTourNarrationMute()
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          {narration.muted ? (
            <path d="m17 9 4 6m0-6-4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </div>
  )

  if (coach) {
    // Карточка «Главной»: точки прогресса, заголовок, текст, «Далее» и
    // «Пропустить» слева; на последнем шаге — одна «Готово» справа. Маскот
    // справа снизу, под текстом (ширина колонки текста — из макета шага).
    const art = step.art
    return createPortal(
      <div className="t-tour t-tour--coach" role="dialog" aria-modal="true" aria-label={step.title}>
        {hole ? <div className="t-tour__hole" style={hole} /> : <div className="t-tour__veil" />}
        <div
          ref={popRef}
          className={`t-tour__pop${art ? ' t-tour__pop--art' : ''}`}
          style={{
            left: pos.left,
            top: pos.top,
            width: step.width ? `min(${step.width}px, calc(100vw - 32px))` : undefined,
            visibility: popSize ? undefined : 'hidden',
          }}
        >
          <div className="t-tour__body" style={art ? { '--tour-text-w': `${step.textWidth}px` } : undefined}>
            <div className="t-tour__dots" aria-hidden="true">
              {steps.map((s, k) => (
                <i key={k} className={k === i ? 'is-on' : undefined} />
              ))}
            </div>
            <div className="t-tour__copy">
              <b className="t-tour__title">{step.title}</b>
              {step.text && <p className="t-tour__text">{step.text}</p>}
            </div>
            {step.content && <div className="t-tour__content">{step.content}</div>}
            {luna}
            <div className={`t-tour__acts${last ? ' is-last' : ''}`}>
              <button className="t-tour__ok" type="button" onClick={next} disabled={blocked}>
                {last ? t('tour.done') : t('tour.coach.next')}
              </button>
              {!last && (
                <button className="t-tour__skip" type="button" onClick={finish}>
                  {t('tour.skip')}
                </button>
              )}
            </div>
          </div>
          {art && <img className="t-tour__art" src={art.src} alt="" style={{ width: art.w, height: art.h }} />}
        </div>
      </div>,
      document.body,
    )
  }

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
        {step.content && <div className="t-tour__content">{step.content}</div>}

        {luna}

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
            <button className="t-tour__ok" type="button" onClick={next} disabled={blocked}>
              {last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
