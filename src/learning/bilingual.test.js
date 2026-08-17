import { describe, it, expect } from 'vitest'
import { pickTr, localizeHtml } from './bilingual.js'
import { tasksToSteps } from './nativeSteps.js'

// Контент A0/A1 держит перевод парой «русский · қазақша» в одной строке, из-за
// чего при русском интерфейсе в варианты ответа лезли казахские слова. Тесты
// держат обе границы: пару режем, похожие строки других уровней не трогаем.
describe('bilingual — пара «ru · kk» в контенте', () => {
  it('русский интерфейс берёт левую сторону, казахский — правую', () => {
    expect(pickTr('слушать · тыңдау', 'ru')).toBe('слушать')
    expect(pickTr('слушать · тыңдау', 'kk')).toBe('тыңдау')
    // Английского перевода в контенте нет — для en остаётся русская сторона.
    expect(pickTr('слушать · тыңдау', 'en')).toBe('слушать')
  })

  it('строки без пары остаются как есть', () => {
    // A2/B1: та же точка разделяет английские образцы ответа — это не пара.
    const model = 'Are you free on…? · Would you like to…? · Do you fancy… -ing ?'
    expect(pickTr(model, 'ru')).toBe(model)
    expect(pickTr('медленно', 'kk')).toBe('медленно')
    expect(pickTr('Coffee — yes. Monday — no.', 'kk')).toBe('Coffee — yes. Monday — no.')
  })

  it('в разметке режем только переводные span, английское слово не трогаем', () => {
    const html = '<b class="kl-vocab__word">like</b><span class="kl-vocab__tr">нравится · ұнайды</span>'
    expect(localizeHtml(html, 'ru')).toContain('>нравится<')
    expect(localizeHtml(html, 'kk')).toContain('>ұнайды<')
    expect(localizeHtml(html, 'ru')).toContain('>like<')
  })
})

describe('nativeSteps — язык интерфейса в вариантах ответа', () => {
  const choice = {
    type: 'choice',
    sec: '2. Vocabulary',
    word: '👂 listen',
    options: ['спрашивать · сұрау', 'повторить · қайталау', 'слушать · тыңдау'],
    answer: 'слушать · тыңдау',
  }

  it('на русском интерфейсе казахской стороны в вариантах нет', () => {
    const [step] = tasksToSteps({ tasks: [choice] }, 'ru')
    expect(step.options).toEqual(['спрашивать', 'повторить', 'слушать'])
    expect(step.answer).toBe('слушать')
  })

  it('на казахском интерфейсе варианты и ответ казахские', () => {
    const [step] = tasksToSteps({ tasks: [choice] }, 'kk')
    expect(step.options).toEqual(['сұрау', 'қайталау', 'тыңдау'])
    expect(step.answer).toBe('тыңдау')
  })

  // Соединение собирается из подряд идущих choice с общим банком (см.
  // matchRunAt), минимум три пары — поэтому в тесте их три.
  it('пары соединения тоже режутся — правая колонка на языке интерфейса', () => {
    const pair = (word, answer) => ({ ...choice, title: 'Match the word to the picture.', word, answer })
    const [step] = tasksToSteps(
      {
        tasks: [
          pair('👂 listen', 'слушать · тыңдау'),
          pair('🔁 repeat', 'повторить · қайталау'),
          pair('❓ ask', 'спрашивать · сұрау'),
        ],
      },
      'ru',
    )
    expect(step.type).toBe('match')
    expect(step.pairs.map((p) => p.right)).toEqual(['слушать', 'повторить', 'спрашивать'])
    expect(step.options.join(' ')).not.toMatch(/[әғқңөұүһі]/)
  })

  it('по умолчанию (без языка) — русская сторона', () => {
    const [step] = tasksToSteps({ tasks: [choice] })
    expect(step.answer).toBe('слушать')
  })
})
