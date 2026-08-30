// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWatchAnnounce } from './useWatchAnnounce.js'

function setup(initial) {
  const sendWatch = vi.fn()
  const view = renderHook((p) => useWatchAnnounce({ ...p, sendWatch }), {
    initialProps: { studentId: null, connected: false, online: false, ...initial },
  })
  return { ...view, sendWatch }
}

describe('useWatchAnnounce — «учитель смотрит ваш экран»', () => {
  // Первый участник выставляется сам при загрузке урока, и его работа сразу
  // видна преподавателю; в уроке один на один кнопку «Смотреть экран» нажимать
  // не на кого. Объявление обязано уйти без клика.
  it('объявляет просмотр, как только появились связь и ученик', () => {
    const { rerender, sendWatch } = setup()
    expect(sendWatch).not.toHaveBeenCalled()

    rerender({ studentId: 10, connected: true, online: true })
    expect(sendWatch).toHaveBeenCalledWith(10, true)
  })

  // publish до CONNECT молча теряется, а цель появляется раньше связи.
  it('без связи не шлёт ничего, но досылает, когда связь появилась', () => {
    const { rerender, sendWatch } = setup({ studentId: 10, online: true })
    expect(sendWatch).not.toHaveBeenCalled()

    rerender({ studentId: 10, connected: true, online: true })
    expect(sendWatch).toHaveBeenCalledWith(10, true)
  })

  // Брокер ничего не хранит: ученик, нажавший F5, подписывается уже после
  // публикации и без повтора не увидит метку до конца урока.
  it('повторяет объявление, когда ученик вернулся в класс', () => {
    const { rerender, sendWatch } = setup({ studentId: 10, connected: true, online: true })
    expect(sendWatch).toHaveBeenCalledTimes(1)

    rerender({ studentId: 10, connected: true, online: false })
    rerender({ studentId: 10, connected: true, online: true })

    expect(sendWatch.mock.calls).toEqual([[10, true], [10, false], [10, true]])
  })

  it('после обрыва связи объявление уходит заново', () => {
    const { rerender, sendWatch } = setup({ studentId: 10, connected: true, online: true })
    rerender({ studentId: 10, connected: false, online: true })
    rerender({ studentId: 10, connected: true, online: true })

    expect(sendWatch.mock.calls.filter(([, on]) => on === true)).toHaveLength(2)
  })

  // Без этого метка «за вами смотрят» осталась бы висеть у того, от кого
  // преподаватель уже ушёл.
  it('переключение на другого ученика снимает метку у прежнего', () => {
    const { rerender, sendWatch } = setup({ studentId: 10, connected: true, online: true })
    sendWatch.mockClear()

    rerender({ studentId: 11, connected: true, online: true })
    expect(sendWatch.mock.calls).toEqual([[10, false], [11, true]])
  })

  // Уход на «Доску» или закрытие урока обнуляют цель.
  it('цель пропала — метка снимается', () => {
    const { rerender, sendWatch } = setup({ studentId: 10, connected: true, online: true })
    sendWatch.mockClear()

    rerender({ studentId: null, connected: true, online: false })
    expect(sendWatch).toHaveBeenCalledWith(10, false)
  })

  // Выход с урока шлёт «перестал смотреть» явно: клинап на размонтировании уже
  // не успевает, сокет закрывается раньше. Ссылку для этого отдаёт хук.
  it('отдаёт того, кому объявили, — для явного снятия при выходе', () => {
    const { result, rerender } = setup({ studentId: 10, connected: true, online: true })
    expect(result.current.current).toBe(10)

    rerender({ studentId: null, connected: true, online: false })
    expect(result.current.current).toBeNull()
  })
})
