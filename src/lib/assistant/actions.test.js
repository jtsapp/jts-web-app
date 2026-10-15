import { describe, it, expect } from 'vitest'
import { actionMarker, actionTail, createActionFilter, createServiceTailFilter } from './actions.js'
import { REPORTED_STREAM_MARKER } from './report.js'

// Прогнать текст через фильтр кусками заданного размера — как стрим модели.
function run(text, size = 3) {
  const f = createActionFilter()
  let out = ''
  for (let i = 0; i < text.length; i += size) out += f.push(text.slice(i, i + size))
  out += f.flush()
  return { out, action: f.action() }
}

describe('метки действий в ответе модели', () => {
  it('предложение открыть: метка вырезана, действие — offer', () => {
    for (const size of [1, 2, 5, 100]) {
      const { out, action } = run('Это в Практике. Открыть?\n[[OPEN practice-speaking]]', size)
      expect(out).toBe('Это в Практике. Открыть?\n')
      expect(action).toEqual({ kind: 'open', target: 'practice-speaking', now: false })
    }
  })

  it('_NOW — выполнить сразу; тур — только у раздела с туром', () => {
    expect(run('Открываю.\n[[OPEN_NOW vocab]]').action).toEqual({ kind: 'open', target: 'vocab', now: true })
    expect(run('Начинаю.\n[[TOUR_NOW practice]]').action).toEqual({ kind: 'tour', target: 'practice', now: true })
    // У «Чтения» тура нет — метку вырезаем, но действия нет.
    const noTour = run('Покажу.\n[[TOUR reading]]')
    expect(noTour.out).toBe('Покажу.\n')
    expect(noTour.action).toBeNull()
  })

  it('раздел не из белого списка: метка не видна ученику и не становится действием', () => {
    const { out, action } = run('Открываю.\n[[OPEN_NOW ielts-mock]]')
    expect(out).toBe('Открываю.\n')
    expect(action).toBeNull()
  })

  it('обычные скобки и чужие метки — это текст', () => {
    expect(run('Массив [[1, 2]] и [ссылка]').out).toBe('Массив [[1, 2]] и [ссылка]')
    expect(run('Конец [').out).toBe('Конец [')
    // Незакрытая «[[» длиннее любой метки — отпускаем как текст, а не держим до конца ответа.
    const long = `[[${'а'.repeat(80)}`
    expect(run(long).out).toBe(long)
  })

  it('берётся первая метка, остальные тоже вырезаются', () => {
    const { out, action } = run('А [[OPEN vocab]] и [[OPEN_NOW home]]')
    expect(out).toBe('А  и ')
    expect(action).toEqual({ kind: 'open', target: 'vocab', now: false })
  })

  it('метка для истории — в формате модели', () => {
    expect(actionMarker({ kind: 'open', target: 'vocab', now: false })).toBe('[[OPEN vocab]]')
    expect(actionMarker({ kind: 'tour', target: 'home', now: true })).toBe('[[TOUR_NOW home]]')
    expect(actionMarker(null)).toBe('')
  })
})

describe('служебный хвост стрима на клиенте', () => {
  const read = (text, size = 4) => {
    const f = createServiceTailFilter()
    let out = ''
    for (let i = 0; i < text.length; i += size) out += f.push(text.slice(i, i + size))
    out += f.flush()
    return { out, reported: f.reported, action: f.action }
  }

  it('действие и «отчёт записан» срезаются с экрана и разбираются', () => {
    const tail = actionTail({ kind: 'open', target: 'practice-speaking', now: true }) + REPORTED_STREAM_MARKER
    const r = read(`Открываю Практику.\n${tail}`)
    expect(r.out).toBe('Открываю Практику.\n')
    expect(r.reported).toBe(true)
    expect(r.action).toEqual({ kind: 'open', target: 'practice-speaking', now: true })
  })

  it('без хвоста — весь текст виден, действий нет', () => {
    const r = read('Просто ответ [[без метки]].')
    expect(r.out).toBe('Просто ответ [[без метки]].')
    expect(r.reported).toBe(false)
    expect(r.action).toBeNull()
  })

  it('только «отчёт записан» — как раньше', () => {
    const r = read(`Передала.${REPORTED_STREAM_MARKER}`)
    expect(r.out).toBe('Передала.')
    expect(r.reported).toBe(true)
    expect(r.action).toBeNull()
  })

  it('действие с разделом не из списка клиент не выполнит', () => {
    expect(read('Ок.[[ASST_ACTION open ielts-mock now]]').action).toBeNull()
  })
})
