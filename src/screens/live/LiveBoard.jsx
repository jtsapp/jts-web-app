import { useCallback, useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { useI18n } from '../../i18n.jsx'
import {
  CursorIcon, HandIcon, FitIcon, PenIcon, RectIcon, EllipseIcon, TextToolIcon, UndoIcon, RedoIcon, TrashIcon, ImageIcon,
} from '../../components/icons.jsx'
import { getBoardObjects, getBoardSettings, updateBoardSettings, uploadMedia } from '../../api.js'
import { useLessonBoard } from './useLessonBoard.js'
import {
  boundsOfRects, clampView, fitView, scrollMetrics, viewFromThumb, wheelAction, zoomAround,
} from './boardViewport.js'

// Live collaborative whiteboard for one lesson. Wire-compatible with web-admin's
// lesson-workspace board: objects carry a custom `id`, are serialized as
// `obj.toObject(['id'])`, and travel over the same STOMP topics (see useLessonBoard).
// A teacher drawing in web-admin and a student here edit the SAME board.
//
// Fabric fires object:added / object:modified for BOTH local edits and our own
// programmatic hydration/remote-apply. `applyingRemote` gates the publish side so
// remote changes are never re-broadcast, and the hook already drops our echoes.

// Инструмент — значок с подписью в подсказке, а не слово на кнопке. Словами
// панель занимала всю ширину доски и переносилась на второй ряд, а у
// преподавателя на том же уроке стоят значки: «у студентов вместо фигур
// подписи текстом» — про это.
const TOOLS = [
  { key: 'select', Icon: CursorIcon },
  { key: 'hand', Icon: HandIcon },
  { key: 'pen', Icon: PenIcon },
  { key: 'rect', Icon: RectIcon },
  { key: 'ellipse', Icon: EllipseIcon },
  { key: 'text', Icon: TextToolIcon },
]
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
  const [imageBusy, setImageBusy] = useState(false)
  const fileInputRef = useRef(null)
  const [hasSelection, setHasSelection] = useState(false)
  const [settings, setSettings] = useState({ drawingDisabled: false, cursorsHidden: false })
  const [cursors, setCursors] = useState({}) // userId -> { name, x, y }
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  // Вид листа: масштаб и сдвиг (viewportTransform) и полосы прокрутки. Лист бесконечный —
  // всё, что преподаватель написал ниже и правее, достижимо прокруткой (boardViewport.js).
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 })
  const [scroll, setScroll] = useState({ horizontal: { start: 0, size: 1 }, vertical: { start: 0, size: 1 } })
  const viewApiRef = useRef(null)
  const trackVRef = useRef(null)
  const trackHRef = useRef(null)

  // Перетаскивание листа, зажатый пробел и курсор живут в обработчиках холста, а они навешены
  // один раз — состояние они видели бы устаревшим (см. drawingBlockedRef ниже).
  const panRef = useRef(null)
  const spaceDownRef = useRef(false)
  const cursorRef = useRef(null)
  const toolRef = useRef(tool)
  useEffect(() => { toolRef.current = tool }, [tool])
  // Запрет рисования читается ВНУТРИ обработчиков холста, а они навешиваются
  // один раз при создании — через состояние они видели бы его значение на
  // момент подписки. Отсюда и «преподаватель запретил, а студент всё равно
  // рисует».
  const drawingBlockedRef = useRef(false)
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
    //
    // Нижнего порога в 600×480 здесь больше нет: на планшете и телефоне он
    // делал холст ШИРЕ экрана, и доска не помещалась целиком — приходилось
    // возить её вбок. Запасные 600×480 остаются только на случай, когда
    // измерять ещё нечего (панель скрыта в момент создания).
    // Меряем ВНУТРЕННИЙ бокс сцены (clientWidth/clientHeight), а не
    // getBoundingClientRect(): у .board__stage есть рамка, и на её толщину
    // холст выходил шире контейнера с overflow: auto — сцена прокручивалась
    // вбок уже на первом кадре. ResizeObserver ниже отдаёт contentRect, то
    // есть тоже внутренний бокс: оба места обязаны мерить одно и то же,
    // иначе размер молча меняется сразу после создания.
    const stage = stageRef.current
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: stage?.clientWidth || 600,
      height: stage?.clientHeight || 480,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    })
    canvasRef.current = canvas

    // ── вид листа: масштаб, сдвиг, прокрутка ─────────────────────────────────
    const sceneBounds = () => boundsOfRects(canvas.getObjects().map((o) => o.getBoundingRect()))
    const readView = () => {
      const v = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
      return { zoom: v[0], tx: v[4], ty: v[5] }
    }
    const syncChrome = (bounds = sceneBounds()) => {
      const v = readView()
      setView(v)
      setScroll(scrollMetrics(v, bounds, canvas.getWidth(), canvas.getHeight()))
    }
    const applyView = (next) => {
      const bounds = sceneBounds()
      const v = clampView(next, bounds, canvas.getWidth(), canvas.getHeight())
      canvas.setViewportTransform([v.zoom, 0, 0, v.zoom, v.tx, v.ty])
      canvas.requestRenderAll()
      syncChrome(bounds)
    }
    const viewApi = { readView, setView: applyView, bounds: sceneBounds }
    viewApiRef.current = viewApi

    // Содержимое поменялось — полосы пересчитываем раз в кадр, а не на каждое событие fabric.
    let chromeFrame = 0
    const scheduleChrome = () => {
      if (chromeFrame || typeof requestAnimationFrame !== 'function') return
      chromeFrame = requestAnimationFrame(() => { chromeFrame = 0; syncChrome() })
    }
    canvas.on('object:added', scheduleChrome)
    canvas.on('object:removed', scheduleChrome)
    canvas.on('object:modified', scheduleChrome)
    canvas.on('canvas:cleared', scheduleChrome)

    // Левая кнопка двигает доску: «Рука», зажатый пробел, или рисование запрещено (ученику
    // остаётся только смотреть). Колесо — всегда. Средняя кнопка — всегда.
    // Вешаем на сцену в фазе перехвата: так нажатие до fabric не доходит, и он не начинает ни
    // выделение, ни штрих.
    const stageEl = stageRef.current
    let panCleanup = null
    let hovering = false
    const pansOnLeft = () => toolRef.current === 'hand' || spaceDownRef.current || drawingBlockedRef.current
    const applyCursor = () => {
      const cursor = panRef.current ? 'grabbing' : pansOnLeft() ? 'grab' : 'default'
      canvas.defaultCursor = cursor
      canvas.setCursor?.(cursor)
    }
    cursorRef.current = applyCursor
    const beginPan = (x, y) => {
      const v = readView()
      panCleanup?.()
      panRef.current = { x, y, tx: v.tx, ty: v.ty }
      applyCursor()
    }
    const movePan = (x, y) => {
      const pan = panRef.current
      if (!pan) return
      applyView({ zoom: readView().zoom, tx: pan.tx + (x - pan.x), ty: pan.ty + (y - pan.y) })
    }
    const endPan = () => {
      panCleanup?.()
      panCleanup = null
      panRef.current = null
      applyCursor()
    }
    const onMouseDownCapture = (e) => {
      const middle = e.button === 1
      if (!middle && !(e.button === 0 && pansOnLeft())) return
      if (e.target?.closest?.('.board__scroll')) return // полосы прокрутки — свои
      e.preventDefault()
      e.stopPropagation()
      beginPan(e.clientX, e.clientY)
      const move = (ev) => movePan(ev.clientX, ev.clientY)
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', endPan)
      panCleanup = () => {
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', endPan)
      }
    }
    const onTouchStartCapture = (e) => {
      if (e.touches.length !== 1 || !pansOnLeft()) return
      if (e.target?.closest?.('.board__scroll')) return
      e.preventDefault()
      e.stopPropagation()
      beginPan(e.touches[0].clientX, e.touches[0].clientY)
      const move = (ev) => {
        const point = ev.touches[0]
        if (!point) return
        ev.preventDefault()
        movePan(point.clientX, point.clientY)
      }
      window.addEventListener('touchmove', move, { passive: false })
      window.addEventListener('touchend', endPan)
      window.addEventListener('touchcancel', endPan)
      panCleanup = () => {
        window.removeEventListener('touchmove', move)
        window.removeEventListener('touchend', endPan)
        window.removeEventListener('touchcancel', endPan)
      }
    }
    const onWheel = (e) => {
      e.preventDefault()
      const v = readView()
      const action = wheelAction(e)
      if (action.kind === 'zoom') {
        const rect = stageEl.getBoundingClientRect()
        applyView(zoomAround(v, v.zoom * action.factor, e.clientX - rect.left - (stageEl.clientLeft || 0), e.clientY - rect.top - (stageEl.clientTop || 0)))
      } else {
        applyView({ zoom: v.zoom, tx: v.tx + action.dx, ty: v.ty + action.dy })
      }
    }
    // Пробел — временная «Рука», как в графических редакторах. Только пока курсор над доской и
    // не в поле ввода: иначе пробел перестал бы прокручивать страницу и печататься в чате.
    // Кнопка панели полем ввода не считается: после выбора инструмента фокус остаётся на ней, и
    // пробел «не работал бы» ровно тогда, когда его ждут. Зато пробел на кнопке нажимает её при
    // отпускании — это мы гасим (swallowKeyUp), иначе «Рука» заодно нажала бы «Удалить».
    const textEntry = (el) => !!el?.closest?.('input, textarea, select, [contenteditable="true"]')
    let swallowKeyUp = false
    const onKeyDown = (e) => {
      if (e.key !== ' ' || !hovering || textEntry(e.target)) return
      e.preventDefault()
      swallowKeyUp = true
      spaceDownRef.current = true
      applyCursor()
    }
    const releaseSpace = () => {
      if (!spaceDownRef.current) return
      spaceDownRef.current = false
      applyCursor()
    }
    const onKeyUp = (e) => {
      if (e.key !== ' ') return
      if (swallowKeyUp) { e.preventDefault(); swallowKeyUp = false }
      releaseSpace()
    }
    const onEnter = () => { hovering = true }
    const onLeave = () => { hovering = false; releaseSpace() }
    if (stageEl) {
      stageEl.addEventListener('wheel', onWheel, { passive: false })
      stageEl.addEventListener('mousedown', onMouseDownCapture, true)
      stageEl.addEventListener('touchstart', onTouchStartCapture, { capture: true, passive: false })
      stageEl.addEventListener('mouseenter', onEnter)
      stageEl.addEventListener('mouseleave', onLeave)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseSpace)

    // Доска подстраивается под экран и потом: поворот планшета, сворачивание
    // панели, открытие вкладки «Доска» уже после входа в урок. Раньше размер
    // брался один раз при создании — открытая скрытой, доска оставалась
    // 600×480 навсегда.
    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect
        if (!box?.width || !box?.height) return
        // Вниз, а не к ближайшему: дробную ширину округление вверх делало
        // больше контейнера, и после поворота холст вылезал за сцену с
        // overflow: auto — вместо чистой перерисовки появлялась прокрутка.
        canvas.setDimensions({ width: Math.floor(box.width), height: Math.floor(box.height) })
        // Окно стало другим — вид надо вернуть в допустимые пределы и пересчитать полосы.
        viewApi.setView(viewApi.readView())
        canvas.requestRenderAll()
      })
      resizeObserver.observe(stageRef.current)
    }

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
      // Рисование запрещено — не создаём НИЧЕГО. Раньше проверки здесь не было
      // вовсе: перо гасилось (isDrawingMode = false), но клик проваливался в
      // ветку фигур, и каждое нажатие ставило эллипс — ровно то, что видно на
      // доске при включённом запрете.
      if (drawingBlockedRef.current) return
      if (canvas.isDrawingMode || active === 'select') return
      const p = canvas.getScenePoint ? canvas.getScenePoint(opt.e) : canvas.getPointer(opt.e)
      if (active === 'hand') return // «Рука» двигает лист, ничего не создаёт
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
        syncChrome()
      })
      .catch(() => {})
    getBoardSettings(token, lessonId)
      .then((s) => { if (s) setSettings({ drawingDisabled: !!s.drawingDisabled, cursorsHidden: !!s.cursorsHidden }) })
      .catch(() => {})

    return () => {
      resizeObserver?.disconnect()
      if (chromeFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(chromeFrame)
      panCleanup?.()
      if (stageEl) {
        stageEl.removeEventListener('wheel', onWheel)
        stageEl.removeEventListener('mousedown', onMouseDownCapture, true)
        stageEl.removeEventListener('touchstart', onTouchStartCapture, true)
        stageEl.removeEventListener('mouseenter', onEnter)
        stageEl.removeEventListener('mouseleave', onLeave)
      }
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseSpace)
      viewApiRef.current = null
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
    drawingBlockedRef.current = drawingBlocked
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
    canvas.skipTargetFind = tool === 'hand' || drawingBlocked
    canvas.forEachObject((o) => { o.selectable = !drawingBlocked && tool === 'select'; o.evented = !drawingBlocked })
    // Уходя с «Курсора», снимаем выделение сами: fabric оставил бы рамку на
    // объекте, которым уже нельзя управлять.
    if (tool !== 'select') {
      canvas.discardActiveObject()
      setHasSelection(false)
    }
    cursorRef.current?.()
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

  /**
   * Фото на доску.
   *
   * Картинка уезжает в хранилище и ложится на холст объектом со ссылкой: доска
   * синхронизируется JSON'ом объектов, и все получают ту же ссылку, а не байты
   * через сокет — снимок с телефона иначе забил бы канал урока.
   */
  async function onPickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || drawingBlocked) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 20 * 1024 * 1024) return
    setImageBusy(true)
    try {
      const { url } = await uploadMedia(token, file)
      const canvas = canvasRef.current
      if (!url || !canvas) return
      // crossOrigin — иначе холст «пачкается» и перестаёт отдавать снимок доски.
      const image = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      // Вписываем в часть холста: снимок иначе накрывает доску целиком, и то,
      // что на ней уже нарисовано, становится не найти.
      // Размер и центр — в координатах листа: окно может быть сдвинуто и уменьшено, а фото
      // должно лечь туда, куда сейчас смотрят.
      const zoom = canvas.getZoom?.() || 1
      const center = canvas.getVpCenter ? canvas.getVpCenter() : { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }
      const limit = (Math.min(canvas.getWidth(), canvas.getHeight()) / zoom) * 0.6
      const scale = Math.min(1, limit / Math.max(image.width || 1, image.height || 1))
      image.set({
        left: center.x - ((image.width || 0) * scale) / 2,
        top: center.y - ((image.height || 0) * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      })
      canvas.add(image)
      canvas.setActiveObject(image)
      canvas.requestRenderAll()
    } catch {
      /* не загрузилось — доска остаётся как была */
    } finally {
      setImageBusy(false)
    }
  }

  // ── масштаб и прокрутка из панели ──────────────────────────────────────────
  function zoomBy(factor) {
    const api = viewApiRef.current
    const canvas = canvasRef.current
    if (!api || !canvas) return
    const v = api.readView()
    api.setView(zoomAround(v, v.zoom * factor, canvas.getWidth() / 2, canvas.getHeight() / 2))
  }

  function resetZoom() {
    const api = viewApiRef.current
    const canvas = canvasRef.current
    if (!api || !canvas) return
    api.setView(zoomAround(api.readView(), 1, canvas.getWidth() / 2, canvas.getHeight() / 2))
  }

  // «Показать всё»: весь написанный лист целиком в окне — для тех, кто не знает, куда прокрутить.
  function fitAll() {
    const api = viewApiRef.current
    const canvas = canvasRef.current
    if (!api || !canvas) return
    api.setView(fitView(api.bounds(), canvas.getWidth(), canvas.getHeight()))
  }

  function startThumbDrag(e, axis, track) {
    const api = viewApiRef.current
    const canvas = canvasRef.current
    if (!api || !canvas || !track) return
    e.preventDefault()
    e.stopPropagation()
    const horizontal = axis === 'horizontal'
    const startPointer = horizontal ? e.clientX : e.clientY
    const trackLength = Math.max(horizontal ? track.clientWidth : track.clientHeight, 1)
    const startFraction = scroll[axis].start
    const bounds = api.bounds()
    const move = (ev) => {
      const delta = (horizontal ? ev.clientX : ev.clientY) - startPointer
      api.setView(viewFromThumb(
        axis, startFraction + delta / trackLength, api.readView(), bounds, canvas.getWidth(), canvas.getHeight()))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <section className="board" aria-label={t('board.title')}>
      <div className="board__toolbar" role="toolbar" aria-label={t('board.title')}>
        {TOOLS.map(({ key, Icon }) => (
          <button
            key={key}
            type="button"
            className={`board__tool board__tool--icon${tool === key ? ' is-active' : ''}`}
            aria-pressed={tool === key}
            aria-label={t(`board.tool.${key}`)}
            title={t(`board.tool.${key}`)}
            disabled={drawingBlocked && key !== 'select' && key !== 'hand'}
            onClick={() => setTool(key)}
          >
            <Icon />
          </button>
        ))}
        <button
          type="button"
          className="board__tool board__tool--icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={drawingBlocked || imageBusy}
          aria-label={t('board.image')}
          title={t('board.image')}
        >
          <ImageIcon />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        <span className="board__sep" aria-hidden="true" />
        <button
          type="button"
          className="board__tool board__tool--icon"
          onClick={deleteSelected}
          disabled={drawingBlocked || !hasSelection}
          aria-label={t('board.delete')}
          title={hasSelection ? t('board.delete') : t('board.deleteHint')}
        >
          <TrashIcon />
        </button>
        <button type="button" className="board__tool board__tool--icon" onClick={undo} disabled={!canUndo}
                aria-label={t('board.undo')} title={t('board.undo')}><UndoIcon /></button>
        <button type="button" className="board__tool board__tool--icon" onClick={redo} disabled={!canRedo}
                aria-label={t('board.redo')} title={t('board.redo')}><RedoIcon /></button>
        <span className="board__sep" aria-hidden="true" />
        <button type="button" className="board__tool board__tool--icon" onClick={() => zoomBy(1 / 1.1)}
                aria-label={t('board.zoomOut')} title={t('board.zoomOut')}>−</button>
        <button type="button" className="board__zoom" onClick={resetZoom}
                aria-label={t('board.zoomReset')} title={t('board.zoomReset')}>{Math.round(view.zoom * 100)}%</button>
        <button type="button" className="board__tool board__tool--icon" onClick={() => zoomBy(1.1)}
                aria-label={t('board.zoomIn')} title={t('board.zoomIn')}>+</button>
        <button type="button" className="board__tool board__tool--icon" onClick={fitAll}
                aria-label={t('board.zoomFit')} title={t('board.zoomFit')}><FitIcon /></button>
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
          <span key={userId} className="board__cursor" style={{ left: c.x * view.zoom + view.tx, top: c.y * view.zoom + view.ty }}>
            <span className="board__cursor-dot" aria-hidden="true" />
            <span className="board__cursor-name">{c.name || `#${userId}`}</span>
          </span>
        ))}
        {/* Полосы прокрутки: лист бесконечный, и без них не видно, где в нём окно. Они есть и у
            ученика — всё, что преподаватель написал ниже или правее, ему доступно так же. */}
        <div className="board__scroll board__scroll--v" ref={trackVRef} title={t('board.scrollHint')}>
          <div className="board__thumb" onPointerDown={(e) => startThumbDrag(e, 'vertical', trackVRef.current)}
               style={{ top: `${scroll.vertical.start * 100}%`, height: `${scroll.vertical.size * 100}%` }} />
        </div>
        <div className="board__scroll board__scroll--h" ref={trackHRef} title={t('board.scrollHint')}>
          <div className="board__thumb" onPointerDown={(e) => startThumbDrag(e, 'horizontal', trackHRef.current)}
               style={{ left: `${scroll.horizontal.start * 100}%`, width: `${scroll.horizontal.size * 100}%` }} />
        </div>
      </div>
    </section>
  )
}
