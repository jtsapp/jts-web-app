// @vitest-environment jsdom
//
// Дрилл Writing проходится целиком на экране: вступление → раунд → проверка с объяснением → итог; проход пишется в
// прогресс устройства. Дрилл банка грузится по id, html-раунд принимает итог только от своего iframe.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'

const HTML_DRILL = {
  id: 'WD-HTML', skill: 'writing', kind: 'drill', module: 'both', title: 'My manager’s name',
  rounds: [{ kind: 'html', html: '<p>Own drill</p>', why: { ru: 'Своё упражнение методиста' } }],
}
vi.mock('../../../api.js', () => ({ getIeltsTest: vi.fn(async () => ({ document: HTML_DRILL })) }))

import WritingDrillView from './WritingDrillView.jsx'
import { sampleDrill } from './sampleDrills.js'

const renderDrill = (props) => render(<I18nProvider><WritingDrillView token="TOK" track="academic" onBack={() => {}} onBackToLearn={() => {}} rng={() => 0.99} {...props} /></I18nProvider>)

beforeEach(() => localStorage.clear())

describe('WritingDrillView', () => {
  it('пробный дрилл: раунды по одному, вердикт с объяснением, итог с ошибками и запись прохода', () => {
    const onRecorded = vi.fn()
    renderDrill({ drillId: 'WD-SAMPLE-LINKING', onRecorded })
    expect(screen.getByRole('heading', { level: 2, name: 'Связки: контраст, следствие, пример' })).toBeTruthy()
    expect(screen.getByText('пробное задание')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    const doc = sampleDrill('WD-SAMPLE-LINKING')
    for (let i = 0; i < doc.rounds.length; i++) {
      expect(screen.getByText(`Задание ${i + 1} из ${doc.rounds.length}`)).toBeTruthy()
      // первый раунд — мимо, остальные — верно (rng 0.99 оставляет раунды и варианты на месте)
      const round = doc.rounds[i]
      const pick = i === 0 ? round.options[1] : round.options[0]
      fireEvent.click(screen.getByRole('button', { name: new RegExp(pick) }))
      expect(screen.getByText(i === 0 ? 'Неверно' : 'Верно')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: i + 1 < doc.rounds.length ? 'Дальше' : 'Результат' }))
    }
    expect(screen.getByRole('heading', { name: 'Верно 2 из 3' })).toBeTruthy()
    // в разборе — предложение с верной связкой и объяснение
    expect(screen.getByText(/However, it is often overcrowded/)).toBeTruthy()
    expect(onRecorded).toHaveBeenCalledWith({ 'WD-SAMPLE-LINKING': expect.objectContaining({ runs: 1, best: 2, total: 3 }) })
    expect(JSON.parse(localStorage.getItem('jts_ielts_wdrills_v1'))['WD-SAMPLE-LINKING'].runs).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' }))
    expect(screen.getByText('Задание 1 из 3')).toBeTruthy()
  })

  it('сортировка и впиши ответ: «Проверить» — когда ответ дан', () => {
    renderDrill({ drillId: 'WD-SAMPLE-GT-REGISTER', track: 'general' })
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    const check = screen.getByRole('button', { name: 'Проверить' })
    expect(check.disabled).toBe(true)
    const round = sampleDrill('WD-SAMPLE-GT-REGISTER').rounds[0]
    for (const it of round.items) {
      const group = screen.getByRole('group', { name: it.text })
      fireEvent.click(group.querySelectorAll('button')[it.bin === 'formal' ? 0 : 1])
    }
    fireEvent.click(check)
    expect(screen.getByText('Верно')).toBeTruthy()
  })

  it('дрилл банка — по id; html-раунд засчитывает итог только своего iframe', async () => {
    renderDrill({ drillId: 'WD-HTML' })
    fireEvent.click(await screen.findByRole('button', { name: 'Начать' }))
    const frame = document.querySelector('iframe')
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    // чужое окно — не в счёт
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { jtsDrill: 'result', score: 1, total: 1 }, source: window })))
    expect(screen.queryByText('Верно')).toBeNull()
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { jtsDrill: 'result', score: 2, total: 2 }, source: frame.contentWindow })))
    expect(screen.getByText('Верно')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Результат' }))
    expect(screen.getByRole('heading', { name: 'Верно 1 из 1' })).toBeTruthy()
  })
})
