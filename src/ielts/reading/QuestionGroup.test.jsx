// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { useRef, useState } from 'react'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import QuestionGroup from './QuestionGroup.jsx'
import { useMarker } from './marker.jsx'
import { addHighlight, removeHighlight } from './highlights.js'
import { createRun, flattenItems } from './run.js'

const DOC = {
  id: 'RT-1',
  texts: [],
  groups: [
    {
      id: 'g1',
      type: 'tfng',
      instruction: 'Do the following statements agree with the information given in the text?',
      items: [{ id: 'q1', prompt: 'Bees can see ultraviolet light.' }],
    },
    {
      id: 'g2',
      type: 'sentence_completion',
      instruction: 'Complete the sentences.',
      items: [{ id: 'q2', prompt: 'The hive is made of ____ wax.' }],
    },
  ],
}

beforeAll(() => {
  // jsdom не считает раскладку: меню маркера ставится по рамке выделения
  Range.prototype.getBoundingClientRect = () => ({ left: 10, top: 10, width: 20, height: 10 })
})

// Панель вопросов так же, как в IeltsReadingRunPage: useMarker на корне, QuestionGroup с marker
function Pane({ onAnswer = () => {}, initial = [] }) {
  const ref = useRef(null)
  const [hl, setHl] = useState(initial)
  const run = createRun(DOC, 'practice')
  const items = flattenItems(DOC)
  const marker = useMarker({
    hostRef: ref,
    highlights: hl,
    onHighlight: (h) => setHl((l) => addHighlight(l, h)),
    onRemoveHighlight: (x) => setHl((l) => removeHighlight(l, x)),
  })
  return (
    <div ref={ref} data-selectable="" onMouseUp={marker.onMouseUp} onContextMenu={marker.onContextMenu}>
      {DOC.groups.map((g, gi) => (
        <QuestionGroup
          key={g.id}
          group={g}
          entries={items.filter((x) => x.groupIndex === gi)}
          doc={DOC}
          run={run}
          mode="practice"
          onAnswer={onAnswer}
          onFlag={() => {}}
          onCheck={() => {}}
          onShowInText={() => {}}
          onFocus={() => {}}
          marker={{ highlights: hl }}
        />
      ))}
      {marker.menu}
    </div>
  )
}

const mount = (props) => render(<I18nProvider><Pane {...props} /></I18nProvider>)

function select(node, from, to) {
  const r = document.createRange()
  r.setStart(node, from)
  r.setEnd(node, to)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(r)
}

describe('QuestionGroup — маркер на вопросах', () => {
  it('выделение в тексте вопроса → «Выделить» красит кусок под ключом вопроса', () => {
    const { container } = mount()
    const box = container.querySelector('[data-ptext="q:q1"]')
    expect(box.textContent).toBe('Bees can see ultraviolet light.')
    // зацепили полслова — край доводится до границы слова
    select(box.firstChild.firstChild, 14, 18)
    fireEvent.mouseUp(box)
    const add = container.querySelector('.ih-selmenu__act')
    expect(add).toBeTruthy()
    fireEvent.click(add)
    const mark = container.querySelector('[data-ptext="q:q1"] mark.ih-hl')
    expect(mark.textContent).toBe('ultraviolet')
    expect(container.querySelector('.ih-selmenu')).toBeNull()
  })

  it('инструкция группы и фраза с пропуском выделяются своими ключами, поле ответа — вне текста', () => {
    const { container } = mount({ initial: [{ key: 'q:g1:ins', start: 7, end: 16, color: 1 }, { key: 'q:q2:0', start: 4, end: 8, color: 1 }] })
    expect(container.querySelector('[data-ptext="q:g1:ins"] mark.ih-hl').textContent).toBe('following')
    expect(container.querySelector('[data-ptext="q:q2:0"] mark.ih-hl').textContent).toBe('hive')
    expect(container.querySelector('[data-ptext] input')).toBeNull()
    expect(container.querySelector('input.ih-gap')).toBeTruthy()
  })

  it('правая кнопка по выделенному — «Убрать выделение»', () => {
    const { container } = mount({ initial: [{ key: 'q:q1', start: 0, end: 4, color: 1 }] })
    const mark = container.querySelector('[data-ptext="q:q1"] mark.ih-hl')
    window.getSelection().removeAllRanges()
    fireEvent.contextMenu(mark)
    const acts = container.querySelectorAll('.ih-selmenu__act')
    expect(acts).toHaveLength(1)
    fireEvent.click(acts[0])
    expect(container.querySelector('[data-ptext="q:q1"] mark')).toBeNull()
  })

  it('кнопки ответа работают как раньше', () => {
    const onAnswer = vi.fn()
    const { getByText } = mount({ onAnswer })
    fireEvent.click(getByText('NOT GIVEN'))
    expect(onAnswer).toHaveBeenCalledWith('q1', 'NOT GIVEN')
  })

  it('без marker текст вопроса — обычный текст (Listening)', () => {
    const items = flattenItems(DOC)
    const { container } = render(
      <I18nProvider>
        <QuestionGroup group={DOC.groups[0]} entries={items.filter((x) => x.groupIndex === 0)} doc={DOC} run={createRun(DOC, 'exam')} mode="exam" onAnswer={() => {}} onFlag={() => {}} onCheck={() => {}} onShowInText={() => {}} onFocus={() => {}} />
      </I18nProvider>,
    )
    expect(container.querySelector('[data-ptext]')).toBeNull()
    expect(container.textContent).toContain('Bees can see ultraviolet light.')
  })
})
