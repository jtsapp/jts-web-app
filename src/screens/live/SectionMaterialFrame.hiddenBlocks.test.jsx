// @vitest-environment jsdom
//
// Скрытие вживую (задача 8 плана 12): преподаватель прячет задание/блок PATCH'ом
// .../visibility, а сервер вшивает CSS для этого только при рендере файла — уже
// открытая рамка ученика ничего не знает до следующей полной перезагрузки.
// setHiddenKeys — новый метод рамки, которым LiveLessonPage догоняет её без
// перезагрузки, когда список скрытого меняется (см. LiveLessonPage.jsx).
import { describe, it, expect, vi } from 'vitest'
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

describe('SectionMaterialFrame — скрытие вживую', () => {
  // Мост здесь тот же, что у replay/mirror/request-snapshot — 'jts-bridge-host',
  // а не 'jts-workspace' у gotoStage (тот говорит с движком урока напрямую, а не
  // с мостом).
  it('setHiddenKeys шлёт рамке hidden-blocks от имени моста', () => {
    const { ref, iframe } = renderFrame()
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
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => {
      ref.current.setHiddenKeys([])
    })
    expect(post).toHaveBeenCalledWith(
      { source: 'jts-bridge-host', type: 'hidden-blocks', keys: [] },
      '*'
    )
  })
})
