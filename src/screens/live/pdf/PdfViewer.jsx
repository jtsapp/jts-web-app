import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, FitIcon, ZoomInIcon, ZoomOutIcon } from '../../../components/icons.jsx'
import LiveLoader from '../LiveLoader.jsx'
import { openPdf } from './pdfLoader.js'
import { MAX_DPR, PAGE_PAD, clampPage, currentPage, pageTops, pagesToRender, stepZoom, ZOOM_MAX, ZOOM_MIN } from './pdfLayout.js'

// Просмотр PDF прямо в уроке. Раньше PDF шёл в <iframe> как есть: Chrome на
// Android PDF внутри страницы не показывает вовсе, Safari на iPhone — первую
// страницу без прокрутки, а ученики в основном с телефонов. Здесь страницы
// рисует pdf.js в канвы, одинаково везде.
//
// Номер страницы — та же «стадия», что у файлового урока: наружу уходит
// onPageChange(index, { own }), внутрь — проп `page` (страница класса) и
// goToPage. `own` — листал сам человек: кнопки, прокрутка колесом, пальцем,
// клавишами. Программный переход (за классом, восстановление после F5) и
// подстройка ленты под новую ширину — не свои: иначе ученик, которого привели
// на страницу, «вёл» бы весь класс.
//
// Рисуются только видимые страницы и по одной соседней (pagesToRender), канвы
// остальных освобождаются: на 80-страничном PDF телефон иначе держал бы
// сотни мегабайт растра.

// Свою прокрутку от программной отличает недавнее касание ленты.
const OWN_INPUT_MS = 1500
// Прокрутка «встала» — тогда номер уходит наружу, а не на каждом кадре.
const SETTLE_MS = 200
// Сколько после goToPage прокрутка считается нашей (плавная доезжает до 1 с).
const NAV_MS = 1200
// Ширина до первого замера: в тестовом окружении у элементов нет размеров.
const FALLBACK_WIDTH = 600

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

const PdfPage = function PdfPage({ doc, index, width, aspect, active, label, onAspect }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    if (!active) {
      // Ушла из окна — растр больше не нужен. Нулевой размер освобождает память канвы сразу.
      canvas.width = 0
      canvas.height = 0
      return undefined
    }
    let cancelled = false
    let task = null
    doc.getPage(index + 1)
      .then((page) => {
        if (cancelled) return undefined
        const base = page.getViewport({ scale: 1 })
        onAspect(index, base.height / base.width)
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
        const viewport = page.getViewport({ scale: (width / base.width) * dpr })
        const context = canvas.getContext?.('2d')
        if (!context) return undefined
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        task = page.render({ canvasContext: context, viewport })
        return task.promise
      })
      // Отмена рендера (страница ушла, сменился масштаб) — не ошибка; битая
      // страница остаётся пустым листом, остальные рисуются.
      .catch(() => {})
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, index, width, active, onAspect])

  return (
    <div
      className="pdfv__page"
      style={{ width, height: Math.round(width * aspect) }}
      role="img"
      aria-label={label}
    >
      <canvas ref={canvasRef} className="pdfv__canvas" />
    </div>
  )
}

