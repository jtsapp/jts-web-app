// @vitest-environment jsdom
//
// Рамка файлового урока и стадии: сообщение `stage` от скрипта в файле уходит
// наверх, переход на стадию уходит вниз — тем же контрактом, что у рабочей
// области преподавателя в web-admin (см. lessonStages.js).
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

function message(data) {
  return act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data }))
  })
}

describe('SectionMaterialFrame — стадии файлового урока', () => {
  it('сообщение stage от рамки уходит наверх как {index, total}', async () => {
    const onStage = vi.fn()
    renderFrame({ onStage })
    await message({ source: 'jts-lesson', type: 'stage', index: 3, total: 7 })
    expect(onStage).toHaveBeenCalledWith({ index: 3, total: 7 })
  })

  it('за стадию не принимаются чужие сообщения, а мост работает как раньше', async () => {
    const onStage = vi.fn()
    const onMirror = vi.fn()
    renderFrame({ onStage, onMirror })
    await message({ source: 'jts-bridge', type: 'mirror', selector: '#a', eventType: 'click' })
    await message({ source: 'jts-lesson', type: 'stage', index: 'x' })
    expect(onStage).not.toHaveBeenCalled()
    // Зеркало ученика дошло: ветка стадий стоит перед мостом и не глотает его.
    expect(onMirror).toHaveBeenCalledWith({ selector: '#a', eventType: 'click', value: null })
  })

  it('gotoStage шлёт рамке goto-stage от имени рабочей области', () => {
    const { ref, iframe } = renderFrame()
    const post = vi.spyOn(iframe.contentWindow, 'postMessage')
    act(() => {
      ref.current.gotoStage(4)
    })
    expect(post).toHaveBeenCalledWith({ source: 'jts-workspace', type: 'goto-stage', index: 4 }, '*')
  })
})
