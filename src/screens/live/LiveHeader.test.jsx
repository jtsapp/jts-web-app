// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LiveHeader from './LiveHeader.jsx'

function renderHeader(props = {}) {
  return render(
    <I18nProvider>
      <LiveHeader status="IN_PROGRESS" lessonTitle="Группа IELTS" onExit={() => {}} {...props} />
    </I18nProvider>
  )
}

describe('LiveHeader — урок в шапке', () => {
  // Слева в макете стоит сам урок, а не преподаватель: имя преподавателя
  // переехало во вкладку «Группа» правой колонки, где оно стоит рядом с
  // остальными участниками, а не дублирует их.
  it('показывает название урока и вид занятия', () => {
    renderHeader({ group: true })
    expect(screen.getByText('Группа IELTS')).toBeTruthy()
    expect(screen.getByText('Групповой урок')).toBeTruthy()
  })

  it('участник один — занятие индивидуальное', () => {
    renderHeader({ group: false })
    expect(screen.getByText('Индивидуальный урок')).toBeTruthy()
  })

  it('названия урока ещё нет — шапка не остаётся пустой', () => {
    renderHeader({ lessonTitle: null })
    expect(screen.getByText('Живой урок')).toBeTruthy()
  })
})

describe('LiveHeader — что видно, только когда сломалось', () => {
  // Зелёная надпись «на связи» висела бы весь урок шумом, а вот пропажу надо
  // заметить: пустой класс и молчащий преподаватель без этого выглядят для
  // ученика одинаково.
  it('преподаватель в классе — в шапке о нём ни слова', () => {
    const { container } = renderHeader({ teacherOnline: true })
    expect(container.querySelector('.lv-top__offline')).toBeNull()
  })

  it('преподавателя нет — предупреждение', () => {
    renderHeader({ teacherOnline: false })
    expect(screen.getByText('Преподаватель не на связи')).toBeTruthy()
  })

  it('присутствие не передано (экран преподавателя) — предупреждения нет', () => {
    const { container } = renderHeader()
    expect(container.querySelector('.lv-top__offline')).toBeNull()
  })

  it('обрыв связи виден отдельно от присутствия', () => {
    renderHeader({ connected: false, teacherOnline: true })
    expect(screen.getByText('Нет соединения')).toBeTruthy()
  })
})

describe('LiveHeader — словарь', () => {
  // Значок без подписи не читается: в макете у словаря есть слово.
  it('кнопка словаря подписана', () => {
    renderHeader({ onVocab: () => {} })
    expect(screen.getAllByText('Ваш словарь').length).toBeGreaterThan(0)
  })

  it('открывать словарь нечем — кнопки нет', () => {
    const { container } = renderHeader()
    expect(container.querySelector('.lv-top__btn--vocab')).toBeNull()
  })
})
