// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import WorkspaceHeader from './WorkspaceHeader.jsx'

function renderHeader(lesson) {
  return render(
    <I18nProvider>
      <WorkspaceHeader lesson={lesson} stepIndex={0} elapsedSec={103} onExit={() => {}} />
    </I18nProvider>
  )
}

// Спека запрещает имитацию: «таймер идёт или его нет». У урока из каталога
// длительности не бывает, и пара «01:43 / 00:00» показывала бы слева время
// мок-урока, а справа — отсутствующие данные.
describe('WorkspaceHeader — таймер', () => {
  it('показывает таймер, когда у урока есть длительность', () => {
    renderHeader({ level: 'A2', unit: 'Unit 4', durationSec: 3000, steps: [] })
    expect(screen.getByText(/01:43/)).toBeTruthy()
    expect(screen.getByText(/50:00/)).toBeTruthy()
  })

  it('прячет таймер, когда длительности нет', () => {
    const { container } = renderHeader({ level: 'A2', unit: 'Unit 1', steps: [] })
    expect(container.querySelector('.lw-header__timer')).toBeNull()
  })

  it('прячет таймер и при нулевой длительности', () => {
    const { container } = renderHeader({ level: 'A2', unit: 'Unit 1', durationSec: 0, steps: [] })
    expect(container.querySelector('.lw-header__timer')).toBeNull()
  })

  it('уровень и юнит показывает в обоих случаях', () => {
    renderHeader({ level: 'A2', unit: 'Unit 1 · Daily life', steps: [] })
    expect(screen.getByText('A2')).toBeTruthy()
    expect(screen.getByText('Unit 1 · Daily life')).toBeTruthy()
  })
})
