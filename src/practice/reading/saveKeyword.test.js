import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveWord = vi.fn()
const addVocabWords = vi.fn()
vi.mock('../../api.js', () => ({
  saveWord: (...args) => saveWord(...args),
}))
vi.mock('../../lib/vocabBank.js', () => ({
  addVocabWords: (...args) => addVocabWords(...args),
}))

const { saveReadingKeyword } = await import('./saveKeyword.js')

const WORD = { en: 'placebo', ru: 'плацебо', kz: 'плацебо' }

beforeEach(() => {
  saveWord.mockReset()
  addVocabWords.mockReset()
  saveWord.mockResolvedValue({})
  addVocabWords.mockResolvedValue(true)
})

describe('saveReadingKeyword', () => {
  it('кладёт слово в личный словарь на ru и kz и в vocab_bank', async () => {
    await expect(saveReadingKeyword('tok', WORD, 'The Pill')).resolves.toBe(true)

    expect(addVocabWords).toHaveBeenCalledWith([{ word: 'placebo', hint: 'плацебо · плацебо' }])
    expect(saveWord).toHaveBeenCalledWith('tok', {
      word: 'placebo',
      translation: 'плацебо',
      language: 'ru',
      source: 'The Pill',
    })
    expect(saveWord).toHaveBeenCalledWith('tok', {
      word: 'placebo',
      translation: 'плацебо',
      language: 'kk',
      source: 'The Pill',
    })
  })

  it('без токена всё равно пишет в vocab_bank — гость забирает слово на устройство', async () => {
    await expect(saveReadingKeyword(null, WORD, 'The Pill')).resolves.toBe(true)
    expect(saveWord).not.toHaveBeenCalled()
    expect(addVocabWords).toHaveBeenCalled()
  })

  it('пустое слово не сохраняет', async () => {
    await expect(saveReadingKeyword('tok', { en: '  ' }, 'x')).resolves.toBe(false)
    expect(saveWord).not.toHaveBeenCalled()
    expect(addVocabWords).not.toHaveBeenCalled()
  })

  it('курсный kk принимается так же, как kz из чтения', async () => {
    await saveReadingKeyword('tok', { en: 'trial', ru: 'испытание', kk: 'сынақ' }, 't')
    expect(saveWord).toHaveBeenCalledWith('tok', expect.objectContaining({ language: 'kk', translation: 'сынақ' }))
  })

  it('если личный словарь упал, а банк принял — считаем успехом', async () => {
    saveWord.mockRejectedValue(new Error('offline'))
    await expect(saveReadingKeyword('tok', WORD, 't')).resolves.toBe(true)
  })

  it('если оба пути не вышли — не врём, что сохранилось', async () => {
    saveWord.mockRejectedValue(new Error('offline'))
    addVocabWords.mockResolvedValue(false)
    await expect(saveReadingKeyword('tok', WORD, 't')).resolves.toBe(false)
  })
})
