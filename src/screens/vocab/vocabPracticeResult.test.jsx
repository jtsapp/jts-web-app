// @vitest-environment jsdom
//
// Итог практики и память ошибок. «Хуже всего запомненные» на главной словаря
// только копились: снятия не было нигде, и слово, которое ученик уже
// отвечает верно, висело в списке навсегда — сколько его ни повторяй.

import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import VocabPractice from './VocabPractice.jsx'
import { recordVocabMisses, topVocabMisses } from './vocabMisses.js'

afterEach(() => localStorage.clear())

function mount(cards) {
  return render(
    <I18nProvider>
      <VocabPractice cards={cards} lang="ru" title="Повторить" token={null} scopeId={null} onExit={() => {}} speak={() => {}} />
    </I18nProvider>,
  )
}

describe('VocabPractice: итог и «хуже всего запомненные»', () => {
  it('верно отвеченное слово уходит из списка ошибок', () => {
    recordVocabMisses(null, [{ key: 'c5_father_mother', word: 'father', translationRu: 'отец' }])
    const [top] = topVocabMisses(null)
    // Ключ записи нужен странице: по нему она собирает практику «повторить».
    expect(top).toMatchObject({ key: 'c5_father_mother', word: 'father', ru: 'отец' })

    mount([{ id: top.key, en: top.word, ru: top.ru }])
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    // «Сначала изучи» (studyFirst=true по умолчанию) — одно слово, один экран.
    fireEvent.click(screen.getByRole('button', { name: 'К практике' }))
    fireEvent.click(screen.getByRole('button', { name: 'отец' }))
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))

    expect(document.querySelector('.vp-res-card')).not.toBeNull()
    expect(topVocabMisses(null)).toEqual([])
  })

  it('ошибка по-прежнему попадает в список', () => {
    mount([{ id: 'apple', en: 'apple', ru: 'яблоко' }])
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    fireEvent.click(screen.getByRole('button', { name: 'К практике' }))
    const wrong = [...document.querySelectorAll('.vp-opt')].find((b) => b.textContent.trim() !== 'яблоко')
    fireEvent.click(wrong)
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))

    expect(topVocabMisses(null).map((m) => m.key)).toEqual(['apple'])
  })
})

// Ревью 08.10.2026: recordSkill('vocab') звался только в старой сессии словаря
// (src/practice/vocab/Session.jsx), которую никто не открывает, — навык
// «Словарь» на Главной и в профиле не рос от практики вообще.
describe('VocabPractice: ответы идут в навык «Словарь»', () => {
  it('верный ответ засчитывается в навык', async () => {
    const { readLocalSkillStats } = await import('../../practice/skillStats.js')
    const before = readLocalSkillStats().vocab.done
    mount([{ id: 'apple', en: 'apple', ru: 'яблоко' }])
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    fireEvent.click(screen.getByRole('button', { name: 'К практике' }))
    fireEvent.click(screen.getByRole('button', { name: 'яблоко' }))
    fireEvent.click(screen.getByRole('button', { name: /Продолжить/ }))
    expect(document.querySelector('.vp-res-card')).not.toBeNull()
    expect(readLocalSkillStats().vocab.done).toBe(before + 1)
  })
})
