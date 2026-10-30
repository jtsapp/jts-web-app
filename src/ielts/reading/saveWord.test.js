import { describe, it, expect, vi } from 'vitest'
import { savePassageWord } from './saveWord.js'

describe('savePassageWord', () => {
  it('берёт перевод из поля tr ответа translateWord (не translation) и шлёт слово в «Словарь»', async () => {
    const translate = vi.fn().mockResolvedValue({ tr: 'вид', alternates: ['виды'] })
    const save = vi.fn().mockResolvedValue('dict')
    await expect(savePassageWord('tok', 'species', { translate, save })).resolves.toBe('dict')
    expect(translate).toHaveBeenCalledWith('species', 'ru')
    expect(save).toHaveBeenCalledWith('tok', { en: 'species', ru: 'вид' }, 'ielts-reading')
  })

  it('чистит знаки на краях выделения', async () => {
    const translate = vi.fn().mockResolvedValue({ tr: 'вид' })
    const save = vi.fn().mockResolvedValue('dict')
    await savePassageWord('tok', '“species,”', { translate, save })
    expect(translate).toHaveBeenCalledWith('species', 'ru')
    expect(save.mock.calls[0][1].en).toBe('species')
  })

  it('перевод не пришёл — отдаёт решение saveReadingKeyword с пустым переводом, а не падает', async () => {
    const translate = vi.fn().mockRejectedValue(new Error('translate 500'))
    const save = vi.fn().mockResolvedValue(false)
    await expect(savePassageWord('tok', 'species', { translate, save })).resolves.toBe(false)
    expect(save).toHaveBeenCalledWith('tok', { en: 'species', ru: '' }, 'ielts-reading')
  })

  it('пустое выделение никуда не шлёт', async () => {
    const translate = vi.fn()
    const save = vi.fn()
    await expect(savePassageWord('tok', ' … ', { translate, save })).resolves.toBe(false)
    expect(translate).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })
})
