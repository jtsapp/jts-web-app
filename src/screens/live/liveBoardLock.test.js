import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Запрет рисования читается внутри обработчиков холста, а они навешиваются один
// раз при создании: через состояние они видели бы значение на момент подписки.
// Проверяем сам контракт — что проверка стоит в mouse:down и берёт ref, а не
// переменную из замыкания. Полноценно поднять fabric в jsdom здесь нечем.
const src = readFileSync(new URL('./LiveBoard.jsx', import.meta.url), 'utf8')

describe('LiveBoard — запрет рисования', () => {
  it('mouse:down выходит сразу, когда рисование запрещено', () => {
    const handler = src.slice(src.indexOf("canvas.on('mouse:down'"))
    const body = handler.slice(0, handler.indexOf("canvas.on('mouse:move'") + 1)
    expect(body).toContain('if (drawingBlockedRef.current) return')
    // Проверка обязана стоять ДО ветки фигур, иначе клик всё равно ставит эллипс.
    expect(body.indexOf('drawingBlockedRef.current')).toBeLessThan(body.indexOf("active === 'rect'"))
  })

  it('значение запрета переносится в ref, а не читается из замыкания', () => {
    expect(src).toContain('drawingBlockedRef.current = drawingBlocked')
  })
})
