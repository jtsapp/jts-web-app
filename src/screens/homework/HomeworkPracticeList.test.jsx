// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkPracticeList from './HomeworkPracticeList.jsx'
import { practiceExercises } from './homeworkExercises.js'

const unit = (over = {}) => ({
  id: 1,
  practiceArea: 'grammar',
  practiceLevel: 'a1',
  practiceUnitId: 12,
  title: 'am / is / are',
  instruction: 'Present',
  ...over,
})

function show(hw, onOpen) {
  return render(
    <I18nProvider>
      <HomeworkPracticeList hw={hw} onOpen={onOpen} />
    </I18nProvider>,
  )
}

describe('Задания из «Практики» в домашней работе', () => {
  it('показывает юнит с разделом и уровнем', () => {
    show({ exercises: [unit()] })
    expect(screen.getByText('am / is / are')).toBeTruthy()
    expect(screen.getByText('Present · A1')).toBeTruthy()
  })

  // Материал живёт в самом кабинете: домашняя работа несёт только адрес юнита,
  // и решать его ученик уходит в раздел.
  it('«Открыть» отдаёт адрес юнита', () => {
    const onOpen = vi.fn()
    show({ exercises: [unit()] }, onOpen)
    fireEvent.click(screen.getByRole('button', { name: 'Открыть' }))
    expect(onOpen).toHaveBeenCalledWith({ level: 'a1', unitId: 12 })
  })

  it('без заданий из «Практики» списка нет вовсе', () => {
    const { container } = show({ exercises: [{ id: 2, question: { id: 'q1', type: 'choice' } }] })
    expect(container.querySelector('.hw-practice')).toBeNull()
  })
})

describe('practiceExercises', () => {
  it('берёт только задания «Практики»', () => {
    const hw = {
      exercises: [
        unit(),
        { id: 2, question: { id: 'q1' } },
        { id: 3, taskId: 5 },
      ],
    }
    expect(practiceExercises(hw).map((e) => e.id)).toEqual([1])
  })

  // Отзыв выдачи — то же правило, что и у заданий с урока: ученик не должен
  // видеть в списке то, что преподаватель забрал обратно.
  it('отозванные не показываются', () => {
    expect(practiceExercises({ exercises: [unit({ revoked: true })] })).toEqual([])
  })

  it('запись без номера юнита не считается заданием', () => {
    expect(practiceExercises({ exercises: [unit({ practiceUnitId: null })] })).toEqual([])
  })
})
