// @vitest-environment jsdom
//
// Дрилл Writing проходится целиком на экране: вступление → раунд → проверка с объяснением → ошибка в конце сессии
// ещё раз → итог (процент с первой попытки). Проход пишется на сервер (без связи — устройство). Дрилл банка грузится
// по id, html-раунд принимает итог только от своего iframe. Новые виды: order / match / spot / pick / free;
// упражнения разбора (attempt:<id>) и «Повторить ошибки» (review) — тем же плеером.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'

const HTML_DRILL = {
  id: 'WD-HTML', skill: 'writing', kind: 'drill', module: 'both', title: 'My manager’s name',
  rounds: [{ kind: 'html', html: '<p>Own drill</p>', why: { ru: 'Своё упражнение методиста' } }],
}
const BANK_DRILL = {
  id: 'WD-T2-MINI', skill: 'writing', kind: 'drill', module: 'both', title: 'Mini essay', aiCheck: true, category: 'task2',
  rounds: [
    { id: 'T2-MINI-001', kind: 'choice', options: ['right', 'wrong'], key: 'A', why: { ru: 'Потому что так.' } },
    { id: 'T2-MINI-002', kind: 'free', task: 'W2-001', min: 3, max: 30, checklist: [{ ru: 'Есть мнение', en: 'Opinion given' }], model: 'I strongly believe that…' },
  ],
}
const TASKS = {
  'W2-001': { id: 'W2-001', question: 'Some people think that working from home is better than working in an office.' },
}

vi.mock('../../../api.js', () => ({
  getIeltsTest: vi.fn(async (_tk, id) => ({ document: { 'WD-HTML': HTML_DRILL, 'WD-T2-MINI': BANK_DRILL, ...TASKS }[id] })),
  getIeltsAttempt: vi.fn(async () => ({
    result: {
      exercises: [
        { id: 'X1', kind: 'choice', criterion: 'GRA', options: ['has risen', 'have risen'], key: 'A', why: 'Подлежащее — the number, глагол в единственном числе.' },
        { id: 'X2', kind: 'spot', criterion: 'LR', tokens: ['It', 'rised', 'sharply'], wrong: 1, accept: ['rose'], why: 'rise — неправильный глагол.' },
      ],
    },
  })),
  getIeltsReview: vi.fn(async () => []),
  resolveIeltsReview: vi.fn(async () => null),
  getIeltsDrillProgress: vi.fn(async () => []),
  importIeltsDrillProgress: vi.fn(async () => null),
  postIeltsDrillRun: vi.fn(async (_tk, testId, b) => ({ testId, best: b.pct, runs: 1, at: 'now' })),
}))

import * as api from '../../../api.js'
import WritingDrillView from './WritingDrillView.jsx'
import { sampleDrill } from './sampleDrills.js'

const renderDrill = (props) =>
  render(
    <I18nProvider>
      <WritingDrillView token="TOK" track="academic" onBack={() => {}} rng={() => 0.99} {...props} />
    </I18nProvider>,
  )
