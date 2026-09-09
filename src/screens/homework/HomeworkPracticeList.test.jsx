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
    // Раздел в подписи обязателен: в одной работе рядом лежат юнит грамматики
    // и текст «Чтения», и по «Present · A1» их не различить.
    expect(screen.getByText('Грамматика · Present · A1')).toBeTruthy()
  })

  // Материал живёт в самом кабинете: домашняя работа несёт только адрес юнита,
  // и решать его ученик уходит в раздел — у каждого раздела он свой.
  it('«Открыть» ведёт в тот раздел, из которого задание', () => {
    const onOpen = vi.fn()
    show({ exercises: [unit()] }, onOpen)
    fireEvent.click(screen.getByRole('button', { name: 'Открыть' }))
    expect(onOpen).toHaveBeenCalledWith({ key: 'practice', payload: { level: 'a1', unitId: 12 } })
  })

  it('текст «Чтения» уводит в «Чтение», урок шэдоуинга — на свой экран', () => {
    const onOpen = vi.fn()
    show({ exercises: [unit({
      practiceArea: 'reading', practiceUnitId: null, practiceUnitKey: 'a1-sci-honey',
      title: 'Honey From the Old Tomb', instruction: 'science',
    })] }, onOpen)
    fireEvent.click(screen.getByRole('button', { name: 'Открыть' }))
    expect(onOpen).toHaveBeenCalledWith({ key: 'reading', payload: { level: 'a1', textId: 'a1-sci-honey' } })

    onOpen.mockClear()
    show({ exercises: [unit({
      id: 9, practiceArea: 'shadowing', practiceLevel: 'all',
      practiceUnitId: null, practiceUnitKey: 'sg', title: 'Speak Like Selena Gomez',
    })] }, onOpen)
    fireEvent.click(screen.getAllByRole('button', { name: 'Открыть' })[1])
    expect(onOpen).toHaveBeenCalledWith({ key: 'shadowing', payload: 'sg' })
  })

  /* Экраны на неизвестный адрес не ругаются, а подставляют своё: шэдоуинг —
     первый урок списка. Ученик решал бы не то, что задали, — поэтому кнопки
     нет вовсе, а вместо неё объяснение. */
  it('задание, которое некуда открыть, показано без кнопки', () => {
    show({ exercises: [unit({
      practiceArea: 'shadowing', practiceLevel: 'all',
      practiceUnitId: null, practiceUnitKey: 'нет-такого-урока', title: 'Урок',
    })] })

    expect(screen.queryByRole('button', { name: 'Открыть' })).toBeNull()
    expect(screen.getByText(/нет в разделе/)).toBeTruthy()
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

  /* Номер есть только у грамматики: у остальных шести разделов адрес
     строковый, и проверка одного номера выбрасывала их из списка целиком. */
  it('юнит со строковым адресом — тоже задание', () => {
    const текст = unit({ practiceArea: 'reading', practiceUnitId: null, practiceUnitKey: 'a1-sci-honey' })
    expect(practiceExercises({ exercises: [текст] }).map((e) => e.id)).toEqual([1])
  })

  it('запись без адреса вовсе не считается заданием', () => {
    expect(practiceExercises({ exercises: [unit({ practiceUnitId: null })] })).toEqual([])
    expect(practiceExercises({ exercises: [unit({ practiceUnitId: null, practiceUnitKey: '  ' })] })).toEqual([])
  })
})