const PdfViewer = forwardRef(function PdfViewer({ url, title, page = null, onPageChange }, ref) {
  const { t } = useI18n()
  const scrollerRef = useRef(null)
  // Документ хранится вместе с адресом, для которого он открыт: сменился адрес —
  // прошлый результат не годится, и это видно сравнением в рендере, без сброса
  // состояния в эффекте.
  const [loaded, setLoaded] = useState({ url: null, doc: null, aspects: [], failed: false })
  const [fitWidth, setFitWidth] = useState(FALLBACK_WIDTH)
  const [zoom, setZoom] = useState(1)
  const [metrics, setMetrics] = useState({ top: 0, height: 0 })

  const ready = loaded.url === url && loaded.doc != null
  const failed = loaded.url === url && loaded.failed
  const doc = ready ? loaded.doc : null
  const aspects = useMemo(() => (ready ? loaded.aspects : []), [ready, loaded.aspects])
  const width = Math.round(fitWidth * zoom)
  const layout = useMemo(() => pageTops(aspects, width), [aspects, width])
  const count = aspects.length
  const shown = currentPage(layout.tops, metrics.top, metrics.height, layout.height)
  const range = pagesToRender(layout.tops, metrics.top, metrics.height)

  // Страница, которую держать перед глазами при смене ширины ленты.
  const anchorRef = useRef(0)
  // Последний номер, отданный наружу, — чтобы не повторять его на каждой остановке прокрутки.
  const reportedRef = useRef(null)
  // Идёт наш переход: прокрутка до `until` — его, а не человека.
  const navRef = useRef(null)
  // Ждёт документа: переход, попросили до загрузки.
  const pendingRef = useRef(null)
  const inputAtRef = useRef(0)
  const settleTimerRef = useRef(null)
  // Свежие значения для слушателей, которые живут дольше рендера.
  const stateRef = useRef({ layout, count, shown, onPageChange })
  useLayoutEffect(() => {
    stateRef.current = { layout, count, shown, onPageChange }
  })

  useEffect(() => {
    if (!url) return undefined
    let alive = true
    const handle = openPdf(url)
    handle.promise
      .then(async (opened) => {
        const first = await opened.getPage(1)
        const base = first.getViewport({ scale: 1 })
        if (!alive) return
        // Пропорции всех страниц до их отрисовки — как у первой: высота ленты
        // сразу близка к настоящей, а страница другой формы поправит себя сама.
        setLoaded({ url, doc: opened, aspects: new Array(opened.numPages).fill(base.height / base.width), failed: false })
      })
      // Битый, запароленный файл или сбой сети — ошибка с запасным путём, а не вечная загрузка.
      .catch(() => {
        if (alive) setLoaded({ url, doc: null, aspects: [], failed: true })
      })
    return () => {
      alive = false
      reportedRef.current = null
      handle.destroy()
    }
  }, [url])

  // Наша прокрутка. Метка «прокрутка — наша» ставится, только если лента и
  // правда сдвинется: на месте браузер события scroll не шлёт, и метка
  // проглотила бы первое листание человека.
  const scrollLentaTo = useCallback((scroller, top, smooth) => {
    if (Math.abs(scroller.scrollTop - top) < 1) return
    navRef.current = { until: Date.now() + NAV_MS }
    if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    else scroller.scrollTop = top
  }, [])

  const report = useCallback((index, own) => {
    if (index == null || index === reportedRef.current) return
    reportedRef.current = index
    stateRef.current.onPageChange?.(index, { own })
  }, [])

  const goToPage = useCallback((index, { own = false } = {}) => {
    const { layout: current, count: total } = stateRef.current
    const target = clampPage(index, total)
    const scroller = scrollerRef.current
    if (target == null || !scroller) {
      pendingRef.current = { index, own }
      return
    }
    pendingRef.current = null
    anchorRef.current = target
    scrollLentaTo(scroller, current.tops[target] - PAGE_PAD, own && !prefersReducedMotion())
    report(target, own)
  }, [report, scrollLentaTo])

  // «Предыдущая/Следующая» считают от страницы, куда лента уже едет: пока идёт
  // плавная прокрутка, на экране ещё прежняя, и второе быстрое нажатие
  // повторило бы тот же переход (живая проверка 26.10.2026: два нажатия — одна
  // страница).
  const stepPage = useCallback((direction) => {
    const nav = navRef.current
    const from = nav && Date.now() < nav.until ? anchorRef.current : stateRef.current.shown
    goToPage(from + direction, { own: true })
  }, [goToPage])

  useImperativeHandle(ref, () => ({ goToPage }), [goToPage])

  // Ширина ленты — по контейнеру; масштаб 1 — «по ширине».
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return undefined
    // Вместе с шириной — и высота окна: без неё до первой прокрутки рисовались
    // бы только первые две страницы, сколько бы их ни помещалось на экране.
    const measure = () => {
      const available = scroller.clientWidth - PAGE_PAD * 2
      if (available > 0) setFitWidth(available)
      setMetrics({ top: scroller.scrollTop, height: scroller.clientHeight })
    }
    measure()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [ready])

  // Документ открылся: переход, который ждал загрузки, или страница класса.
  useEffect(() => {
    if (!ready) return
    const pending = pendingRef.current
    if (pending) goToPage(pending.index, { own: pending.own })
  }, [ready, goToPage])

  // Страница класса — для следующего за ним ученика.
  useEffect(() => {
    if (ready && page != null) goToPage(page, { own: false })
  }, [ready, page, goToPage])

  // Сменилась ширина страниц (масштаб, поворот телефона) — та же страница
  // остаётся перед глазами. Это подстройка, а не листание: наружу не уходит.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !ready) return
    scrollLentaTo(scroller, stateRef.current.layout.tops[anchorRef.current] - PAGE_PAD, false)
  }, [width, ready, scrollLentaTo])

  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    // Браузер шлёт scroll не чаще раза за кадр — отдельный кадр сверху не нужен.
    setMetrics({ top: scroller.scrollTop, height: scroller.clientHeight })
    clearTimeout(settleTimerRef.current)
    settleTimerRef.current = setTimeout(() => {
      const { layout: current } = stateRef.current
      const index = currentPage(current.tops, scroller.scrollTop, scroller.clientHeight, current.height)
      anchorRef.current = index
      const nav = navRef.current
      navRef.current = null
      if (nav && Date.now() < nav.until) return
      report(index, Date.now() - inputAtRef.current < OWN_INPUT_MS)
    }, SETTLE_MS)
  }, [report])

  useEffect(() => () => clearTimeout(settleTimerRef.current), [])

  const markInput = useCallback(() => {
    inputAtRef.current = Date.now()
  }, [])

  const onAspect = useCallback((index, aspect) => {
    setLoaded((current) => {
      if (!current.doc || current.aspects[index] === aspect) return current
      const next = current.aspects.slice()
      next[index] = aspect
      return { ...current, aspects: next }
    })
  }, [])

  const pageNo = Math.min(shown + 1, Math.max(count, 1))

  return (
    <div className="pdfv" aria-busy={!ready && !failed}>
      <div className="pdfv__bar" role="toolbar" aria-label={t('lesson.pdf.toolbar')}>
        <div className="pdfv__group">
          <button
            type="button"
            className="pdfv__btn"
            aria-label={t('lesson.pdf.prev')}
            disabled={!ready || shown <= 0}
            onClick={() => stepPage(-1)}
          >
            <ChevronLeftIcon size={18} />
          </button>
          <span className="pdfv__count" aria-label={ready ? t('lesson.pdf.pageLabel', { page: pageNo, total: count }) : undefined}>
            {ready ? t('lesson.pdf.pageOf', { page: pageNo, total: count }) : '—'}
          </span>
          <button
            type="button"
            className="pdfv__btn"
            aria-label={t('lesson.pdf.next')}
            disabled={!ready || shown >= count - 1}
            onClick={() => stepPage(1)}
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
        <div className="pdfv__group">
          <button
            type="button"
            className="pdfv__btn"
            aria-label={t('lesson.pdf.zoomOut')}
            disabled={!ready || zoom <= ZOOM_MIN}
            onClick={() => setZoom((value) => stepZoom(value, -1))}
          >
            <ZoomOutIcon size={18} />
          </button>
          <span className="pdfv__zoom">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="pdfv__btn"
            aria-label={t('lesson.pdf.zoomIn')}
            disabled={!ready || zoom >= ZOOM_MAX}
            onClick={() => setZoom((value) => stepZoom(value, 1))}
          >
            <ZoomInIcon size={18} />
          </button>
          <button
            type="button"
            className="pdfv__btn pdfv__fit"
            aria-label={t('lesson.pdf.fit')}
            aria-pressed={zoom === 1}
            disabled={!ready}
            onClick={() => setZoom(1)}
          >
            <FitIcon size={18} />
          </button>
        </div>
        {/* Значком, а не подписью: подпись не помещалась в строку панели и
            съедала под себя целую вторую строку — и на телефоне, и в колонке урока. */}
        <a
          className="pdfv__btn pdfv__open-icon"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('lesson.pdf.openNewTab')}
          title={t('lesson.pdf.openNewTab')}
        >
          <ExternalLinkIcon size={18} />
        </a>
      </div>

      <div
        ref={scrollerRef}
        className="pdfv__scroller"
        tabIndex={0}
        role="region"
        aria-label={title || t('lesson.pdf.toolbar')}
        onScroll={onScroll}
        onWheel={markInput}
        onTouchStart={markInput}
        onPointerDown={markInput}
        onKeyDown={markInput}
      >
        {ready && (
          <div className="pdfv__sheet" style={{ height: layout.height, minWidth: width + PAGE_PAD * 2 }}>
            {aspects.map((aspect, index) => (
              // Ключ — номер страницы: порядок страниц документа не меняется.
              <PdfPage
                key={index}
                doc={doc}
                index={index}
                width={width}
                aspect={aspect}
                active={index >= range.first && index <= range.last}
                label={t('lesson.pdf.pageLabel', { page: index + 1, total: count })}
                onAspect={onAspect}
              />
            ))}
          </div>
        )}
        {!ready && !failed && <LiveLoader className="pdfv__state" label={t('lesson.pdf.loading')} />}
        {failed && (
          <div className="pdfv__state pdfv__error" role="alert">
            <p>{t('lesson.pdf.error')}</p>
            <a className="pdfv__open" href={url} target="_blank" rel="noopener noreferrer">
              {t('lesson.pdf.openNewTab')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
})

export default PdfViewer
