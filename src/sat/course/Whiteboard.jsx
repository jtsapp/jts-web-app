import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import ConfirmDialog from '../../ielts/ui/ConfirmDialog.jsx'
import { CloseIcon } from '../../ielts/icons.jsx'
import { DownloadIcon, EraserIcon, FullscreenExitIcon, FullscreenIcon, HighlighterIcon, PenIcon, RedoIcon, TextIcon, UndoIcon } from '../icons.jsx'
import { COLORS, H, SIZES, W, add, clear, extend, fontSize, loadBoard, paint, redo, saveBoard, toBoard, undo } from './board.js'

const GEOM = 'jts_sat_board_window'
const TOOLS = [
  ['pen', PenIcon],
  ['hl', HighlighterIcon],
  ['eraser', EraserIcon],
  ['text', TextIcon],
]

function readGeom() {
  try {
    const g = JSON.parse(window.localStorage.getItem(GEOM) || 'null')
    if (g && g.width) return g
  } catch {
    /* по умолчанию — по центру */
  }
  const w = Math.min(960, window.innerWidth - 32)
  const h = Math.min(620, window.innerHeight - 32)
  return { left: Math.round((window.innerWidth - w) / 2), top: Math.round((window.innerHeight - h) / 2), width: w, height: h }
}

/**
 * Доска юнита — своё окно поверх урока (Нет в Figma: адаптация прототипа whiteboard.js): преподаватель тянется к ней
 * посреди объяснения и хочет её рядом с текстом, а не вместо него. Окно двигается за шапку, тянется за угол и помнит
 * место; доска у каждого юнита своя и живёт на устройстве. Перо, маркер, ластик, текст, шесть цветов, три толщины,
 * отмена и возврат (Ctrl+Z / Ctrl+Y), очистка, полный экран и PNG доски.
 */
