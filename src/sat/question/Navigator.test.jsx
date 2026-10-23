// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { NavDialog } from './Navigator.jsx'

const session = {
  index: 0,
  questions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  answers: { a: { choice: 'A' }, c: { marked: true } },
}

function show(props) {
  return render(
    <I18nProvider>
      <NavDialog session={session} title="Все вопросы" onGo={() => {}} onClose={() => {}} {...props} />
    </I18nProvider>,
  )
}

describe('NavDialog — «Все вопросы»', () => {
  afterEach(cleanup)
  it('в учебном режиме только навигация: ни предупреждения, ни «Завершить модуль»', () => {
    show({ onFinish: vi.fn() })
    expect(screen.queryByText('Завершить модуль')).toBeNull()
  })

  it('в экзамене модуль можно завершить досрочно — с тем же предупреждением (ТЗ SAT, задача 12)', () => {
    const onFinish = vi.fn()
    show({ canFinish: true, onFinish })
    expect(screen.getByText(/После завершения модуль закроется/)).toBeTruthy()
    fireEvent.click(screen.getByText('Завершить модуль'))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('счётчики над сеткой остаются', () => {
    show({ canFinish: true, onFinish: vi.fn() })
    expect(screen.getByText(/Отвечено/)).toBeTruthy()
  })
})

describe('NavDialog — раскраска по результату (ТЗ SAT 21.10, задача 8)', () => {
  afterEach(cleanup)
  it('учебный режим: клетки верно/неверно и счётчики «Верно · Неверно · Без ответа»', () => {
    const { container } = show({ results: { a: true, b: false } })
    const cells = container.querySelectorAll('.st-navdlg__n')
    expect(cells[0].className).toContain('is-right')
    expect(cells[1].className).toContain('is-wrong')
    expect(screen.getByText('Верно · 1')).toBeTruthy()
    expect(screen.getByText('Неверно · 1')).toBeTruthy()
  })

  it('экзамен: без результатов — прежние «Отвечено» и «Без ответа», ни зелёного, ни красного', () => {
    const { container } = show({ canFinish: true, onFinish: vi.fn() })
    expect(container.querySelector('.is-right, .is-wrong')).toBeNull()
    expect(screen.queryByText(/Верно ·/)).toBeNull()
  })
})
