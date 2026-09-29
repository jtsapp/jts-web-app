// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkList from './HomeworkList.jsx'
import { materialCard } from './materialAssignments.js'

/**
 * Снимок «что задано» — единственное, что отличает в списке две выдачи по одному
 * файлу уровня. Раньше он был только в детали (MaterialAssignmentDetail).
 */
const ОБЫЧНАЯ = { id: 7, title: 'Unit 3 · Present Perfect', status: 'ASSIGNED', dueDate: null }

// Карточка — та же, что строит экран (materialCard): что задано, строка
// выводит из самой выдачи (card.assignment), а не из плоской копии снимка.
const ВЫДАЧА = {
  id: 24,
  materialTitle: 'A0 · Урок 5 — Coffee — yes',
  status: 'ASSIGNED',
  isOverdue: false,
  dueDate: '2026-09-29',
  teacherScore: null,
  taskTids: ['lis-tick', 'pr-2'],
  stageTitlesSnapshot: 'Practice · Задание 1, Listening · Задание 2',
}
const МАТЕРИАЛ = materialCard(ВЫДАЧА)

function показать(items) {
  return render(
    <I18nProvider>
      <HomeworkList items={items} selectedId={null} onSelect={() => {}} />
    </I18nProvider>
  )
}

describe('HomeworkList — снимок задания на карточке', () => {
  it('выданный материал показывает, что задано, тем же классом, что деталь', () => {
    const { container } = показать([ОБЫЧНАЯ, МАТЕРИАЛ])

    const снимок = screen.getByText('Practice · Задание 1, Listening · Задание 2')
    expect(снимок.classList.contains('hw-assigned')).toBe(true)
    // Стоит на карточке материала, под заголовком.
    const карточка = снимок.closest('.hw-card')
    expect(карточка.querySelector('.hw-card__title').textContent).toBe('A0 · Урок 5 — Coffee — yes')
    // Обычная домашка и выдача без снимка строку не рисуют — ни пустую, ни «null».
    expect(container.querySelectorAll('.hw-assigned')).toHaveLength(1)
  })

  it('старая выдача без снимка остаётся без строки', () => {
    const { container } = показать([materialCard({ ...ВЫДАЧА, taskTids: null, stageTitlesSnapshot: null })])
    expect(container.querySelector('.hw-assigned')).toBeNull()
  })

  // Жалоба владельца 29.09: у выданного блока снимок — сырой текст самого блока.
  it('выданный блок подписан «Фрагмент урока», а не сырым текстом блока', () => {
    показать([materialCard({ ...ВЫДАЧА, taskTids: null, blockKeys: ['block@4:2'], stageTitlesSnapshot: '🛏 bedroom👍👎🍳 kitchen👍👎' })])
    expect(screen.getByText('Фрагмент урока').classList.contains('hw-assigned')).toBe(true)
    expect(screen.queryByText(/bedroom/)).toBeNull()
  })

  it('карточка остаётся одной кнопкой, а имя кнопки содержит заголовок и снимок', () => {
    показать([МАТЕРИАЛ])
    const кнопка = screen.getByRole('button', { name: /A0 · Урок 5 — Coffee — yes/ })
    expect(кнопка.textContent).toContain('Practice · Задание 1, Listening · Задание 2')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})

// Одна домашка на занятие (spec §5.5, §9): «N частей» подтверждает на карточке
// списка, что несколько выдач с занятия правда собраны в одну работу.
describe('HomeworkList — счётчик частей работы', () => {
  it('несколько частей — виден компактный счётчик', () => {
    const hw = {
      id: 7, title: 'Домашнее задание из урока 28.09', status: 'ASSIGNED',
      exercises: [{ id: 1, batchId: 'b1', addedAt: '2026-09-28T10:00:00', question: { id: 'q1' } }],
      materialParts: [{ id: 5, createdAt: '2026-09-28T10:05:00' }],
    }
    const { container } = показать([hw])

    expect(container.querySelector('.hw-card__parts').textContent).toBe('2 частей')
  })

  it('одна часть — счётчик не рисуется, это не новость', () => {
    const hw = {
      id: 7, title: 'Обычная домашка', status: 'ASSIGNED',
      exercises: [{ id: 1, batchId: 'b1', addedAt: '2026-09-28T10:00:00', question: { id: 'q1' } }],
    }
    const { container } = показать([hw])

    expect(container.querySelector('.hw-card__parts')).toBeNull()
  })

  // Карточка материала (непривязанная выдача) свой собственный счётчик не
  // считает — она и есть одна часть, отдельно посчитанная выше не нужна.
  it('карточка материала счётчик не показывает', () => {
    const { container } = показать([МАТЕРИАЛ])
    expect(container.querySelector('.hw-card__parts')).toBeNull()
  })
})
