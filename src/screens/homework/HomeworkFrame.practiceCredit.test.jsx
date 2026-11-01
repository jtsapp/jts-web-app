// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

vi.mock('../../practice/grammar/grammarProgress.js', () => ({ markUnitDone: vi.fn() }))

import { markUnitDone } from '../../practice/grammar/grammarProgress.js'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkFrame from './HomeworkFrame.jsx'

/**
 * Урок с заданиями из «Практики» в домашке: проверил все задания юнита — юнит
 * пройден и в «Практике». Сообщение верно только от своей рамки.
 */
const GAP = 'pg-a2-5-2b6f0e1c-1111-4c3a-9d1e-000000000001'
const MC = 'pg-a2-5-2b6f0e1c-1111-4c3a-9d1e-000000000002'

function frameOf() {
  const { container } = render(
    <I18nProvider>
      <HomeworkFrame src="about:blank" title="Lesson" />
    </I18nProvider>
  )
  return container.querySelector('iframe')
}

function checked(source, tid) {
  window.dispatchEvent(new MessageEvent('message', {
    source, data: { source: 'jts-lesson', type: 'task-checked', tid, pageTids: [GAP, MC] },
  }))
}

beforeEach(() => markUnitDone.mockClear())
afterEach(cleanup)

describe('HomeworkFrame — юнит «Практики»', () => {
  it('все задания юнита проверены в своей рамке — юнит пройден', () => {
    const frame = frameOf()

    checked(frame.contentWindow, GAP)
    expect(markUnitDone).not.toHaveBeenCalled()
    checked(frame.contentWindow, MC)

    expect(markUnitDone).toHaveBeenCalledWith('a2', 5)
  })

  it('сообщение не от своей рамки — ничего', () => {
    frameOf()

    checked(window, GAP)
    checked(window, MC)

    expect(markUnitDone).not.toHaveBeenCalled()
  })
})
