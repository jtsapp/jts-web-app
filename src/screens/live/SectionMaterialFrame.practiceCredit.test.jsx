// @vitest-environment jsdom
//
// Урок конструктора с заданиями из «Практики» на занятии: проверил все задания юнита —
// юнит пройден и в «Практике». Рамка преподавателя (isStaff) — не работа ученика.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'

vi.mock('../../practice/grammar/grammarProgress.js', () => ({ markUnitDone: vi.fn() }))

import { markUnitDone } from '../../practice/grammar/grammarProgress.js'
import { I18nProvider } from '../../i18n.jsx'
import SectionMaterialFrame from './SectionMaterialFrame.jsx'

const MATERIAL = { id: 1, materialId: 11, title: 'Урок', materialType: 'INTERACTIVE_HTML', fileUrl: 'https://files/lb.html' }
const TID = 'pg-a1-3-2b6f0e1c-1111-4c3a-9d1e-000000000001'

function renderFrame(isStaff) {
  const view = render(
    <I18nProvider>
      <SectionMaterialFrame lessonId={14} token="t" material={MATERIAL} isStaff={isStaff} />
    </I18nProvider>
  )
  return view.container.querySelector('iframe')
}

function checked(iframe) {
  return act(async () => {
    window.dispatchEvent(new MessageEvent('message', {
      source: iframe.contentWindow, data: { source: 'jts-lesson', type: 'task-checked', tid: TID, pageTids: [TID] },
    }))
  })
}

beforeEach(() => markUnitDone.mockClear())
afterEach(cleanup)

describe('SectionMaterialFrame — юнит «Практики»', () => {
  it('ученик проверил задания юнита — юнит пройден', async () => {
    await checked(renderFrame(false))

    expect(markUnitDone).toHaveBeenCalledWith('a1', 3)
  })

  it('рамка преподавателя юнит не засчитывает', async () => {
    await checked(renderFrame(true))

    expect(markUnitDone).not.toHaveBeenCalled()
  })
})
