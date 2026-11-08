// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import GUIDE from '../data/desmosGuide.json'
import DesmosGuide from './DesmosGuide.jsx'

afterEach(cleanup)

// ТЗ SAT 17.10, задача 14: формат урока 6 — единственный во всех уроках гида.
describe('Гид по Desmos — уроки только видео', () => {
  it('у каждого урока свой ролик Tutorlini с правильным номером', () => {
    const videos = GUIDE.sections.map((s) => s.video)
    expect(new Set(videos).size).toBe(videos.length)
    for (const s of GUIDE.sections) expect(s.videoCredit.name).toContain(`Desmos Lesson #${s.lesson}`)
  })

  it('каждый урок одного вида: плеер сразу, плашка, рабочий калькулятор, «Упражнения», без текстовых шагов', () => {
    const { container, getAllByRole } = render(<I18nProvider><DesmosGuide /></I18nProvider>)
    const items = getAllByRole('button').filter((b) => b.classList.contains('st-dg__item'))
    expect(items).toHaveLength(GUIDE.sections.length)
    for (const item of items) {
      fireEvent.click(item)
      const body = container.querySelector('.st-dg__body')
      expect(body.querySelector('.st-dg__video iframe')?.getAttribute('src')).not.toContain('autoplay')
      expect(body.querySelector('.st-dg__calc iframe')).not.toBeNull()
      expect(body.querySelector('.st-dg__note')).not.toBeNull()
      expect(container.querySelector('.st-dg__ex')).not.toBeNull()
      expect(body.textContent).not.toMatch(/Урок \d/)
      expect(body.querySelector('ol.st-dg__steps')).toBeNull()
      expect(body.textContent).not.toContain('Смотреть видео урока')
    }
  })
})

// Решение 08.11.2026: 23 урока плоским списком, фильтр по тегам только скрывает пункты — номера прежние.
describe('Гид по Desmos — фильтр по тегам', () => {
  it('«Данные» оставляет уроки с этим тегом и их настоящими номерами; «Все» возвращает список', () => {
    const { container, getByRole } = render(<I18nProvider><DesmosGuide /></I18nProvider>)
    const items = () => [...container.querySelectorAll('.st-dg__item')]
    fireEvent.click(getByRole('button', { name: 'Данные' }))
    const nums = items().map((b) => Number(b.querySelector('.st-dg__num').textContent))
    expect(nums.length).toBeGreaterThan(0)
    expect(nums.length).toBeLessThan(GUIDE.sections.length)
    expect(items().map((b) => b.textContent)).toContain(`${GUIDE.sections.findIndex((s) => s.id === 'l9') + 1}Регрессия`)
    // открыт урок из отфильтрованного списка
    expect(container.querySelector('.st-dg__item.is-on')).not.toBeNull()
    fireEvent.click(getByRole('button', { name: 'Все' }))
    expect(items()).toHaveLength(GUIDE.sections.length)
  })
})
