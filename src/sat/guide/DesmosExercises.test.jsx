// @vitest-environment jsdom
// «Упражнения» гида по Desmos («NEW 2», 17:3392): вопрос банка {questionId, skillId, title}, «Решить» открывает его
// окном «Все вопросы». В выгрузке упражнений пока нет — схему проверяем на подменённых данных.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../api.js', () => ({ getSatGuideStudied: vi.fn(async () => []), importSatGuideStudied: vi.fn(), markSatGuideStudied: vi.fn() }))
vi.mock('../../lib/session.js', () => ({ loadToken: () => null }))
vi.mock('../bank/BankQuestion.jsx', () => ({ default: ({ qid, answered }) => <p>вопрос {qid} {String(answered)}</p> }))
vi.mock('../data/desmosGuide.json', () => ({
  default: {
    sections: [
      {
        id: 'solve', lesson: 1, title: { ru: 'Решение уравнений' }, sub: { ru: 'Постройте обе части как две функции' },
        video: 'https://www.youtube.com/embed/abc', videoCredit: { name: 'Tutorlini', url: 'https://youtube.com/x' },
        exercises: [{ questionId: 'q-17', skillId: 'm.alg.linear', title: { ru: 'Постройте y = 3x + 12 и y = 5x − 8' } }],
      },
      { id: 'l2', lesson: 2, title: { ru: 'Второй' }, video: 'https://www.youtube.com/embed/def', exercises: [] },
    ],
  },
}))

import DesmosGuide from './DesmosGuide.jsx'

afterEach(cleanup)

describe('Гид по Desmos — упражнения', () => {
  it('строка упражнения: номер, текст, навык; «Решить» — вопрос банка в окне; без упражнений — заглушка', () => {
    const { container } = render(<I18nProvider><DesmosGuide explainLang="ru" /></I18nProvider>)
    expect(screen.getByText('Постройте обе части как две функции')).toBeTruthy()
    expect(container.querySelector('.st-dg__yt').getAttribute('href')).toBe('https://www.youtube.com/watch?v=abc')
    const row = container.querySelector('.st-dg__exlist li')
    expect(row.textContent).toContain('Постройте y = 3x + 12')
    expect(row.textContent).toContain('Math · ')
    fireEvent.click(screen.getByText('Решить'))
    expect(screen.getByText('вопрос q-17 false')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent.endsWith('Второй')))
    expect(container.querySelector('.st-dg__exlist')).toBeNull()
    expect(container.querySelector('.st-dg__ex').textContent).toContain('Упражнения к этому уроку появятся здесь.')
  })
})
