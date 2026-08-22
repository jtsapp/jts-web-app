// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import GapQuestion from './GapQuestion.jsx'

function show(question, answer, checked = true) {
  return render(
    <I18nProvider>
      <GapQuestion question={question} answer={answer} checked={checked} onAnswer={() => {}} />
    </I18nProvider>
  )
}

const openGap = { id: 'g1', type: 'gap', open: true, gapBefore: 'Who do live with you? →', gapAfter: '' }
const withKey = { id: 'g2', type: 'gap', answers: ['does'], gapBefore: 'Do your brother live with you? →', gapAfter: '' }

describe('GapQuestion: открытый ответ', () => {
  // Живая поломка: белиберда в открытом пропуске получала зелёную галочку, и
  // ученик считал, что ответил верно.
  it('не рисует галочку «верно» там, где сверять не с чем', () => {
    const { container } = show(openGap, 'edcwcdw')

    expect(container.querySelector('.lw-gap-input__check')).toBeNull()
    expect(container.querySelector('.lw-gap-input').className).not.toMatch(/is-correct/)
  })

  it('честно говорит, кто это проверит', () => {
    show(openGap, 'edcwcdw')
    expect(screen.getByText(/Проверит преподаватель/)).toBeTruthy()
  })

  it('и не красит красным — ответ не неверный, он непроверенный', () => {
    const { container } = show(openGap, 'edcwcdw')
    expect(container.querySelector('.lw-gap-input').className).toMatch(/is-review/)
    expect(container.querySelector('.lw-gap-input').className).not.toMatch(/is-wrong/)
  })

  it('эталон не показывает: его нет', () => {
    const { container } = show(openGap, 'edcwcdw')
    expect(container.querySelector('.lw-q__answer')).toBeNull()
  })
})

describe('GapQuestion: пропуск с эталоном', () => {
  it('верный ответ по-прежнему получает галочку', () => {
    const { container } = show(withKey, 'does')

    expect(container.querySelector('.lw-gap-input__check')).not.toBeNull()
    expect(container.querySelector('.lw-gap-input').className).toMatch(/is-correct/)
  })

  it('неверный — красный и с эталоном', () => {
    const { container } = show(withKey, 'cwdcwdcwdc')

    expect(container.querySelector('.lw-gap-input').className).toMatch(/is-wrong/)
    expect(container.textContent).toContain('does')
  })
})
