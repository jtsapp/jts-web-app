// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkDetail from './HomeworkDetail.jsx'

const hw = (over = {}) => ({
  id: 7,
  title: 'Unit 3 · Present Perfect',
  status: 'ASSIGNED',
  dueDate: '2026-08-22',
  createdByName: 'Адильжан Алимжанов',
  materials: [{ id: 1, fileName: 'task.pdf', url: 'https://files.example/task.pdf' }],
  submissions: [],
  ...over,
})

function renderDetail(props) {
  return render(
    <I18nProvider>
      <HomeworkDetail hw={hw()} onUpload={() => {}} onRemoveFile={() => {}} onSubmit={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('HomeworkDetail', () => {
  it('задание можно скачать по имени файла', () => {
    const { container } = renderDetail()
    const link = container.querySelector('.hw-file__name')
    expect(link.textContent).toBe('task.pdf')
    expect(link.getAttribute('href')).toBe('https://files.example/task.pdf')
    expect(link.getAttribute('download')).toBe('task.pdf')
  })

  it('без вложений отправлять нечего', () => {
    renderDetail()
    expect(screen.getByRole('button', { name: /отправить на проверку/i }).disabled).toBe(true)
  })

  it('с вложением кнопка отправки работает', () => {
    renderDetail({ hw: hw({ submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u' }] }) })
    expect(screen.getByRole('button', { name: /отправить на проверку/i }).disabled).toBe(false)
  })

  // Работа на проверке — файлы уже у преподавателя, второй раз её не отправляют.
  it('отправленную работу нельзя отправить снова, но файлы ещё видны', () => {
    const { container } = renderDetail({
      hw: hw({ status: 'SUBMITTED', submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u' }] }),
    })
    expect(screen.getByRole('button', { name: /отправить на проверку/i }).disabled).toBe(true)
    expect(container.querySelectorAll('.hw-file')).toHaveLength(2)
  })

  it('после проверки нельзя ни приложить файл, ни удалить его', () => {
    const { container } = renderDetail({
      hw: hw({ status: 'COMPLETED', grade: 5, teacherComment: 'Отлично', submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u' }] }),
    })
    expect(container.querySelector('.hw-upload')).toBeNull()
    expect(container.querySelector('.hw-file__remove')).toBeNull()
    expect(screen.queryByRole('button', { name: /отправить на проверку/i })).toBeNull()
  })

  it('оценка и комментарий преподавателя видны ученику', () => {
    const { container } = renderDetail({ hw: hw({ status: 'COMPLETED', grade: 4, teacherComment: 'Проверь артикли' }) })
    expect(container.querySelector('.hw-grade__num').textContent).toBe('4')
    expect(screen.getByText('Проверь артикли')).toBeTruthy()
    expect(screen.getByText('Проверка')).toBeTruthy()
  })

  // Преподаватель может написать отзыв до оценки — это ещё не проверка работы.
  it('отзыв без оценки показывается как отзыв преподавателя', () => {
    const { container } = renderDetail({
      hw: hw({ status: 'SUBMITTED', teacherComment: 'Второе задание переделай' }),
    })
    expect(screen.getByText('Отзыв преподавателя')).toBeTruthy()
    expect(screen.getByText('Второе задание переделай')).toBeTruthy()
    expect(container.querySelector('.hw-grade')).toBeNull()
  })

  it('файл ответа можно убрать, пока работу не проверили', () => {
    const removed = []
    renderDetail({
      hw: hw({ submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u' }] }),
      onRemoveFile: (m) => removed.push(m.id),
    })
    screen.getByRole('button', { name: /убрать файл answer\.jpg/i }).click()
    expect(removed).toEqual([9])
  })

  it('без выбранной работы показывает подсказку, а не пустоту', () => {
    const { container } = renderDetail({ hw: null })
    expect(container.querySelector('.hw-detail--empty')).not.toBeNull()
  })
})
