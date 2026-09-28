// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import HomeworkList from './HomeworkList.jsx'

/**
 * Снимок «что задано» — единственное, что отличает в списке две выдачи по одному
 * файлу уровня. Раньше он был только в детали (MaterialAssignmentDetail).
 */
const ОБЫЧНАЯ = { id: 7, title: 'Unit 3 · Present Perfect', status: 'ASSIGNED', dueDate: null }

const МАТЕРИАЛ = {
  id: 'm-24',
  kind: 'material',
  title: 'A0 · Урок 5 — Coffee — yes',
  status: 'ASSIGNED',
  isOverdue: false,
  dueDate: '2026-09-29',
  grade: null,
  stageTitlesSnapshot: 'Practice · Задание 1, Listening · Задание 2',
}

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
    const { container } = показать([{ ...МАТЕРИАЛ, stageTitlesSnapshot: null }])
    expect(container.querySelector('.hw-assigned')).toBeNull()
  })

  it('карточка остаётся одной кнопкой, а имя кнопки содержит заголовок и снимок', () => {
    показать([МАТЕРИАЛ])
    const кнопка = screen.getByRole('button', { name: /A0 · Урок 5 — Coffee — yes/ })
    expect(кнопка.textContent).toContain('Practice · Задание 1, Listening · Задание 2')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
