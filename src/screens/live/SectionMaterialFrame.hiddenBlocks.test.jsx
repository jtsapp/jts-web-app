// @vitest-environment jsdom
//
// Скрытие вживую (задача 8 плана 12): преподаватель прячет задание/блок PATCH'ом
// .../visibility, а сервер вшивает CSS для этого только при рендере файла — уже
// открытая рамка ученика ничего не знает до следующей полной перезагрузки.
// setHiddenKeys — новый метод рамки, которым LiveLessonPage догоняет её без
// перезагрузки, когда список скрытого меняется (см. LiveLessonPage.jsx).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import SectionMaterialFrame from './SectionMaterialFrame.jsx'

const MATERIAL = { id: 1, materialId: 11, title: 'A0 · Урок 05', materialType: 'INTERACTIVE_HTML', fileUrl: 'https://files/L05.html' }

function renderFrame(props = {}) {
  const ref = createRef()
  const view = render(
    <I18nProvider>
      <SectionMaterialFrame ref={ref} lessonId={14} token="t" material={MATERIAL} isStaff={false} {...props} />
    </I18nProvider>
  )
  return { ...view, ref, iframe: view.container.querySelector('iframe') }
}

// Рамка считается загруженной только после onLoad И тех же 350мс осадки, что
// берёт сам handleLoad перед тем, как разобрать накопленное (см. компонент,
// комментарий про Angular) — без второго шага таймер ещё не сработал.
function loadFrame(iframe) {
  act(() => {
    iframe.dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(350)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SectionMaterialFrame — скрытие вживую', () => {
  // Мост здесь тот же, что у replay/mirror/request-snapshot — 'jts-bridge-host',
  // а не 'jts-workspace' у gotoStage (тот говорит с движком урока напрямую, а не
  // с мостом).
  it('setHiddenKeys шлёт рамке hidden-blocks сразу, когда рамка уже загружена', () => {
    const { ref, iframe } = renderFrame()
    loadFrame(iframe)
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => {
      ref.current.setHiddenKeys(['t1', 'block@5:0'])
    })
    expect(post).toHaveBeenCalledWith(
      { source: 'jts-bridge-host', type: 'hidden-blocks', keys: ['t1', 'block@5:0'] },
      '*'
    )
  })

  // Пустой список — тоже значимое сообщение: «преподаватель всё вернул». Не
  // должно превращаться в отсутствие вызова или в keys: undefined.
  it('пустой список тоже уходит явно', () => {
    const { ref, iframe } = renderFrame()
    loadFrame(iframe)
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => {
      ref.current.setHiddenKeys([])
    })
    expect(post).toHaveBeenCalledWith(
      { source: 'jts-bridge-host', type: 'hidden-blocks', keys: [] },
      '*'
    )
  })

  // Ревью задачи 8: setHiddenKeys раньше слал postMessage безусловно, даже пока
  // рамка ещё грузится, — сообщение уходило туда, где слушателя ещё нет, и
  // терялось без единой ошибки (postMessage не подтверждает доставку). Дальше
  // рамка молча показывала не то, что решил преподаватель, до следующего
  // случайного sections-changed. Чинится так же, как чинили replay: не постим,
  // пока не осела загрузка, а копим и разбираем в handleLoad.
  it('вызов до загрузки не постит немедленно — доезжает после onLoad, как replay', () => {
    const { ref, iframe } = renderFrame()
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    act(() => {
      ref.current.setHiddenKeys(['t1'])
    })
    expect(post).not.toHaveBeenCalled()

    loadFrame(iframe)
    expect(post).toHaveBeenCalledWith(
      { source: 'jts-bridge-host', type: 'hidden-blocks', keys: ['t1'] },
      '*'
    )
  })

  // В отличие от replay, здесь не очередь дискретных событий, а всегда полное
  // желаемое состояние целиком — несколько вызовов до загрузки обязаны
  // схлопнуться в последний, а не накопиться и не уйти первым/всеми разом.
  it('несколько вызовов до загрузки — доезжает только последний набор ключей', () => {
    const { ref, iframe } = renderFrame()
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')

    act(() => {
      ref.current.setHiddenKeys(['t1'])
      ref.current.setHiddenKeys(['t1', 't2'])
      ref.current.setHiddenKeys(['t3'])
    })
    expect(post).not.toHaveBeenCalled()

    loadFrame(iframe)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      { source: 'jts-bridge-host', type: 'hidden-blocks', keys: ['t3'] },
      '*'
    )
  })
})