const next = () => fireEvent.click(screen.getByRole('button', { name: /^(Дальше|Результат)$/ }))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('WritingDrillView', () => {
  it('пробный дрилл: вердикт с объяснением, ошибка — ещё раз в конце, итог по первой попытке на устройстве', async () => {
    const onRecorded = vi.fn()
    renderDrill({ drillId: 'WD-SAMPLE-LINKING', onRecorded })
    expect(screen.getByRole('heading', { level: 2, name: 'Связки: контраст, следствие, пример' })).toBeTruthy()
    expect(screen.getByText('пробное задание')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    const doc = sampleDrill('WD-SAMPLE-LINKING')
    for (let i = 0; i < doc.rounds.length; i++) {
      expect(screen.getByText(`Задание ${i + 1} из ${i === 0 ? 3 : 4}`)).toBeTruthy()
      // первый раунд — мимо, остальные — верно (rng 0.99 оставляет раунды и варианты на месте)
      const round = doc.rounds[i]
      fireEvent.click(screen.getByRole('button', { name: new RegExp(i === 0 ? round.options[1] : round.options[0]) }))
      expect(screen.getByRole('status').textContent).toContain(i === 0 ? 'Неверно' : 'Верно')
      if (i === 0) expect(screen.getByText('Этот вопрос вернётся в конце тренировки.')).toBeTruthy()
      next()
    }
    // повтор ошибки — в конце той же сессии
    expect(screen.getByText(/Задание 4 из 4 · повтор ошибки/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(doc.rounds[0].options[0]) }))
    expect(document.activeElement.textContent).toBe('Результат')
    next()
    expect(screen.getByRole('heading', { name: 'С первой попытки: 2 из 3' })).toBeTruthy()
    expect(screen.getByText('67%')).toBeTruthy()
    expect(screen.getByText('Пока не пройдено — нужно от 80%')).toBeTruthy()
    expect(screen.getByText(/However, it is often overcrowded/)).toBeTruthy()
    // пробный дрилл — только устройство, на сервер не уходит
    await waitFor(() => expect(onRecorded).toHaveBeenCalled())
    expect(api.postIeltsDrillRun).not.toHaveBeenCalled()
    expect(onRecorded.mock.calls[0][0]({})).toEqual({ 'WD-SAMPLE-LINKING': expect.objectContaining({ runs: 1, best: 2, total: 3 }) })
    expect(JSON.parse(localStorage.getItem('jts_ielts_wdrills_v1'))['WD-SAMPLE-LINKING'].runs).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Ещё раз (новые вопросы)' }))
    expect(screen.getByText('Задание 1 из 3')).toBeTruthy()
  })

  it('сортировка и впиши ответ: «Проверить» — когда ответ дан', () => {
    renderDrill({ drillId: 'WD-SAMPLE-GT-REGISTER', track: 'general' })
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    // порядок сессии — от узнавания к воспроизведению: выбор варианта раньше сортировки
    fireEvent.click(screen.getByRole('button', { name: /Dear Mr Collins/ }))
    next()
    const check = screen.getByRole('button', { name: 'Проверить' })
    expect(check.disabled).toBe(true)
    const round = sampleDrill('WD-SAMPLE-GT-REGISTER').rounds.find((r) => r.kind === 'sort')
    for (const it of round.items) {
      const group = screen.getByRole('group', { name: it.text })
      fireEvent.click(group.querySelectorAll('button')[it.bin === 'formal' ? 0 : 1])
    }
    fireEvent.click(check)
    expect(screen.getByRole('status').textContent).toContain('Верно')
  })

  it('новые виды по порядку сессии: match → pick → order → spot → free; теория, бейдж типа и «применить в задании»', async () => {
    const onGuide = vi.fn()
    const onOpenTask = vi.fn()
    const catalog = [
      { id: 'W1-AC-1', kind: 'task1', module: 'academic', category: 'line', title: 'City zoo visitors' },
      { id: 'W1-AC-2', kind: 'task1', module: 'academic', category: 'bar', title: 'Bars' },
    ]
    renderDrill({ drillId: 'WD-SAMPLE-T1-LINE', ty: 'line', catalog, onGuide, onOpenTask })
    // 5 раундов типа line — фильтр применён, бейдж типа в шапке; «Теория» ведёт на главу типа
    expect(screen.getByText('Line graph')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Теория' }))
    expect(onGuide).toHaveBeenCalledWith('t1ac.line')
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))

    // match — выпадающие списки
    expect(screen.getByRole('heading', { name: 'Сопоставьте пары' })).toBeTruthy()
    const round = sampleDrill('WD-SAMPLE-T1-LINE').rounds.find((r) => r.kind === 'match')
    const check = screen.getByRole('button', { name: 'Проверить' })
    round.pairs.forEach((p, i) => {
      expect(check.disabled).toBe(true)
      fireEvent.change(screen.getByRole('combobox', { name: p[0] }), { target: { value: String(i) } })
    })
    fireEvent.click(check)
    expect(screen.getByRole('status').textContent).toContain('Верно')
    next()

    // pick — точки графика (TaskVisual в режиме pick): checkbox с aria-checked, Enter/Пробел с клавиатуры
    const points = await screen.findAllByRole('checkbox')
    expect(points).toHaveLength(6)
    fireEvent.click(points[0])
    fireEvent.keyDown(points[2], { key: 'Enter' })
    fireEvent.click(points[4])
    fireEvent.click(points[5])
    fireEvent.click(points[1])
    fireEvent.click(points[1])
    expect(points[0].getAttribute('aria-checked')).toBe('true')
    expect(points[1].getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('Отмечено: 4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }))
    expect(screen.getByRole('status').textContent).toContain('Верно')
    next()

    // order — перемешано не в верном порядке; кнопки ↑ ↓ с клавиатуры, фокус едет со строкой
    const first = 'Introduction: paraphrase of the task'
    const rows = () => [...document.querySelectorAll('.ih-wdrill__ordertext')].map((x) => x.textContent)
    expect(rows()[0]).not.toBe(first)
    while (rows()[0] !== first) fireEvent.click(screen.getByRole('button', { name: `Выше: ${first}` }))
    expect(document.activeElement.getAttribute('aria-label')).toMatch(/: Introduction/)
    expect(rows()).toEqual(sampleDrill('WD-SAMPLE-T1-LINE').rounds[0].items)
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }))
    expect(screen.getByRole('status').textContent).toContain('Верно')
    next()

    // spot — нажать слово с ошибкой, вписать исправление
    fireEvent.click(within(screen.getByRole('group', { name: 'Слова предложения' })).getByRole('button', { name: 'at' }))
    fireEvent.change(screen.getByLabelText('Как правильно?'), { target: { value: 'in' } })
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }))
    expect(screen.getByRole('status').textContent).toContain('Верно')
    next()

    // free — живые автопроверки, затем самопроверка и образец
    const box = screen.getByRole('textbox', { name: 'Ваш ответ' })
    fireEvent.change(box, { target: { value: 'The line chart illustrates how many people visited a zoo over eight years.' } })
    expect(screen.getByText(/Длина: 13 слов/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }))
    expect(screen.getByRole('status').textContent).toContain('Автопроверка пройдена')
    expect(screen.getByText('Образец:')).toBeTruthy()
    const tick = screen.getByRole('checkbox', { name: /Указан тип графика/ })
    fireEvent.click(tick)
    expect(tick.checked).toBe(true)
    next()

    expect(screen.getByText('100%')).toBeTruthy()
    expect(screen.getByText('Пройдено')).toBeTruthy()
    // «Применить в задании» — задания этого типа
    expect(screen.queryByRole('button', { name: 'Bars' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'City zoo visitors' }))
    expect(onOpenTask).toHaveBeenCalledWith('W1-AC-1')
  })

  it('дрилл банка: проход на сервер с id ошибок и верных; ИИ-проверка мини-эссе с исчерпанной квотой', async () => {
    const onRecorded = vi.fn()
    const fetchMock = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ error: 'quota' }) }))
    vi.stubGlobal('fetch', fetchMock)
    renderDrill({ drillId: 'WD-T2-MINI', onRecorded })
    fireEvent.click(await screen.findByRole('button', { name: 'Начать' }))
    fireEvent.click(screen.getByRole('button', { name: /wrong/ }))
    next()
    // free: текст задания подтягивается по task
    expect(await screen.findByText(/working from home is better/)).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Ваш ответ' }), { target: { value: 'I strongly believe home office wins.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }))
    fireEvent.click(screen.getByRole('button', { name: 'Проверить ИИ' }))
    expect(await screen.findByText('Лимит проверок ИИ на сегодня исчерпан — попробуйте завтра.')).toBeTruthy()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ testId: 'WD-T2-MINI', roundId: 'T2-MINI-002', text: 'I strongly believe home office wins.', uiLang: 'ru' })
    next() // повтор choice
    fireEvent.click(screen.getByRole('button', { name: /right/ }))
    next()
    await waitFor(() => expect(api.postIeltsDrillRun).toHaveBeenCalled())
    // free в очередь ошибок не идёт
    expect(api.postIeltsDrillRun).toHaveBeenCalledWith('TOK', 'WD-T2-MINI', { pct: 50, wrong: ['T2-MINI-001'], right: [], source: 'drill' })
    await waitFor(() => expect(onRecorded).toHaveBeenCalled())
    expect(onRecorded.mock.calls[0][0]({})).toEqual({ 'WD-T2-MINI': { runs: 1, best: 50, total: 100, at: 'now' } })
    vi.unstubAllGlobals()
  })

  it('упражнения разбора (attempt:<id>): why строкой, проход — на id попытки с source attempt', async () => {
    renderDrill({ drillId: 'attempt:77' })
    expect(screen.getByRole('heading', { level: 2, name: 'Закрепление: ваши ошибки' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Начать' }))
    fireEvent.click(screen.getByRole('button', { name: /has risen/ }))
    expect(screen.getByText('Подлежащее — the number, глагол в единственном числе.')).toBeTruthy()
    next()
    // spot: не то слово — сразу неверно, с верным исправлением
    fireEvent.click(screen.getByRole('button', { name: 'sharply' }))
    expect(screen.getByRole('status').textContent).toContain('Неверно')
    expect(screen.getByRole('status').textContent).toContain('rose')
    next()
    fireEvent.click(screen.getByRole('button', { name: 'rised' }))
    fireEvent.change(screen.getByLabelText('Как правильно?'), { target: { value: 'rose' } })
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }))
    next()
    await waitFor(() => expect(api.postIeltsDrillRun).toHaveBeenCalledWith('TOK', '77', { pct: 50, wrong: ['X2'], right: ['X1'], source: 'attempt' }))
  })

  it('«Повторить ошибки»: раунды из очереди сервера, верный ответ убирает раунд из очереди', async () => {
    api.getIeltsReview.mockResolvedValueOnce([{ testId: 'WD-T2-MINI', roundId: 'T2-MINI-001', source: 'drill' }, { testId: 'WD-T2-MINI', roundId: 'GONE', source: 'drill' }])
    renderDrill({ drillId: 'review' })
    expect(screen.getByRole('heading', { level: 2, name: 'Повторить ошибки' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Начать' }))
    expect(screen.getByText('Задание 1 из 1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /right/ }))
    expect(api.resolveIeltsReview).toHaveBeenCalledWith('TOK', [{ testId: 'WD-T2-MINI', roundId: 'T2-MINI-001' }])
    next()
    expect(api.postIeltsDrillRun).not.toHaveBeenCalled()
  })

  it('пустая очередь повторения — понятное пустое состояние', async () => {
    renderDrill({ drillId: 'review' })
    expect(await screen.findByText('Ошибок для повторения нет')).toBeTruthy()
  })

  it('дрилл банка — по id; html-раунд засчитывает итог только своего iframe', async () => {
    renderDrill({ drillId: 'WD-HTML' })
    fireEvent.click(await screen.findByRole('button', { name: 'Начать' }))
    const frame = document.querySelector('iframe')
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    // чужое окно — не в счёт
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { jtsDrill: 'result', score: 1, total: 1 }, source: window })))
    expect(screen.queryByRole('status')).toBeNull()
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { jtsDrill: 'result', score: 2, total: 2 }, source: frame.contentWindow })))
    expect(screen.getByRole('status').textContent).toContain('Верно')
    next()
    expect(screen.getByRole('heading', { name: 'С первой попытки: 1 из 1' })).toBeTruthy()
  })
})
