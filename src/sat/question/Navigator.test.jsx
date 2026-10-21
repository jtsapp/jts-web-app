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
