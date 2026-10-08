// @vitest-environment jsdom
// Мир Сказок открывает движок, а тот читает «Мои слова» из localStorage. До
// ревью 08.10.2026 ключ был один на устройство: ученик, открывший Сказки после
// чужого выхода, видел чужой список. Движок здесь подменён — проверяем, что
// он видит в ключе словаря в момент открытия.
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./engine.js', () => ({
  createTaleWorld: () => ({ TALES: [{ id: 'snow' }], loadFor: () => false, chooseTale: () => {} }),
}))
vi.mock('./markup.js', () => ({ MARKUP: '' }))
vi.mock('./styles.js', () => ({ CSS_BASE: '', CSS_SHELL: '' }))
vi.mock('../../api.js', () => ({ saveStudentVocab: vi.fn() }))

import { openTaleWorld } from './taleWorld.js'

const KEY = 'jts.fairytale.dict.v1'
const tokenFor = (userId) => `h.${btoa(JSON.stringify({ userId }))}.s`
const login = (userId) => localStorage.setItem('jts_access_token', tokenFor(userId))
const dictNow = () => JSON.parse(localStorage.getItem(KEY) || '[]').map((x) => x.w)

beforeEach(() => {
  localStorage.clear()
})

describe('мир Сказок — «Мои слова» у каждого свои', () => {
  it('после выхода первого ученика второй открывает Сказки с пустым словарём', () => {
    login(1)
    openTaleWorld('snow')
    localStorage.setItem(KEY, JSON.stringify([{ w: 'snow' }, { w: 'ice' }]))

    localStorage.removeItem('jts_access_token')
    login(2)
    openTaleWorld('snow')
    expect(dictNow()).toEqual([])

    login(1)
    openTaleWorld('snow')
    expect(dictNow()).toEqual(['snow', 'ice'])
  })

  it('гость на общем компьютере не видит слова вышедшего ученика', () => {
    login(1)
    openTaleWorld('snow')
    localStorage.setItem(KEY, JSON.stringify([{ w: 'snow' }]))
    localStorage.removeItem('jts_access_token')
    openTaleWorld('snow')
    expect(dictNow()).toEqual([])
  })
})
