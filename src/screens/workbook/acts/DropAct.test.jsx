// @vitest-environment jsdom
// Ревью 08.10.2026: A1 L23 «Can I have some [roast|roasted potatoes|roast]
// potatoes…» — в данных «roast» дважды (опечатка источника), а верным считался
// только нулевой вариант. Выбор второго, точно такого же «roast» шёл в ошибку и
// в разбор. Верность — по тексту варианта, повтор в списке не показываем.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import { DropAct } from './InputActs.jsx'

const lesson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/practice/workbook/a1/lesson-23.json'), 'utf8'))
const ACT = lesson.acts[1]

function play() {
  const ctl = { state: { closed: {} }, revealed: false, judge: vi.fn(), miss: vi.fn() }
  const view = render(
    <I18nProvider>
      <DropAct act={ACT} ctl={ctl} />
    </I18nProvider>,
  )
  return { ctl, ...view }
}

describe('DropAct — одинаковые варианты', () => {
  it('в данных «roast» стоит дважды', () => {
    expect(ACT.lines[3]).toMatch(/\[roast\|roasted potatoes\|roast\]/)
  })

  it('в списке «roast» показан один раз, и выбор засчитывается', () => {
    const { container, ctl } = play()
    const select = container.querySelectorAll('select')[3]
    const labels = [...select.options].map((o) => o.textContent)
    expect(labels.filter((l) => l === 'roast')).toHaveLength(1)
    const roast = [...select.options].find((o) => o.textContent === 'roast')
    fireEvent.change(select, { target: { value: roast.value } })
    expect(ctl.judge).toHaveBeenCalledWith(3, true)
    expect(ctl.miss).not.toHaveBeenCalled()
  })

  it('выбор того же текста по второму индексу тоже верен', () => {
    const { container, ctl } = play()
    const select = container.querySelectorAll('select')[3]
    // Индекс 2 в данных — повтор «roast»; в разметке его может не быть, но
    // если браузер пришлёт его (старый список), судить надо по тексту.
    fireEvent.change(select, { target: { value: '2' } })
    expect(ctl.miss).not.toHaveBeenCalled()
  })
})
