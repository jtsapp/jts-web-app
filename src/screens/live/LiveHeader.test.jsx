// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  // Пробный урок тоже один на один, и без отдельной ветки он подписывался бы
  // «Индивидуальным» — ученик читал бы это как занятие курса, за которое уже
  // заплачено.
  it('пробное занятие названо пробным, а не индивидуальным', () => {
    renderHeader({ group: false, trial: true })
    expect(screen.getByText('Пробный урок')).toBeTruthy()
    expect(screen.queryByText('Индивидуальный урок')).toBeNull()
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

/**
 * «Крупный текст» — пожилым ученикам с телефона мелко, а размеры урока заданы
 * в пикселях: системная настройка шрифта их не двигает.
 */
describe('LiveHeader — крупный текст', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-text-scale')
  })

  it('кнопка метит документ и остаётся нажатой', () => {
    renderHeader()
    const button = screen.getByRole('button', { name: 'Крупный текст' })
    expect(button.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(button)
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('lg')
    expect(button.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(button)
    expect(document.documentElement.hasAttribute('data-text-scale')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  // Настройку включают один раз, а уроков потом много.
  it('прошлый выбор применяется при открытии урока', () => {
    localStorage.setItem('jts_text_scale', 'lg')
    renderHeader()
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('lg')
    expect(screen.getByRole('button', { name: 'Крупный текст' }).getAttribute('aria-pressed')).toBe('true')
  })
})
