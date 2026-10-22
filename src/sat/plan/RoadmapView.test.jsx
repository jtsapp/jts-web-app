// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import RoadmapView from './RoadmapView.jsx'
import PlanTab from '../tabs/PlanTab.jsx'
import { I18nProvider } from '../../i18n.jsx'
// снято с живого бэкенда (копия локальной базы, 22.10.2026): группа с 05.10, базовый пакет, Test 6 и 8 введены
import live from './__fixtures__/roadmap-live.json'

vi.mock('../../api.js', () => ({ submitSatBluebook: vi.fn(() => Promise.resolve({})) }))

afterEach(cleanup)

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

describe('роудмап SAT по ТЗ 21.10', () => {
  it('фазы с сервера: без Challenge при базовом пакете, счёт «фаза N из 5»', () => {
    const { container } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} />)
    const text = container.textContent
    expect(text).toContain('Основы, часть 1')
    expect(text).toContain('Фаза 2 из 5')
    expect(text).not.toContain('Challenge')
    expect(text).not.toContain('Глубокая практика')
    // узлов на дороге — фазы без дня экзамена (у него трофей)
    expect(container.querySelectorAll('.st-road__node')).toHaveLength(live.roadmap.roadmap.phases.length - 1)
  })

  it('карточка теста — баллы Bluebook с приростом и домены отдельным блоком', () => {
    const { container } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} />)
    fireEvent.click(container.querySelectorAll('.st-road__node')[2]) // фаза 3 — Bluebook Test 8
    const text = container.textContent
    expect(text).toContain('Баллы по тестам')
    expect(text).toContain('+90')
    expect(text).toContain('Карта доменов')
    expect(text).toContain('Ждёт подтверждения куратора')
  })

  it('неведённый тест — форма трёх баллов, Total считается сам', () => {
    const { container } = wrap(<RoadmapView data={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} />)
    fireEvent.click(container.querySelectorAll('.st-road__node')[4]) // фаза 5 — Test 10
    const inputs = container.querySelectorAll('.st-scoreform input[type="number"]')
    fireEvent.change(inputs[0], { target: { value: '610' } })
    fireEvent.change(inputs[1], { target: { value: '650' } })
    expect(container.querySelector('.st-scoreform__total b').textContent).toBe('1260')
  })

  it('«План»: счётчик занятий по пакету, неделя — из расписания группы', () => {
    const onLesson = vi.fn()
    const { container, getByRole } = wrap(<PlanTab roadmap={live.roadmap} bluebook={live.bluebook} schedule={live.schedule} onLesson={onLesson} />)
    expect(container.textContent).toContain(`из ${live.roadmap.roadmap.lessonCount} занятий`)
    fireEvent.click(getByRole('tab', { name: 'Неделя' }))
    const lesson = container.querySelector('.st-lesson')
    expect(lesson).not.toBeNull()
    fireEvent.click(lesson)
    expect(onLesson).toHaveBeenCalledWith(expect.objectContaining({ skillIds: expect.any(Array) }))
  })
})