export default function Whiteboard({ boardKey, onClose }) {
  const { t } = useI18n()
  const [board, setBoard] = useState(() => loadBoard(boardKey))
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(SIZES[1])
  const [status, setStatus] = useState('')
  const [askClear, setAskClear] = useState(false)
  const [text, setText] = useState(null) // { x, y } — где вводится надпись
  const [full, setFull] = useState(false)
  const win = useRef(null)
  const stage = useRef(null)
  const canvas = useRef(null)
  const live = useRef(null)
  const boardRef = useRef(board)

  const render = useCallback(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    const k = c.width / W
    ctx.setTransform(k, 0, 0, k, 0, 0)
    boardRef.current.items.forEach((it) => paint(ctx, it))
    if (live.current) paint(ctx, live.current)
  }, [])

  // холст держит поле 16:9 целиком внутри сцены, в пикселях устройства — чётко на любом экране
  const fit = useCallback(() => {
    const s = stage.current
    const c = canvas.current
    if (!s || !c || !s.clientWidth) return
    // поле сцены без её полей: clientWidth/Height их включают, и холст вылезал за низ окна
    const cs = window.getComputedStyle(s)
    const w = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const h = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const cw = Math.max(0, Math.min(w, (h * W) / H))
    const dpr = window.devicePixelRatio || 1
    c.style.width = `${cw}px`
    c.style.height = `${(cw * H) / W}px`
    c.width = Math.round(cw * dpr)
    c.height = Math.round(((cw * H) / W) * dpr)
    render()
  }, [render])

  useEffect(() => {
    const ro = new ResizeObserver(fit)
    if (stage.current) ro.observe(stage.current)
    return () => ro.disconnect()
  }, [fit])

  useEffect(() => {
    boardRef.current = board
    render()
    const id = setTimeout(() => setStatus(saveBoard(boardKey, board.items) ? t('sat.wb.saved') : t('sat.wb.notSaved')), 300)
    return () => clearTimeout(id)
  }, [board, boardKey, render, t])

  // место окна: из прошлого раза, но внутри экрана
  useEffect(() => {
    const g = readGeom()
    const el = win.current
    if (!el) return
    el.style.width = `${Math.min(g.width, window.innerWidth - 16)}px`
    el.style.height = `${Math.min(g.height, window.innerHeight - 16)}px`
    el.style.left = `${Math.max(0, Math.min(g.left, window.innerWidth - 120))}px`
    el.style.top = `${Math.max(0, Math.min(g.top, window.innerHeight - 44))}px`
  }, [])

  const remember = () => {
    const r = win.current?.getBoundingClientRect()
    if (!r || full) return
    try {
      window.localStorage.setItem(GEOM, JSON.stringify({ left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }))
    } catch {
      /* окно работает, просто откроется на месте по умолчанию */
    }
  }

  const onHeadDown = (ev) => {
    if (ev.button > 0 || ev.target.closest('button') || full) return
    ev.preventDefault()
    const el = win.current
    const r = el.getBoundingClientRect()
    const dx = ev.clientX - r.left
    const dy = ev.clientY - r.top
    const move = (e) => {
      el.style.left = `${Math.max(0, Math.min(e.clientX - dx, window.innerWidth - el.offsetWidth))}px`
      el.style.top = `${Math.max(0, Math.min(e.clientY - dy, window.innerHeight - 44))}px`
    }
    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      remember()
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  const onDown = (ev) => {
    if (ev.button > 0) return
    ev.preventDefault()
    const pt = toBoard(canvas.current.getBoundingClientRect(), ev.clientX, ev.clientY)
    if (tool === 'text') {
      // где на экране открыть поле ввода — считаем сейчас, по холсту в момент нажатия
      const c = canvas.current
      const k = c.getBoundingClientRect().width / W
      setText({ x: pt[0], y: pt[1], left: c.offsetLeft + pt[0] * k, top: c.offsetTop + pt[1] * k, k })
      return
    }
    canvas.current.setPointerCapture(ev.pointerId)
    live.current = { t: 'stroke', tool, c: color, s: size, p: pt.slice() }
    render()
  }
  const onMove = (ev) => {
    if (!live.current) return
    const rect = canvas.current.getBoundingClientRect()
    const evs = ev.nativeEvent.getCoalescedEvents ? ev.nativeEvent.getCoalescedEvents() : [ev.nativeEvent]
    for (const e of evs.length ? evs : [ev.nativeEvent]) live.current = extend(live.current, toBoard(rect, e.clientX, e.clientY))
    render()
  }
  const onUp = () => {
    const it = live.current
    if (!it) return
    live.current = null
    setBoard((b) => add(b, it))
  }

  const commitText = (value, keep) => {
    const v = (value || '').replace(/\s+$/, '')
    if (keep && v && text) setBoard((b) => add(b, { t: 'text', x: text.x, y: text.y, c: color, s: size, text: v }))
    setText(null)
  }

  const onKey = (e) => {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault()
      setBoard(undo)
    } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault()
      setBoard(redo)
    }
  }

  // PNG с белым фоном доски, а не прозрачным
  const download = () => {
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const o = out.getContext('2d')
    o.fillStyle = '#ffffff'
    o.fillRect(0, 0, W, H)
    const layer = document.createElement('canvas')
    layer.width = W
    layer.height = H
    const l = layer.getContext('2d')
    board.items.forEach((it) => paint(l, it))
    o.drawImage(layer, 0, 0)
    const a = document.createElement('a')
    a.href = out.toDataURL('image/png')
    a.download = `whiteboard-${boardKey}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  useEffect(() => {
    const on = () => {
      setFull(document.fullscreenElement === win.current)
      setTimeout(fit, 50)
    }
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [fit])
  const toggleFull = () => {
    if (document.fullscreenElement === win.current) document.exitFullscreen?.()
    else win.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <div ref={win} className="st-wb" role="dialog" aria-label={t('sat.wb.title')} onKeyDown={onKey} onPointerUp={remember} tabIndex={-1}>
      <div className="st-wb__head" onPointerDown={onHeadDown}>
        <b>{t('sat.wb.title')}</b>
        <span className="st-wb__status">{status}</span>
        <span className="st-spacer" />
        <button type="button" className="ih-round st-wb__btn" onClick={toggleFull} aria-label={t(full ? 'sat.wb.exitFull' : 'sat.wb.full')} title={t(full ? 'sat.wb.exitFull' : 'sat.wb.full')}>
          {full ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </button>
        <button type="button" className="ih-round st-wb__btn" onClick={onClose} aria-label={t('sat.run.close')} title={t('sat.run.close')}><CloseIcon size={18} /></button>
      </div>
      <div className="st-wb__tools">
        <div className="st-wb__group">
          {TOOLS.map(([id, Icon]) => (
            <button key={id} type="button" className="st-wb__tool" aria-pressed={tool === id} title={t(`sat.wb.${id}`)} aria-label={t(`sat.wb.${id}`)} onClick={() => setTool(id)}>
              <Icon size={18} />
            </button>
          ))}
        </div>
        <div className="st-wb__group">
          {COLORS.map((c) => (
            <button key={c} type="button" className="st-wb__swatch" style={{ background: c }} aria-pressed={color === c} aria-label={`${t('sat.wb.color')} ${c}`}
              onClick={() => {
                setColor(c)
                if (tool === 'eraser') setTool('pen')
              }} />
          ))}
        </div>
        <div className="st-wb__group">
          {SIZES.map((s, i) => (
            <button key={s} type="button" className="st-wb__tool" aria-pressed={size === s} aria-label={`${t('sat.wb.size')} ${i + 1}`} title={t('sat.wb.size')} onClick={() => setSize(s)}>
              <i className="st-wb__dot" style={{ width: 4 + i * 4, height: 4 + i * 4 }} />
            </button>
          ))}
        </div>
        <div className="st-wb__group">
          <button type="button" className="st-wb__tool" disabled={!board.items.length} aria-label={t('sat.wb.undo')} title={t('sat.wb.undo')} onClick={() => setBoard(undo)}><UndoIcon /></button>
          <button type="button" className="st-wb__tool" disabled={!board.redo.length} aria-label={t('sat.wb.redo')} title={t('sat.wb.redo')} onClick={() => setBoard(redo)}><RedoIcon /></button>
          <button type="button" className="st-wb__text" disabled={!board.items.length} onClick={() => setAskClear(true)}>{t('sat.wb.clear')}</button>
          <button type="button" className="st-wb__tool" disabled={!board.items.length} aria-label={t('sat.wb.download')} title={t('sat.wb.download')} onClick={download}><DownloadIcon /></button>
        </div>
      </div>
      <div ref={stage} className="st-wb__stage">
        <canvas
          ref={canvas}
          className={`st-wb__canvas is-${tool}`}
          aria-label={t('sat.wb.title')}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {text && (
          <textarea
            className="st-wb__input"
            rows={1}
            autoFocus
            placeholder={t('sat.wb.typeHere')}
            style={{
              left: text.left,
              top: text.top,
              color,
              fontSize: Math.max(12, fontSize(size) * text.k),
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Escape') commitText('', false)
              else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commitText(e.currentTarget.value, true)
              }
            }}
            onBlur={(e) => commitText(e.currentTarget.value, true)}
          />
        )}
      </div>
      <ConfirmDialog
        open={askClear}
        title={t('sat.wb.clearTitle')}
        text={t('sat.wb.clearText')}
        confirmLabel={t('sat.wb.clear')}
        cancelLabel={t('sat.mock.abandonCancel')}
        onConfirm={() => {
          setAskClear(false)
          setBoard(clear)
        }}
        onCancel={() => setAskClear(false)}
      />
    </div>
  )
}

