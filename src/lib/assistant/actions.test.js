import { describe, it, expect } from 'vitest'
import { actionMarker, actionTail, buttonOnScreen, createActionFilter, createServiceTailFilter } from './actions.js'
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

  it('_NOW — выполнить сразу', () => {
    expect(run('Открываю.\n[[OPEN_NOW vocab]]').action).toEqual({ kind: 'open', target: 'vocab', now: true })
  })

  // Тур «от Луны» убран 28.10.2026, но метку тура модель ещё может написать по
  // старой истории разговора: ученик её не видит, а раздел просто открывается.
  it('метка прежнего тура — открыть раздел', () => {
    const now = run('Начинаю.\n[[TOUR_NOW practice]]')
    expect(now.out).toBe('Начинаю.\n')
    expect(now.action).toEqual({ kind: 'open', target: 'practice', now: true })
    expect(run('Показать?\n[[TOUR reading]]').action).toEqual({ kind: 'open', target: 'reading', now: false })
  })

  it('форму метки прощаем: «id=», кавычки, двоеточие', () => {
    expect(run('Открыть?\n[[OPEN id="practice-listening"]]').action).toEqual({ kind: 'open', target: 'practice-listening', now: false })
    expect(run('Открываю.\n[[OPEN_NOW: vocab]]').action).toEqual({ kind: 'open', target: 'vocab', now: true })
    expect(run('Тур?\n[[TOUR «home»]]').out).toBe('Тур?\n')
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

  it('хвост тура (прежний сервер) — не действие', () => {
    const r = read('Ок.[[ASST_ACTION tour practice now]]')
    expect(r.out).toBe('Ок.')
    expect(r.action).toBeNull()
  })
})

describe('метка нажатия', () => {
  const screenText = 'Урок 3\n[кнопка #1 «Послушать»]\n[кнопка #2 «Проверить» (выбрано)]\n[кнопка «Выйти»]'
  it('CLICK_NOW с номером из снимка — действие с подписью', () => {
    const f = createActionFilter({ screenText })
    expect(f.push('Нажимаю «Проверить».\n[[CLICK_NOW 2]]') + f.flush()).toBe('Нажимаю «Проверить».\n')
    expect(f.action()).toEqual({ kind: 'click', target: '2', label: 'Проверить', now: true })
  })
  it('прощает «#», номер не из снимка — не действие', () => {
    const a = createActionFilter({ screenText })
    a.push('[[CLICK #1]]')
    expect(a.action()).toEqual({ kind: 'click', target: '1', label: 'Послушать', now: false })
    const b = createActionFilter({ screenText })
    expect(b.push('[[CLICK_NOW 9]]') + b.flush()).toBe('')
    expect(b.action()).toBe(null)
  })
  it('метка по кускам стрима', () => {
    const f = createActionFilter({ screenText })
    expect(['Жму.', '[[CLI', 'CK_NOW', ' 1]]'].map((c) => f.push(c)).join('') + f.flush()).toBe('Жму.')
    expect(f.action()?.label).toBe('Послушать')
  })
  it('buttonOnScreen — только кнопки с номером', () => {
    expect(buttonOnScreen(screenText, 1)).toBe('Послушать')
    expect(buttonOnScreen(screenText, '2')).toBe('Проверить')
    expect(buttonOnScreen(screenText, 3)).toBe(null)
  })
  it('хвост стрима и метка истории', () => {
    const action = { kind: 'click', target: '2', label: 'Проверить', now: true }
    expect(actionTail(action)).toBe('[[ASST_ACTION click 2 now «Проверить»]]')
    expect(actionMarker(action)).toBe('[[CLICK_NOW 2]]')
    const f = createServiceTailFilter()
    f.push(`Нажимаю.${actionTail(action)}`)
    f.flush()
    expect(f.action).toEqual(action)
  })
})
