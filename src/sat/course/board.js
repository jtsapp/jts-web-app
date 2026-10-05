// Доска юнита — порт JTS.whiteboard прототипа (js/modules/whiteboard.js) без DOM: доска — список штрихов и надписей в
// постоянном поле 1600×900, а не пиксели, поэтому она перерисовывается чётко при любом размере окна (ноутбук,
// проектор во весь экран), а отмена — просто снять последний элемент. Под тестами; рисует Whiteboard.jsx.

export const W = 1600
export const H = 900
export const COLORS = ['#1f2937', '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed']
export const SIZES = [3, 6, 12]
const PREFIX = 'jts_sat_board:'

/** Пустая доска: элементы и стек «вернуть». */
export function emptyBoard(items = []) {
  return { items, redo: [] }
}

/** Новый элемент закрывает «вернуть»: история после отмены ветвится, как в любом редакторе. */
export function add(b, item) {
  return { items: [...b.items, item], redo: [] }
}

export function undo(b) {
  if (!b.items.length) return b
  return { items: b.items.slice(0, -1), redo: [...b.redo, b.items[b.items.length - 1]] }
}

export function redo(b) {
  if (!b.redo.length) return b
  return { items: [...b.items, b.redo[b.redo.length - 1]], redo: b.redo.slice(0, -1) }
}

/** Очистка — один отменяемый шаг: промах по кнопке не стирает доску насовсем. */
export function clear(b) {
  if (!b.items.length) return b
  return { items: [], redo: [...b.items].reverse() }
}

export function fontSize(size) {
  return 18 + size * 4
}

/** Точка экрана → точка поля 1600×900 (rect — прямоугольник холста на экране), с точностью 0.1. */
export function toBoard(rect, clientX, clientY) {
  return [
    Math.round(((clientX - rect.left) / rect.width) * W * 10) / 10,
    Math.round(((clientY - rect.top) / rect.height) * H * 10) / 10,
  ]
}

/** Добавить точку в штрих; почти совпадающие (меньше 1.5 по полю) пропускаются — дрожание руки не копит точки. */
export function extend(stroke, pt) {
  const p = stroke.p
  const n = p.length
  if (n >= 2 && Math.abs(pt[0] - p[n - 2]) + Math.abs(pt[1] - p[n - 1]) < 1.5) return stroke
  return { ...stroke, p: [...p, pt[0], pt[1]] }
}

/** Нарисовать элемент на контексте, уже масштабированном к полю 1600×900. */
export function paint(ctx, it) {
  ctx.save()
  if (it.t === 'text') {
    ctx.fillStyle = it.c
    ctx.font = `600 ${fontSize(it.s)}px Manrope, system-ui, sans-serif`
    ctx.textBaseline = 'top'
    String(it.text).split('\n').forEach((line, i) => ctx.fillText(line, it.x, it.y + i * fontSize(it.s) * 1.25))
    ctx.restore()
    return
  }
  const p = it.p
  if (!p || p.length < 2) {
    ctx.restore()
    return
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (it.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = it.s * 4
  } else if (it.tool === 'hl') {
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = it.c
    ctx.lineWidth = it.s * 4
    ctx.lineCap = 'square'
  } else {
    ctx.strokeStyle = it.c
    ctx.lineWidth = it.s
  }
  ctx.beginPath()
  ctx.moveTo(p[0], p[1])
  if (p.length === 2) {
    ctx.lineTo(p[0] + 0.1, p[1] + 0.1) // касание — точка
  } else {
    // сглаживание по серединам: квадратичная кривая через каждую точку, чтобы почерк не выглядел ломаной
    for (let i = 2; i < p.length - 2; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2)
    ctx.lineTo(p[p.length - 2], p[p.length - 1])
  }
  ctx.stroke()
  ctx.restore()
}

/** Доска юнита на устройстве; хранилища нет (приватное окно) — доска работает, просто не вернётся. */
export function loadBoard(key) {
  try {
    const items = JSON.parse(window.localStorage.getItem(PREFIX + key) || '[]')
    return emptyBoard(Array.isArray(items) ? items : [])
  } catch {
    return emptyBoard()
  }
}

export function saveBoard(key, items) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}
