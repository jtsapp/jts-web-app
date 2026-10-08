// @vitest-environment jsdom
// «В словарь» на карточке слова урока. Слово уходит в два места: личный
// словарь (бэкенд, /mobile/saved-words — его и показывает раздел «Словарь») и
// банк повторений тьютора (vocab_bank, в «Словаре» не виден). Галочка
// «В словаре» ставилась, если принял хотя бы банк, — то есть и гостю, у которого
// «Словаря» нет, и вошедшему, у которого личный словарь не ответил (ревью
// 08.10.2026, та же ошибка, что T1-7 в Чтении).
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'

const bank = vi.hoisted(() => ({ addVocabWords: vi.fn() }))
const api = vi.hoisted(() => ({ saveWord: vi.fn() }))
vi.mock('../lib/vocabBank.js', () => bank)
vi.mock('../api.js', async (importOriginal) => ({ ...(await importOriginal()), saveWord: api.saveWord }))

import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio } from './CourseStepPlayer.jsx'

const A2_WORD = { en: 'family', ru: 'семья', kk: 'отбасы', def: 'the group of people you are related to' }
// B2: перевода в источнике нет вовсе, карточка живёт английским определением.
const B2_WORD = { en: 'awkward', ru: '', kk: '', def: 'Making you feel embarrassed or uncomfortable.' }

function play(word, token) {
  const step = { stage: 'Лексика', type: 'cards', title: 'Words', words: [word] }
  render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="L1" level="A2" token={token} onExit={() => {}} onDone={() => {}} />
    </I18nProvider>,
  )
  fireEvent.click(document.querySelector('.cp-word__flip'))
  return document.querySelector('.cp-word__save')
}

async function settled(btn) {
  fireEvent.click(btn)
  await waitFor(() => expect(bank.addVocabWords).toHaveBeenCalled())
  // Обе записи — промисы; даём им разрешиться.
  await new Promise((r) => setTimeout(r, 0))
  return document.querySelector('.cp-word__save')
}

beforeEach(() => {
  bank.addVocabWords.mockReset().mockResolvedValue(true)
  api.saveWord.mockReset().mockResolvedValue({})
})

afterEach(() => {
  stopStageAudio()
  cleanup()
})

describe('карточка слова — «В словарь»', () => {
  it('вошедший, личный словарь принял — «В словаре»', async () => {
    const btn = await settled(play(A2_WORD, 'tok'))
    expect(btn.textContent).toBe('В словаре')
    expect(btn.disabled).toBe(true)
  })

  it('вошедший, личный словарь не ответил, банк принял — кнопка возвращается', async () => {
    api.saveWord.mockRejectedValue(new Error('500'))
    const btn = await settled(play(A2_WORD, 'tok'))
    expect(btn.textContent).toBe('В словарь')
    expect(btn.disabled).toBe(false)
  })

  it('гость: банк принял — «Сохранено», а не «В словаре»', async () => {
    const btn = await settled(play(A2_WORD, null))
    expect(btn.textContent).toBe('Сохранено')
    expect(btn.disabled).toBe(true)
    expect(api.saveWord).not.toHaveBeenCalled()
  })

  it('B2 без перевода: личному словарю нечего сохранить, банк принял — «Сохранено»', async () => {
    const btn = await settled(play(B2_WORD, 'tok'))
    expect(btn.textContent).toBe('Сохранено')
    expect(api.saveWord).not.toHaveBeenCalled()
  })

  it('B2: подсказка в банке — определение, а не пустая строка', async () => {
    await settled(play(B2_WORD, 'tok'))
    expect(bank.addVocabWords).toHaveBeenCalledWith([{ word: 'awkward', hint: B2_WORD.def }])
  })

  it('ни банк, ни словарь не приняли — кнопка возвращается', async () => {
    bank.addVocabWords.mockResolvedValue(false)
    api.saveWord.mockRejectedValue(new Error('500'))
    const btn = await settled(play(A2_WORD, 'tok'))
    expect(btn.textContent).toBe('В словарь')
  })
})
