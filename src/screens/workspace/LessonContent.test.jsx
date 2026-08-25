// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonContent, { groupBlocks, practiceBlockKey } from './LessonContent.jsx'

// Регрессия на расхождение экранов ученика и преподавателя.
//
// Урок каталога приезжает ученику разобранным на блоки, и экстрактор режет тело
// упражнения по прямым детям `.ex-body`: инструкция, подсказка под ней и сама
// разметка — три отдельных info-блока. В реальном уроке (A2, L01) их 88 на семь
// шагов, сериями до семнадцати подряд. Карточка на блок давала стопку из двух
// десятков белых плашек там, где у преподавателя один поток.

const INFO = (html) => ({ type: 'info', html })
const PRACTICE = {
  type: 'practice',
  title: 'Практика',
  questions: [{ id: 'q1', type: 'choice', prompt: 'A?', options: ['a', 'b'], answer: 'a' }],
}

function renderContent(blocks, props = {}) {
  return render(
    <I18nProvider>
      <LessonContent
        step={{ blocks }}
        answers={{}}
        checkedKeys={new Set()}
        onAnswer={() => {}}
        onCheck={() => {}}
        {...props}
      />
    </I18nProvider>
  )
}

describe('groupBlocks — поток вместо стопки карточек', () => {
  it('соседние info-блоки складываются в одну группу', () => {
    const groups = groupBlocks([INFO('<p>1</p>'), INFO('<p>2</p>'), INFO('<p>3</p>')])
    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe('info')
    expect(groups[0].blocks).toHaveLength(3)
  })

  it('практика между ними разрывает группу, а не поглощается ею', () => {
    const groups = groupBlocks([INFO('<p>1</p>'), PRACTICE, INFO('<p>2</p>')])
    expect(groups.map((g) => g.type)).toEqual(['info', 'single', 'info'])
    expect(groups[0].blocks).toHaveLength(1)
    expect(groups[2].blocks).toHaveLength(1)
  })

  it('порядок блоков сохраняется — шаг mcq → match → mcq не перегруппировывается', () => {
    const groups = groupBlocks([PRACTICE, INFO('<p>между</p>'), PRACTICE])
    expect(groups.map((g) => g.type)).toEqual(['single', 'info', 'single'])
  })

  it('пустой шаг не роняет рендер', () => {
    expect(groupBlocks(undefined)).toEqual([])
    expect(groupBlocks([])).toEqual([])
  })
})

