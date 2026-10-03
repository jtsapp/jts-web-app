// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  // Работа на проверке зафиксирована: файлы видны, но не меняются — оценка
  // должна встать под тем составом, который открыл преподаватель (то же
  // правило держит бэкенд).
  it('отправленная работа закрыта: ни загрузки, ни удаления, файлы видны', () => {
    const { container } = renderDetail({
      hw: hw({ status: 'SUBMITTED', submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u' }] }),
    })
    expect(screen.queryByRole('button', { name: /отправить на проверку/i })).toBeNull()
    expect(container.querySelector('.hw-upload')).toBeNull()
    expect(container.querySelector('.hw-file__remove')).toBeNull()
    expect(container.querySelectorAll('.hw-file')).toHaveLength(2)
    expect(screen.getByText('Работа у преподавателя — ждём проверки')).toBeTruthy()
  })

  // Регрессия: у IN_REVIEW бейдж читался как «Задано» (а с прошедшим сроком —
  // «Просрочено»), и объяснение «работа у преподавателя» не показывалось вовсе:
  // ученик видел закрытый экран без единого слова о том, почему в нём ничего
  // нельзя сделать.
  it('взятая преподавателем в проверку выглядит так же, как сданная', () => {
    const { container } = renderDetail({
      hw: hw({
        status: 'IN_REVIEW',
        dueDate: '2020-01-01',
        submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u' }],
      }),
    })
    expect(container.querySelector('.hw-badge').textContent).toBe('На проверке')
    expect(container.querySelector('.hw-upload')).toBeNull()
    expect(container.querySelector('.hw-file__remove')).toBeNull()
    expect(screen.queryByRole('button', { name: /отправить на проверку/i })).toBeNull()
    expect(screen.getByText('Работа у преподавателя — ждём проверки')).toBeTruthy()
  })

  it('после проверки нельзя ни приложить файл, ни удалить его', () => {
    const { container } = renderDetail({
      hw: hw({ status: 'COMPLETED', grade: 5, teacherComment: 'Отлично', submissions: [{ id: 9, fileName: 'answer.jpg', url: 'u' }] }),
    })
    expect(container.querySelector('.hw-upload')).toBeNull()
    expect(container.querySelector('.hw-file__remove')).toBeNull()
    expect(screen.queryByRole('button', { name: /отправить на проверку/i })).toBeNull()
  })

  // Ровно случай со скриншота: пустая работа с бейджем «Проверено», который
  // ученику ничего не объясняет — ни файлов, ни оценки, ни отзыва.
  it('закрытая без сдачи работа так и подписана', () => {
    renderDetail({ hw: hw({ status: 'COMPLETED', closedWithoutSubmission: true, materials: [] }) })
    expect(screen.getByText('Закрыто без сдачи')).toBeTruthy()
    expect(screen.getByText(/вы её не сдавали/i)).toBeTruthy()
    expect(screen.queryByText('Проверено')).toBeNull()
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

describe('HomeworkDetail: два вида работы разведены', () => {
  it('файлы и задания с урока — разные блоки, а не один список', () => {
    const hw = {
      id: 5, title: 'Работа', status: 'ASSIGNED',
      materials: [{ id: 1, fileName: 'task.png', url: '#' }],
      submissions: [],
      exercises: [{ id: 1, question: { id: 'q1', type: 'choice', prompt: 'A?', options: ['a'], answer: 'a' } }],
    }

    const { container } = render(<I18nProvider><HomeworkDetail hw={hw} /></I18nProvider>)

    expect(container.querySelector('.hw-block--files')).not.toBeNull()
    expect(container.querySelector('.hw-block--exercises')).not.toBeNull()
    // Файл лежит в файловом блоке, а не среди решаемых заданий.
    expect(container.querySelector('.hw-block--exercises .hw-file')).toBeNull()
  })
})

// Одна домашка на занятие (spec §5, §9): части-материалы (hw.materialParts)
// теперь тоже рисуются внутри ленты работы — между файлами учителя и
// «Практикой», в порядке фактической выдачи вместе с пачками вопросов.
describe('HomeworkDetail: части-материалы одной домашки', () => {
  const hw = (over = {}) => ({
    id: 7, title: 'Домашнее задание из урока 28.09', status: 'ASSIGNED',
    materials: [], submissions: [],
    exercises: [
      { id: 1, batchId: 'b1', addedAt: '2026-09-28T09:00:00', lessonTitle: 'Урок 2', question: { id: 'q1', type: 'choice', prompt: 'A?', options: ['a'], answer: 'a' } },
    ],
    materialParts: [
      { id: 40, materialId: 14, materialTitle: 'Урок 1 целиком', materialType: 'INTERACTIVE_HTML', isGraded: true, createdAt: '2026-09-28T08:00:00', status: 'ASSIGNED', isOverdue: false, files: [] },
    ],
    ...over,
  })

  it('часть-материал видна в ленте, раньше выданное — выше', () => {
    const { container } = render(<I18nProvider><HomeworkDetail hw={hw()} /></I18nProvider>)

    // Заголовки именно ленты (пачки + части-материалы) — не «Задание файлом»
    // и не «Мой ответ», это отдельные блоки вокруг ленты, а не внутри неё.
    const заголовки = [...container.querySelectorAll('.hw-block--exercises .hw-block__title, .hw-block--material .hw-block__title')]
      .map((el) => el.textContent)
    // Часть-материал (08:00) выдана раньше пачки вопросов (09:00) — стоит выше.
    expect(заголовки).toEqual(['Урок 1 целиком', 'Урок 2'])
    expect(screen.getByRole('button', { name: 'Открыть задание' })).toBeTruthy()
  })

  it('у части-материала нет собственной кнопки «Сдать» — только у всей работы', () => {
    render(<I18nProvider><HomeworkDetail hw={hw()} onSubmit={() => {}} /></I18nProvider>)

    // Единственная «Сдать»-подобная кнопка на экране — общая «Отправить на
    // проверку» всей работы (класс .hw-submit без --batch у части не рисуется).
    const кнопки = screen.getAllByRole('button').map((b) => b.textContent)
    expect(кнопки.filter((t) => /сдать/i.test(t))).toEqual([])
    expect(кнопки).toContain('Отправить на проверку')
  })

  it('без частей-материалов лента остаётся прежней — их просто нет', () => {
    const { container } = render(<I18nProvider><HomeworkDetail hw={hw({ materialParts: [] })} /></I18nProvider>)
    expect(container.querySelector('.hw-block--material')).toBeNull()
  })
})

/**
 * Работа только из части-материала — ровно случай со стенда 29.09: ученик сделал
 * урок в рамке, а сдать было нечем. Вопросов и файлов нет, сдачу оживляет сама
 * часть: `hasWork` с сервера или действие в её рамке в этом сеансе.
 */
describe('HomeworkDetail: сдача работы из одной части-материала', () => {
  // isGraded: false — рамка открывается без старта сессии, то есть без сети.
  const ЧАСТЬ = {
    id: 40, materialId: 14, materialTitle: 'A0 · Урок 5', materialType: 'INTERACTIVE_HTML', isGraded: false,
    fileUrl: 'https://files.example/m.html', createdAt: '2026-09-28T08:00:00', status: 'ASSIGNED', isOverdue: false, files: [],
  }
  const работа = (part = ЧАСТЬ) => ({
    id: 7, title: 'Домашнее задание из урока 28.09', status: 'ASSIGNED',
    materials: [], submissions: [], exercises: [], materialParts: [part],
  })
  const сдать = () => screen.getByRole('button', { name: 'Отправить на проверку' })
  const показатьРаботу = (props) => render(
    <I18nProvider><HomeworkDetail hw={работа()} onSubmit={() => {}} {...props} /></I18nProvider>
  )

  it('кнопка оживает от тронутой части или от hasWork с сервера', () => {
    const { unmount } = показатьРаботу({ touchedPartIds: new Set() })
    expect(сдать().disabled).toBe(true)
    unmount()

    показатьРаботу({ touchedPartIds: new Set([40]) })
    expect(сдать().disabled).toBe(false)
  })

  it('часть, сделанная раньше (hasWork), даёт сдать сразу после открытия экрана', () => {
    показатьРаботу({ hw: работа({ ...ЧАСТЬ, hasWork: true }) })
    expect(сдать().disabled).toBe(false)
  })

  it('действие в рамке части уходит наверх с id работы и части', async () => {
    const onPartTouched = vi.fn()
    const { container } = показатьРаботу({ onPartTouched })
    fireEvent.click(screen.getByRole('button', { name: 'Открыть задание' }))
    const frame = await waitFor(() => {
      const el = container.querySelector('.hw-frame__iframe')
      expect(el).not.toBeNull()
      return el
    })

    fireEvent(window, new MessageEvent('message', {
      source: frame.contentWindow,
      data: { source: 'jts-bridge', type: 'mirror', selector: '#done', eventType: 'click', value: null },
    }))

    expect(onPartTouched).toHaveBeenCalledWith({ homeworkId: 7, partId: 40 })
  })
})

// «Преподаватель не прикрепил файлов» стоял первой строкой над частями урока и
// вопросами: ученик читал «ничего нет» раньше, чем видел само задание.
describe('HomeworkDetail: пустой блок «Задание файлом»', () => {
  const пустаяРабота = (over = {}) => ({
    id: 7, title: 'Работа', status: 'ASSIGNED', materials: [], submissions: [], exercises: [], ...over,
  })
  const части = [{ id: 40, materialId: 14, materialTitle: 'A0 · Урок 5', materialType: 'INTERACTIVE_HTML', createdAt: '2026-09-28T08:00:00', status: 'ASSIGNED', files: [] }]

  const показатьРаботу = (hw) => render(<I18nProvider><HomeworkDetail hw={hw} /></I18nProvider>)

  it('прячется при частях, вопросах или «Практике» и остаётся, когда объяснять пустоту больше нечему', () => {
    for (const over of [
      { materialParts: части },
      { exercises: [{ id: 1, question: { id: 'q1', type: 'choice', prompt: 'A?', options: ['a'], answer: 'a' } }] },
      { exercises: [{ id: 2, practiceArea: 'grammar', practiceUnitId: 5, title: 'Present Simple' }] },
    ]) {
      const { container, unmount } = показатьРаботу(пустаяРабота(over))
      expect(container.querySelector('.hw-block--files')).toBeNull()
      expect(screen.queryByText('Преподаватель не прикрепил файлов')).toBeNull()
      unmount()
    }

    // Это всё содержимое работы — пустой блок и есть объяснение.
    const пустая = показатьРаботу(пустаяРабота())
    expect(screen.getByText('Преподаватель не прикрепил файлов')).toBeTruthy()
    пустая.unmount()

    // Файлы есть — блок на месте при любом соседстве.
    показатьРаботу(пустаяРабота({ materials: [{ id: 1, fileName: 'task.pdf', url: '#' }], materialParts: части }))
    expect(screen.getByRole('link', { name: 'task.pdf' })).toBeTruthy()
  })
})
