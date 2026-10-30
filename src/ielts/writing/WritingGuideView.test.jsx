// @vitest-environment jsdom
//
// «Как писать» из задачи плана («гид: Task 1 Academic · Bar chart») открывается на своей главе и вкладке, а не на
// оглавлении: глава приходит из ?ieltsSection= (planModel.taskRoute → IeltsPage).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const skeleton = [{ role: 'intro', what: { ru: 'Перефразируйте задание' } }]
vi.mock('../../api.js', () => ({
  getIeltsTest: vi.fn(async () => ({
    document: {
      parts: [
        { key: 't1ac', module: 'academic', task: 1, kinds: [{ key: 'line', skeleton }, { key: 'bar', skeleton }] },
        { key: 't1gt', module: 'general', task: 1, kinds: [{ key: 'formal', skeleton }] },
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