describe('LessonContent — карточки шага', () => {
  it('серия из семнадцати info-блоков — одна карточка, а не семнадцать', () => {
    const blocks = Array.from({ length: 17 }, (_, i) => INFO(`<p>${i}</p>`))
    const { container } = renderContent(blocks)

    expect(container.querySelectorAll('.lw-info')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-info__item')).toHaveLength(17)
  })

  it('содержимое всех блоков серии доезжает до экрана', () => {
    const { container } = renderContent([INFO('<p>первый</p>'), INFO('<p>второй</p>')])
    expect(container.querySelector('.lw-info').textContent).toContain('первый')
    expect(container.querySelector('.lw-info').textContent).toContain('второй')
  })

  it('заголовок блока остаётся заголовком внутри общей карточки', () => {
    const { container } = renderContent([{ type: 'info', title: 'Цель', html: '<p>текст</p>' }])
    expect(container.querySelector('.lw-info__title').textContent).toBe('Цель')
  })

  it('practice-блок сохраняет свою карточку и вопросы', () => {
    const { container } = renderContent([INFO('<p>инструкция</p>'), PRACTICE])
    expect(container.querySelectorAll('.lw-practice')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-info')).toHaveLength(1)
  })

  // Преподаватель смотрит работу ученика в том же компоненте: ответы приезжают
  // трансляцией, а трогать их он не должен — его клик ушёл бы в его же
  // состояние и разъехался с тем, что видит ученик.
  it('в режиме просмотра видны ответы ученика', () => {
    const { container } = renderContent([PRACTICE], {
      answers: { q1: 'a' },
      readOnly: true,
    })
    const chosen = [...container.querySelectorAll('.lw-opt')].find((b) => b.textContent.includes('a'))
    expect(chosen.getAttribute('aria-pressed')).toBe('true')
  })

  it('в режиме просмотра отвечать нельзя и «Проверить» нет', () => {
    const onAnswer = vi.fn()
    const { container } = renderContent([PRACTICE], { readOnly: true, onAnswer })

    expect(container.querySelector('.lw-practice__check')).toBeNull()
    const opt = container.querySelector('.lw-opt')
    expect(opt.disabled).toBe(true)
    fireEvent.click(opt)
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it('своя работа остаётся доступной', () => {
    const onAnswer = vi.fn()
    const { container } = renderContent([PRACTICE], { onAnswer })

    expect(container.querySelector('.lw-practice__check')).not.toBeNull()
    fireEvent.click(container.querySelector('.lw-opt'))
    expect(onAnswer).toHaveBeenCalledWith('q1', 'a')
  })

  // Регрессия: шаг несёт по несколько независимых упражнений подряд (в
  // реальном уроке — до дюжины пронумерованных заданий на одной «Vocabulary»).
  // «Проверить» в одной карточке не должно раскрывать ответы и блокировать
  // ввод в соседних — студент их ещё не решал.
  it('«Проверить» в одной карточке не трогает соседнюю', () => {
    const GAP1 = { type: 'practice', title: 'P1', questions: [{ id: 'g1', type: 'gap', gapBefore: 'I like', gapAfter: '.', answers: ['coffee'] }] }
    const GAP2 = { type: 'practice', title: 'P2', questions: [{ id: 'g2', type: 'gap', gapBefore: 'I see', gapAfter: '.', answers: ['you'] }] }

    const { container } = renderContent([GAP1, GAP2], {
      checkedKeys: new Set([practiceBlockKey(undefined, 0)]),
    })

    const inputs = container.querySelectorAll('.lw-gap-input')
    expect(inputs).toHaveLength(2)
    expect(inputs[0].disabled).toBe(true)
    expect(inputs[1].disabled).toBe(false)
  })

  it('клик «Проверить» шлёт ключ именно этой карточки, а не всего шага', () => {
    const onCheck = vi.fn()
    const GAP1 = { type: 'practice', title: 'P1', questions: [{ id: 'g1', type: 'gap', gapBefore: 'I like', gapAfter: '.', answers: ['coffee'] }] }
    const GAP2 = { type: 'practice', title: 'P2', questions: [{ id: 'g2', type: 'gap', gapBefore: 'I see', gapAfter: '.', answers: ['you'] }] }

    const { container } = renderContent([GAP1, GAP2], {
      onCheck,
      answers: { g1: 'coffee', g2: 'you' },
    })
    const checkButtons = container.querySelectorAll('.lw-practice__check')
    fireEvent.click(checkButtons[1])

    expect(onCheck).toHaveBeenCalledWith(practiceBlockKey(undefined, 1), ['g2'])
  })

  it('theory и banner не сливаются с info', () => {
    const { container } = renderContent([
      INFO('<p>раз</p>'),
      { type: 'theory', title: 'Правило', text: 'Текст' },
      INFO('<p>два</p>'),
    ])
    expect(container.querySelectorAll('.lw-theory')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-info')).toHaveLength(2)
  })

  it('рисует колоду vocab, а не выкидывает неизвестный тип', () => {
    const { container } = renderContent([
      INFO('<p>Read the words. Click a card to see an example.</p>'),
      {
        type: 'vocab',
        title: 'Vocabulary',
        cards: [
          { word: 'friendship', pos: 'n', ipa: 'ˈfrendʃɪp', definition: 'the relationship between friends', translationKz: 'достық', translationRu: 'дружба' },
          { word: 'get on (well with someone)', imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' },
        ],
      },
    ])
    expect(container.querySelectorAll('.lw-vocab')).toHaveLength(1)
    expect(container.textContent).toContain('friendship')
    expect(container.textContent).toContain('get on (well with someone)')
    expect(container.querySelectorAll('.lw-vcard')).toHaveLength(2)
  })

  it('склеивает инструкцию, аудио и вопрос в одну practice-карточку', () => {
    const { container } = renderContent([
      {
        type: 'practice',
        title: 'Grammar',
        instruction: 'Choose the right form.',
        audio: { src: 'https://example.test/clip.mp3' },
        html: '<div class="gconcept">With I we say I’m.</div>',
        questions: [{ id: 'q1', type: 'choice', prompt: 'I ___ Anna.', options: ["'m", 'are'], answer: "'m" }],
      },
    ])
    expect(container.querySelectorAll('.lw-practice')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-info')).toHaveLength(0)
    expect(container.querySelector('.lw-practice__instruction').textContent).toContain('Choose the right form')
    expect(container.querySelector('.lw-practice__audio').getAttribute('src')).toContain('clip.mp3')
    expect(container.querySelector('.lw-practice__html').textContent).toContain('I’m')
  })

  it('рисует writing одним полем, а не стопкой info', () => {
    const { container } = renderContent([
      {
        type: 'writing',
        instruction: 'Write five sentences.',
        placeholder: '1.',
        html: '<div class="bubble">Model</div>',
      },
    ])
    expect(container.querySelectorAll('.lw-writing')).toHaveLength(1)
    expect(container.querySelector('.lw-practice__instruction').textContent).toContain('Write five sentences')
    expect(container.querySelector('.lw-writing__field').getAttribute('placeholder')).toBe('1.')
  })

  it('текст writing уходит преподавателю, а не остаётся только на устройстве', () => {
    const onAnswer = vi.fn()
    const { container } = renderContent(
      [{ type: 'writing', id: 'wr-w0', instruction: 'Write.', placeholder: '1.' }],
      { onAnswer },
    )
    fireEvent.change(container.querySelector('.lw-writing__field'), { target: { value: 'Friendship is real.' } })
    expect(onAnswer).toHaveBeenCalledWith('wr-w0', 'Friendship is real.')
  })

  it('рисует speaking одной карточкой с шагами', () => {
    const { container } = renderContent([
      {
        type: 'speaking',
        taskDescription: 'Say hello to your teacher.',
        steps: ['Greet', 'Say your name'],
        hasRecorder: true,
      },
    ])
    expect(container.querySelectorAll('.lw-speaking')).toHaveLength(1)
    expect(container.textContent).toContain('Say hello to your teacher')
    expect(container.textContent).toContain('Greet')
  })

  it('«Проверить» без ответа не нажимается — иначе зелёный ключ выглядит как успех', () => {
    const onCheck = vi.fn()
    const { container } = renderContent([PRACTICE], { onCheck })
    const btn = container.querySelector('.lw-practice__check')
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(onCheck).not.toHaveBeenCalled()
  })

  it('рисует чек-лист «You can now…», а не выкидывает неизвестный тип', () => {
    const { container } = renderContent([
      { type: 'checklist', title: 'You can now…', items: ['talk about your friendships', 'speak for a minute'] },
    ])
    expect(container.querySelectorAll('.lw-checklist').length).toBe(1)
    expect(container.querySelectorAll('.lw-checklist__item').length).toBe(2)
  })

  it('клик переворачивает карточку и показывает перевод', () => {
    const { container } = renderContent([
      {
        type: 'vocab',
        cards: [{ word: 'friendship', translationRu: 'дружба', translationKz: 'достық' }],
      },
    ])
    const card = container.querySelector('.lw-vcard')
    expect(card.classList.contains('is-flipped')).toBe(false)
    fireEvent.click(card)
    expect(card.classList.contains('is-flipped')).toBe(true)
    expect(container.textContent).toContain('дружба')
  })
})
