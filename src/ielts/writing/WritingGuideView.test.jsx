// @vitest-environment jsdom
//
// «Как писать» из задачи плана («гид: Task 1 Academic · Bar chart») открывается на своей главе и вкладке, а не на
// оглавлении: глава приходит из ?ieltsSection= (planModel.taskRoute → IeltsPage).
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const skeleton = [{ role: 'intro', what: { ru: 'Перефразируйте задание' } }]
vi.mock('../../api.js', () => ({
  getIeltsTest: vi.fn(async () => ({
    document: {
      parts: [
        { key: 't1ac', module: 'academic', task: 1, kinds: [{ key: 'line', skeleton }, { key: 'bar', skeleton }] },
        { key: 't1gt', module: 'general', task: 1, kinds: [{ key: 'formal', skeleton }] },
        { key: 'linking', module: 'both', blocks: [{ key: 'addition', groups: [{ key: 'phrases', rows: [{ phrase: 'Moreover', ex: 'Moreover, it is cheap.' }] }] }] },
      ],
    },
  })),
}))

import WritingGuideView from './WritingGuideView.jsx'

const renderGuide = (props) => render(<I18nProvider><WritingGuideView token="TOK" track="academic" onBack={() => {}} {...props} /></I18nProvider>)

describe('WritingGuideView — глава из задачи плана', () => {
  it('section «часть.вид» открывает главу на этой вкладке', async () => {
    renderGuide({ section: 't1ac.bar' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Task 1 Academic: шаблоны' })).toBeTruthy()
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Bar chart')
  })

  it('без section и с главой чужого трека — оглавление', async () => {
    renderGuide({ section: 't1gt.formal' })
    expect(await screen.findByRole('button', { name: /Task 1 Academic: шаблоны/ })).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
  })
})

describe('WritingGuideView — вкладка «Как писать» страницы Writing', () => {
  const drills = [{ id: 'WD-T1-TREND', drillKey: 'T1-TREND', part: 'T1', types: ['line', 'bar'], tys: [], title: 'Verb + adverb', minutes: 4 }]
  const catalog = { items: [{ id: 'W1', kind: 'task1', module: 'academic', category: 'line' }, { id: 'W2', kind: 'task1', module: 'academic', category: 'bar' }] }

  it('страница типа: «Задания этого типа (N)» и тренировки типа с ty; глава — через onSection', async () => {
    const onTasksOfType = vi.fn()
    const onStartDrill = vi.fn()
    const onSection = vi.fn()
    renderGuide({ section: 't1ac.line', embedded: true, catalog, drills, onTasksOfType, onStartDrill, onSection })
    fireEvent.click(await screen.findByRole('button', { name: /Задания этого типа \(1\)/ }))
    expect(onTasksOfType).toHaveBeenCalledWith('T1', 'line')
    fireEvent.click(screen.getByRole('button', { name: /Verb \+ adverb/ }))
    expect(onStartDrill).toHaveBeenCalledWith(drills[0], 'line')
    fireEvent.click(screen.getByRole('tab', { name: 'Bar chart' }))
    expect(onSection).toHaveBeenCalledWith('t1ac.bar')
  })

  it('группы блоков подписаны по-русски (GL прототипа)', async () => {
    renderGuide({ section: 'linking' })
    expect(await screen.findByRole('heading', { level: 3, name: 'Фразы' })).toBeTruthy()
  })
})
