import { useCallback, useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { useI18n } from '../../i18n.jsx'
import { getBoardObjects, getBoardSettings, updateBoardSettings } from '../../api.js'
import { useLessonBoard } from './useLessonBoard.js'

// Live collaborative whiteboard for one lesson. Wire-compatible with web-admin's
// lesson-workspace board: objects carry a custom `id`, are serialized as
// `obj.toObject(['id'])`, and travel over the same STOMP topics (see useLessonBoard).
// A teacher drawing in web-admin and a student here edit the SAME board.
//
// Fabric fires object:added / object:modified for BOTH local edits and our own
// programmatic hydration/remote-apply. `applyingRemote` gates the publish side so
// remote changes are never re-broadcast, and the hook already drops our echoes.

const TOOLS = ['select', 'pen', 'rect', 'ellipse', 'text']
const CURSOR_TTL_MS = 4000

function serialize(obj) {
  return JSON.stringify(obj.toObject(['id']))
}

export default function LiveBoard({ lessonId, token, selfUserId, isStaff }) {
  const { t } = useI18n()
  const stageRef = useRef(null)
  const canvasElRef = useRef(null)
  const canvasRef = useRef(null)
  const applyingRemoteRef = useRef(false)
  const undoRef = useRef([])
  const redoRef = useRef([])
  const cursorTimersRef = useRef(new Map())
  const lastCursorSentRef = useRef(0)

  const [tool, setTool] = useState('pen')
  const [hasSelection, setHasSelection] = useState(false)
  const [settings, setSettings] = useState({ drawingDisabled: false, cursorsHidden: false })
  const [cursors, setCursors] = useState({}) // userId -> { name, x, y }
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const toolRef = useRef(tool)
  useEffect(() => { toolRef.current = tool }, [tool])
  // A student may be blocked from drawing by the teacher; staff always draw.
  const drawingBlocked = !isStaff && settings.drawingDisabled

  // ── realtime transport ──────────────────────────────────────────────────
  const { connected, sendAdd, sendUpdate, sendRemove, sendClear, sendCursor } = useLessonBoard(
    lessonId,
    token,
    selfUserId,
    {
      onBoardEvent: (evt) => applyRemoteBoardEvent(evt),
      onCursor: (evt) => showRemoteCursor(evt),
      onSettings: (s) => setSettings({ drawingDisabled: !!s.drawingDisabled, cursorsHidden: !!s.cursorsHidden }),
    },
  )

  const refreshUndoState = useCallback(() => {
    setCanUndo(undoRef.current.length > 0)
    setCanRedo(redoRef.current.length > 0)
  }, [])

  // ── remote apply (echoes already filtered by the hook) ─────────────────────
  const removeById = useCallback((objectId) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const existing = canvas.getObjects().find((o) => o.id === objectId)
    if (existing) canvas.remove(existing)
  }, [])

  const addRemote = useCallback(async (objectId, json) => {
    const canvas = canvasRef.current
    if (!canvas || !json) return
    const [obj] = await fabric.util.enlivenObjects([JSON.parse(json)])
    if (!obj) return
    obj.id = objectId
    applyingRemoteRef.current = true
    canvas.add(obj)
    applyingRemoteRef.current = false
    canvas.requestRenderAll()
  }, [])

  const applyRemoteBoardEvent = useCallback((evt) => {
    const canvas = canvasRef.current
    if (!canvas) return
    switch (evt.eventType) {
      case 'ADD':
      case 'UPDATE':
        if (!evt.objectId || !evt.json) return
        removeById(evt.objectId)
        addRemote(evt.objectId, evt.json)
        break
      case 'REMOVE':
        if (evt.objectId) { removeById(evt.objectId); canvas.requestRenderAll() }
        break
      case 'CLEAR':
        applyingRemoteRef.current = true
        canvas.clear()
        applyingRemoteRef.current = false
        canvas.requestRenderAll()
        break
      default:
        break
    }
  }, [removeById, addRemote])

  const showRemoteCursor = useCallback((evt) => {
    const { userId, name, x, y } = evt
    setCursors((prev) => ({ ...prev, [userId]: { name, x, y } }))
    const timers = cursorTimersRef.current
    if (timers.has(userId)) clearTimeout(timers.get(userId))
    timers.set(userId, setTimeout(() => {
      setCursors((prev) => { const next = { ...prev }; delete next[userId]; return next })
      timers.delete(userId)
    }, CURSOR_TTL_MS))
  }, [])

  // ── canvas lifecycle: create, hydrate, wire local edits ────────────────────
  useEffect(() => {
    // Размер холста берём от .board__stage, а не от жёстких 1200×680 -
    // иначе доска остаётся мелкой в углу широкой .live--wide вёрстки, пока
    // сам материал урока (.lw-material-frame) занимает всю колонку.
    const stageRect = stageRef.current?.getBoundingClientRect()
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: Math.max(stageRect?.width ?? 0, 600),
      height: Math.max(stageRect?.height ?? 0, 480),
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    })
    canvasRef.current = canvas
    const cursorTimers = cursorTimersRef.current

    const publishLocalAdd = (obj) => {
      if (applyingRemoteRef.current) return
      if (!obj.id) obj.id = crypto.randomUUID()
      const json = serialize(obj)
      sendAdd(obj.id, obj.type ?? 'object', json)
      undoRef.current.push({ kind: 'add', id: obj.id, type: obj.type ?? 'object', json })
      redoRef.current = []
      refreshUndoState()
    }
    const publishLocalModify = (obj) => {
      if (applyingRemoteRef.current || !obj?.id) return
      const json = serialize(obj)
      sendUpdate(obj.id, obj.type ?? 'object', json)
    }

    canvas.on('path:created', (e) => { if (e.path) publishLocalAdd(e.path) })
    canvas.on('object:modified', (e) => { if (e.target) publishLocalModify(e.target) })
    canvas.on('mouse:move', (opt) => {
      const now = Date.now()
      if (now - lastCursorSentRef.current < 60) return // ~16fps throttle
      lastCursorSentRef.current = now
      const p = canvas.getScenePoint ? canvas.getScenePoint(opt.e) : canvas.getPointer(opt.e)
      sendCursor(Math.round(p.x), Math.round(p.y), toolRef.current)
    })

    // Shape drawing (rect/ellipse) via drag; text placed on click.
    let drawing = null
    canvas.on('mouse:down', (opt) => {
      const active = toolRef.current
      if (canvas.isDrawingMode || active === 'select') return
      const p = canvas.getScenePoint ? canvas.getScenePoint(opt.e) : canvas.getPointer(opt.e)
      if (active === 'text') {
        const it = new fabric.IText(t('board.textPlaceholder'), { left: p.x, top: p.y, fontSize: 22, fill: '#111827' })
        it.id = crypto.randomUUID()
        canvas.add(it)
        canvas.setActiveObject(it)
        publishLocalAdd(it)
        return
      }
      const common = { left: p.x, top: p.y, fill: 'transparent', stroke: '#2563eb', strokeWidth: 2, originX: 'left', originY: 'top' }
      drawing = active === 'rect'
        ? new fabric.Rect({ ...common, width: 1, height: 1 })
        : new fabric.Ellipse({ ...common, rx: 1, ry: 1 })
      drawing.startX = p.x
      drawing.startY = p.y
      applyingRemoteRef.current = true
      canvas.add(drawing)
      applyingRemoteRef.current = false
    })
    canvas.on('mouse:move', (opt) => {
      if (!drawing) return
      const p = canvas.getScenePoint ? canvas.getScenePoint(opt.e) : canvas.getPointer(opt.e)
      const w = Math.abs(p.x - drawing.startX)
      const h = Math.abs(p.y - drawing.startY)
      drawing.set({ left: Math.min(p.x, drawing.startX), top: Math.min(p.y, drawing.startY) })
      if (drawing.type === 'rect') drawing.set({ width: w, height: h })
      else drawing.set({ rx: w / 2, ry: h / 2 })
      canvas.requestRenderAll()
    })
    canvas.on('mouse:up', () => {
      if (!drawing) return
      const shape = drawing
      drawing = null
      if ((shape.width ?? shape.rx * 2) < 3 && (shape.height ?? shape.ry * 2) < 3) { canvas.remove(shape); return }
      shape.setCoords()
      publishLocalAdd(shape)
    })

    // Hydrate from REST, then load persisted settings.
    getBoardObjects(token, lessonId)
      .then(async (objs) => {
        for (const o of objs || []) { if (o?.json) await addRemote(o.objectId, o.json) }
        canvas.requestRenderAll()
      })
      .catch(() => {})
    getBoardSettings(token, lessonId)
      .then((s) => { if (s) setSettings({ drawingDisabled: !!s.drawingDisabled, cursorsHidden: !!s.cursorsHidden }) })
      .catch(() => {})

    return () => {
      cursorTimers.forEach((id) => clearTimeout(id))
      cursorTimers.clear()
      canvas.dispose()
      canvasRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, token])

  // Есть ли что удалять. «Удалить» работает по выделенным объектам, а выделять
  // умеет только «Курсор» — с активным пером кнопка выглядела рабочей и молча
  // ничего не делала (§0.6 спеки: неработающих кнопок на экране нет).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const sync = () => setHasSelection(canvas.getActiveObjects().length > 0)
    canvas.on('selection:created', sync)
    canvas.on('selection:updated', sync)
    canvas.on('selection:cleared', sync)
    sync()
    return () => {
      // Холст мог быть уже освобождён: cleanup эффекта, который его создаёт,
      // объявлен выше и выполняется раньше — снимать обработчики с
      // disposed-канваса незачем.
      if (canvasRef.current !== canvas) return
      canvas.off('selection:created', sync)
      canvas.off('selection:updated', sync)
      canvas.off('selection:cleared', sync)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, token])

  // ── reflect tool + drawing restrictions onto the canvas ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const penActive = tool === 'pen' && !drawingBlocked
    canvas.isDrawingMode = penActive
    if (penActive) {
      const brush = new fabric.PencilBrush(canvas)
      brush.width = 3
      brush.color = '#111827'
      canvas.freeDrawingBrush = brush
    }
    // When drawing is blocked for a student, lock selection/manipulation too.
    canvas.selection = !drawingBlocked && tool === 'select'
    canvas.forEachObject((o) => { o.selectable = !drawingBlocked && tool === 'select'; o.evented = !drawingBlocked })
    // Уходя с «Курсора», снимаем выделение сами: fabric оставил бы рамку на
    // объекте, которым уже нельзя управлять.
    if (tool !== 'select') {
      canvas.discardActiveObject()
      setHasSelection(false)
    }
    canvas.requestRenderAll()
  }, [tool, drawingBlocked])

  // ── toolbar actions ────────────────────────────────────────────────────────
  function deleteSelected() {
    const canvas = canvasRef.current
    if (!canvas) return
    const active = canvas.getActiveObjects()
    active.forEach((obj) => {
      if (obj.id) {
        sendRemove(obj.id)
        undoRef.current.push({ kind: 'remove', id: obj.id, type: obj.type ?? 'object', json: serialize(obj) })
      }
      canvas.remove(obj)
    })
    canvas.discardActiveObject()
    setHasSelection(false)
    canvas.requestRenderAll()
    redoRef.current = []
    refreshUndoState()
  }

  function clearBoard() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    canvas.requestRenderAll()
    sendClear()
    undoRef.current = []
    redoRef.current = []
    refreshUndoState()
  }

  async function undo() {
    const op = undoRef.current.pop()
    const canvas = canvasRef.current
    if (!op || !canvas) return
    if (op.kind === 'add') { removeById(op.id); sendRemove(op.id); redoRef.current.push(op) }
    else if (op.kind === 'remove') { await addRemote(op.id, op.json); sendAdd(op.id, op.type, op.json); redoRef.current.push(op) }
    canvas.requestRenderAll()
    refreshUndoState()
  }

  async function redo() {
    const op = redoRef.current.pop()
    const canvas = canvasRef.current
    if (!op || !canvas) return
    if (op.kind === 'add') { await addRemote(op.id, op.json); sendAdd(op.id, op.type, op.json); undoRef.current.push(op) }
    else if (op.kind === 'remove') { removeById(op.id); sendRemove(op.id); undoRef.current.push(op) }
    canvas.requestRenderAll()
    refreshUndoState()
  }

  function toggleSetting(key) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    updateBoardSettings(token, lessonId, { [key]: next[key] }).catch(() => setSettings(settings))
  }

  return (
    <section className="board" aria-label={t('board.title')}>
      <div className="board__toolbar" role="toolbar" aria-label={t('board.title')}>
        {TOOLS.map((tl) => (
          <button
            key={tl}
            type="button"
            className={`board__tool${tool === tl ? ' is-active' : ''}`}
            aria-pressed={tool === tl}
            disabled={drawingBlocked && tl !== 'select'}
            onClick={() => setTool(tl)}
          >
            {t(`board.tool.${tl}`)}
          </button>
        ))}
        <span className="board__sep" aria-hidden="true" />
        <button
          type="button"
          className="board__tool"
          onClick={deleteSelected}
          disabled={drawingBlocked || !hasSelection}
          title={hasSelection ? undefined : t('board.deleteHint')}
        >
          {t('board.delete')}
        </button>
        <button type="button" className="board__tool" onClick={undo} disabled={!canUndo}>{t('board.undo')}</button>
        <button type="button" className="board__tool" onClick={redo} disabled={!canRedo}>{t('board.redo')}</button>
        {isStaff && <button type="button" className="board__tool board__tool--danger" onClick={clearBoard}>{t('board.clear')}</button>}
        <span className="board__spacer" />
        {isStaff && (
          <>
            <label className="board__toggle">
              <input type="checkbox" checked={settings.drawingDisabled} onChange={() => toggleSetting('drawingDisabled')} />
              {t('board.lockStudents')}
            </label>
            <label className="board__toggle">
              <input type="checkbox" checked={settings.cursorsHidden} onChange={() => toggleSetting('cursorsHidden')} />
              {t('board.hideCursors')}
            </label>
          </>
        )}
        <span className={`board__conn${connected ? ' is-on' : ''}`}>{connected ? t('live.connected') : t('live.disconnected')}</span>
      </div>

      {drawingBlocked && <p className="board__notice">{t('board.locked')}</p>}

      <div className="board__stage" ref={stageRef}>
        <canvas ref={canvasElRef} className="board__canvas" />
        {!settings.cursorsHidden && Object.entries(cursors).map(([userId, c]) => (
          <span key={userId} className="board__cursor" style={{ left: c.x, top: c.y }}>
            <span className="board__cursor-dot" aria-hidden="true" />
            <span className="board__cursor-name">{c.name || `#${userId}`}</span>
          </span>
        ))}
      </div>
    </section>
  )
}
