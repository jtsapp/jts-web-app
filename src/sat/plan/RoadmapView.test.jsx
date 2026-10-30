// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import RoadmapView from './RoadmapView.jsx'
import PlanTab from '../tabs/PlanTab.jsx'
import { I18nProvider } from '../../i18n.jsx'
// снято с живого бэкенда (копия локальной базы, 22.10.2026): группа с 05.10, базовый пакет, Test 6 и 8 введены
import live from './__fixtures__/roadmap-live.json'


afterEach(cleanup)

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

describe('роудмап SAT по ТЗ 21.10', () => {
  // точки полосы, которые открывают карточку фазы (финиш-экзамен не выбирается)
  const points = (c) => c.querySelectorAll('button.st-strip__body')

  it('фазы с сервера: «Ритм программы» с полосой, без Challenge при базовом пакете, эйбрау «Фаза N»', () => {
    const { container } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} />)
    const text = container.textContent
    expect(text).toContain('Ритм программы')
    expect(text).toContain('Учёба → проверка → учёба → проверка → самостоятельная подготовка → экзамен')
    expect(text).toContain('Основы, часть 1')
    expect(text).toContain('Фаза 2')
    expect(text).toContain('Вы здесь')
    expect(text).toContain('Bluebook · нед. 4')
    expect(text).toContain('5 декабря')
    expect(text).not.toContain('Challenge')
    expect(text).not.toContain('Шаг')
    expect(container.querySelectorAll('.st-strip__pt')).toHaveLength(live.roadmap.roadmap.phases.length)
    expect(points(container)).toHaveLength(live.roadmap.roadmap.phases.length - 1)
  })

  it('текущая фаза ведёт к заданиям на сегодня; у другой фазы кнопки нет', () => {
    const onToday = vi.fn()
    const { container, getByRole, queryByRole } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} onToday={onToday} />)
    expect(container.textContent).toContain('1 из 12 занятий выполнено')
    fireEvent.click(getByRole('button', { name: /К заданиям на сегодня/ }))
    expect(onToday).toHaveBeenCalled()
    fireEvent.click(points(container)[3]) // фаза 4 — ещё впереди
    expect(queryByRole('button', { name: /К заданиям на сегодня/ })).toBeNull()
  })

  it('фаза по ссылке (satPhase) открывается первой', () => {
    const { container } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} initialPhase={1} />)
    expect(container.querySelector('.st-road__card h2').textContent).toBe('Диагностика')
    expect(container.querySelector('.st-strip__pt.is-selected')).not.toBeNull()
  })

  it('карточка введённого теста — состояние проверки, баллы и кнопка на экран сравнения', () => {
    const onCompare = vi.fn()
    const { container, getByRole } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} onCompare={onCompare} />)
    fireEvent.click(points(container)[2]) // фаза 3 — Bluebook Test 8
    const text = container.textContent
    expect(text).toContain('На подтверждении')
    expect(text).toContain('1250')
    // таблиц баллов и доменов в карточке больше нет — они на экране сравнения (Figma «NEW 2», 17:8528)
    expect(container.querySelector('table')).toBeNull()
    fireEvent.click(getByRole('button', { name: /Сравнение после Test 8/ }))
    expect(onCompare).toHaveBeenCalledWith(8)
  })

  it('невведённый тест — кнопка на экран формы с тестом и фазой; у Test 6 сравнения нет', () => {
    const onBluebook = vi.fn()
    const { container, getByRole, queryByRole } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} onBluebook={onBluebook} onCompare={vi.fn()} />)
    fireEvent.click(points(container)[4]) // фаза 5 — Test 10
    expect(container.querySelector('input')).toBeNull()
    fireEvent.click(getByRole('button', { name: /Ввести баллы Test 10/ }))
    expect(onBluebook).toHaveBeenCalledWith(10, 5)
    fireEvent.click(points(container)[0]) // фаза 1 — Test 6
    expect(queryByRole('button', { name: /Сравнение/ })).toBeNull()
  })

  it('отклонённый тест — комментарий куратора и «Ввести баллы снова»', () => {
    const onBluebook = vi.fn()
    const tests = live.bluebook.tests.map((x) => (x.test === 8 ? { ...x, entered: false, reviewStatus: 'REJECTED', reviewComment: 'В отчёте Math 600' } : x))
    const { container, getByRole } = wrap(<RoadmapView data={live.roadmap} bluebook={{ ...live.bluebook, tests }} schedule={live.schedule} onBluebook={onBluebook} />)
    fireEvent.click(points(container)[2])
    expect(container.textContent).toContain('Комментарий куратора: «В отчёте Math 600»')
    fireEvent.click(getByRole('button', { name: 'Ввести баллы снова' }))
    expect(onBluebook).toHaveBeenCalledWith(8, 3)
  })

  it('«План»: счётчик занятий по пакету — в полосе «Недели», неделя — из расписания группы', () => {
    const onLesson = vi.fn()
    const { container, getByRole } = wrap(<PlanTab roadmap={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} onLesson={onLesson} />)
    expect(container.querySelector('.st-plan__count')).toBeNull()
    fireEvent.click(getByRole('tab', { name: 'Неделя' }))
    expect(container.textContent).toContain(`из ${live.roadmap.roadmap.lessonCount} занятий`)
    const lesson = container.querySelector('.st-lesson')
    expect(lesson).not.toBeNull()
    fireEvent.click(lesson)
    expect(onLesson).toHaveBeenCalledWith(expect.objectContaining({ skillIds: expect.any(Array) }))
  })
})
