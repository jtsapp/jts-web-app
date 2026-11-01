// @vitest-environment jsdom
//
// Экран разбора Writing (ТЗ §9.4): баннеры ограничений, полосы критериев с числом замечаний, «Закрепление», пометки в
// тексте с переходом к карточке, фильтр по критериям, тренировки под слабые места. Старая работа (issue/correction,
// без para и caps) открывается как раньше.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const essay = 'Many people thinks the environment is important.\n\nGovernments must to act now. Individuals can recycle.'
let result
vi.mock('../../api.js', () => ({
  getIeltsAttempt: vi.fn(async () => ({
    testId: 'W2-101',
    attempt: { id: 77, band: 5.5, finishedAt: '2026-11-01T10:00:00Z', timeSec: 2000 },
    document: { id: 'W2-101', kind: 'task2', taskKind: 'task2', essayType: 'opinion', title: 'Who should protect the environment?', question: 'Q' },
    answers: { text: essay },
    result,
  })),
  getIeltsTest: vi.fn(async () => ({ document: { criteria: [] } })),
  getIeltsWritingModel: vi.fn(async () => null),
  saveIeltsSelfCheck: vi.fn(async () => ({})),
  assessIeltsWriting: vi.fn(),
}))

import WritingWorkView from './WritingWorkView.jsx'

const renderWork = (props = {}) =>
  render(<I18nProvider><WritingWorkView token="TOK" attemptId={77} onRetry={() => {}} {...props} /></I18nProvider>)

beforeEach(() => {
  localStorage.clear()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('WritingWorkView — разбор по ТЗ §9.4', () => {
  it('новый разбор: баннеры, замечания по критериям, закрепление, пометки и тренировки', async () => {
    result = {
      status: 'done',
      criteria: { taskResponse: 5, coherenceCohesion: 6, lexicalResource: 7, grammaticalRange: 5.5 },
      caps: ['under_length', 'copied_intro'],
      copied: 9,
      errors: [
        { quote: 'people thinks', para: 1, criterion: 'grammaticalRange', type: 'grammar', why: 'Согласование.', fix: 'people think', rule: 'people — мн. число', quoteFound: true },
        { quote: 'must to act', para: 2, criterion: 'grammaticalRange', type: 'grammar', why: 'После must — без to.', fix: 'must act', rule: '', quoteFound: true },
        { quote: 'invented quote', para: 2, criterion: 'taskResponse', type: 'task', why: 'Мало примеров.', fix: 'Add an example.', rule: '', quoteFound: false },
      ],
      exercises: [{ id: 'X1', kind: 'choice', options: ['a', 'b'], key: 'A' }, { id: 'X2', kind: 'type', text: '___', accept: ['x'] }],
      details: { criteriaNotes: [{ criterion: 'taskResponse', why: 'Позиция есть.', nextBand: 'Добавьте пример.' }] },
    }
    const onPractice = vi.fn()
    const onDrill = vi.fn()
    const onGuide = vi.fn()
    renderWork({ onPractice, onDrill, onGuide, drills: [{ id: 'WD-T2-PLAN', kind: 'drill', title: 'Plan an essay' }, { id: 'WD-T2-COMPLEX', kind: 'drill', title: 'Complex sentences' }] })

    expect(await screen.findByText('Меньше минимума слов: Task Response не выше 5.')).toBeTruthy()
    expect(screen.getByText(/Вступление почти скопировано/)).toBeTruthy()
    expect(screen.getByText('Grammatical Range and Accuracy', { selector: '.ih-wrev__barhead span' })).toBeTruthy()
    expect(screen.getByText('2 замеч.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Начать закрепление · 2' }))
    expect(onPractice).toHaveBeenCalledWith(77)

    // пометка с номером → её карточка подсвечена; ненайденная цитата — общим замечанием без ✗
    const mark = screen.getByRole('button', { name: /^must to act/ })
    fireEvent.keyDown(mark, { key: 'Enter' })
    expect(document.getElementById('ih-werr-2').className).toContain('is-hl')
    expect(screen.getByText('общее замечание')).toBeTruthy()
    expect(screen.queryByText('✗ invented quote')).toBeNull()

    // фильтр: только Task Response — карточек грамматики нет
    fireEvent.click(screen.getByRole('button', { name: /^Task Response/ }))
    expect(document.getElementById('ih-werr-1')).toBeNull()
    expect(document.getElementById('ih-werr-3')).toBeTruthy()

    // тренировки: слабые TA и GRA, только Task 2 и только те, что есть в банке; запуск — с типом задания
    fireEvent.click(screen.getByRole('button', { name: 'Complex sentences' }))
    expect(onDrill).toHaveBeenCalledWith('WD-T2-COMPLEX', 'opinion')
    fireEvent.click(screen.getByRole('button', { name: 'Теория этого типа' }))
    expect(onGuide).toHaveBeenCalledWith('t2.opinion')
  })

  it('старая работа (issue/correction, без caps и para) открывается без новых блоков', async () => {
    result = {
      status: 'done',
      criteria: { taskResponse: 7, coherenceCohesion: 7, lexicalResource: 7, grammaticalRange: 7 },
      errors: [{ quote: 'must to act', issue: 'лишнее to', correction: 'must act', criterion: 'grammaticalRange' }],
    }
    renderWork()
    expect(await screen.findByText('лишнее to')).toBeTruthy()
    expect(screen.getByText('✓ must act')).toBeTruthy()
    expect(screen.queryByText(/Начать закрепление/)).toBeNull()
    expect(document.querySelector('.ih-wrev__cap')).toBeNull()
  })
})
