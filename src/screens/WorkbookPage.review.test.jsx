// @vitest-environment jsdom
// Ревью 08.10.2026, «Разбор ошибок» воркбука:
//  1) экран, показанный целиком (читать/слушать, sort, quiz…), терял повторную
//     ошибку — индексы уже исходные, а resolveMiss переводил их ещё раз
//     (orig[m]) — и промах исчезал или подменялся чужим;
//  2) если после раунда на том же экране оставались промахи, он открывался
//     тем же ключом и НЕ перемонтировался: поле уже «решено» и заблокировано,
//     «Дальше» активна, и раунд повторялся бесконечно.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../practice/usePracticeEntitlement.js', () => ({
  usePracticeEntitlement: () => ({ allowed: true, loading: false, check: async () => true }),
}))
vi.mock('../lib/useTimeOnTask.js', () => ({ useTimeOnTask: () => {} }))

import WorkbookPage from './WorkbookPage.jsx'
import { markAct, missFor } from '../practice/workbook/workbookProgress.js'

beforeEach(() => {
  globalThis.fetch = vi.fn(async (url) => {
    const file = path.join(process.cwd(), 'public', String(url).split('?')[0])
    if (!fs.existsSync(file)) return { ok: false, status: 404, json: async () => null }
    return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) }
  })
})

function open() {
  render(
    <I18nProvider>
      <WorkbookPage userName="T" userLevel="A0" token={null} initialTarget={{ level: 'a0' }} onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
  return screen.findByText('Разбор ошибок').then((b) => fireEvent.click(b))
}

const field = (q) => screen.getByLabelText(q)
const typeIn = (q, value) => {
  fireEvent.change(field(q), { target: { value } })
  fireEvent.keyDown(field(q), { key: 'Enter' })
}
const nextBtn = () => screen.getByRole('button', { name: /^Дальше/ })
const next = () => fireEvent.click(nextBtn())

describe('Разбор ошибок воркбука', () => {
  it('повторный раунд того же экрана начинается с чистого листа', async () => {
    // A0 L2, экран 3 (type): промахи в пунктах 1 и 4.
    markAct('a0', 2, 3, [1, 4])
    await open()
    await waitFor(() => field('you are → ___'))
    typeIn('you are → ___', 'you is') // снова ошибся
    typeIn('you are → ___', 'you’re')
    typeIn('it is → ___', 'it’s')
    next()
    expect(missFor('a0', 2, 3)).toEqual([1])

    // Тот же экран, теперь только пункт 1 — поле пустое и доступно.
    await waitFor(() => field('you are → ___'))
    expect(field('you are → ___').value).toBe('')
    expect(field('you are → ___').disabled).toBe(false)
    expect(nextBtn().disabled).toBe(true)
  })

  it('экран целиком (чтение + «верно/неверно»): повторная ошибка остаётся своей', async () => {
    // A0 L1, экран 10 (read → tf), промахи в пунктах 2 и 4.
    markAct('a0', 1, 10, [2, 4])
    await open()
    const items = await waitFor(() => {
      const list = [...document.querySelectorAll('.wb-item')]
      expect(list.length).toBe(5)
      return list
    })
    const pick = (k, label) => fireEvent.click([...items[k].querySelectorAll('.wb-opt')].find((b) => b.textContent === label))
    // Ключи: true, false, true, false, true. Пункт 4 снова провален, потом исправлен.
    pick(0, 'Верно')
    pick(1, 'Неверно')
    pick(2, 'Верно')
    pick(3, 'Неверно')
    pick(4, 'Неверно')
    pick(4, 'Верно')
    next()
    expect(missFor('a0', 1, 10)).toEqual([4])
  })
})
