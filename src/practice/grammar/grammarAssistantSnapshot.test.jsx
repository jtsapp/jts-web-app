// @vitest-environment jsdom
// Что помощник по сайту узнаёт про задание «Грамматики» из снимка экрана. Эталон (data-assistant-expected на итоговой
// плашке) — только после неверного ответа: до проверки помощник даёт лишь подсказку, после верного показывать нечего.
// Встроенная плашка диалога «Попробуйте другой ответ» — ещё не итог, эталона там нет.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { snapshotScreen } from '../../lib/assistant/screenSnapshot.js'
import { expectedOf } from './expectedAnswer.js'

vi.mock('../../api.js', () => ({
  completeLessonModule: vi.fn(async () => ({})),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0 })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
}))

import ActivityPlayer from './ActivityPlayer.jsx'

function play(activity) {
  return render(
    <I18nProvider>
      <ActivityPlayer activities={[activity]} lang="ru" token={null} level="a1" unitId={1} onExit={() => {}} onNextLesson={() => {}} />
    </I18nProvider>,
  )
}

const MARK = 'верный ответ по заданию'
const expected = (text) => `[${MARK}: «${text}»]`
const check = () => fireEvent.click(screen.getByRole('button', { name: 'Проверить' }))
const byText = (container, selector, text) => [...container.querySelectorAll(selector)].find((el) => el.textContent.trim() === text)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const MC = {
  type: 'mc',
  q: 'You don’t enjoy exams. 😞 What do you say?',
  options: ["I don't like exams.", 'I not like exams.', 'I no exams.'],
  answer: 0,
  why: ['Correct.', 'We need <b>don’t</b>.', 'There is no verb.'],
}

describe('выбор варианта (mc)', () => {
  it('до проверки эталона нет, даже с выбранным вариантом', () => {
    const { container } = play(MC)
    fireEvent.click(byText(container, '.gr-opt', 'I not like exams.'))
    expect(snapshotScreen(container)).not.toContain(MARK)
  })

  it('неверный ответ — в снимке верный вариант', () => {
    const { container } = play(MC)
    fireEvent.click(byText(container, '.gr-opt', 'I not like exams.'))
    check()
    const snap = snapshotScreen(container)
    expect(snap).toContain('Неверный ответ')
    expect(snap).toContain(expected("I don't like exams."))
  })

  it('верный ответ — эталона нет', () => {
    const { container } = play(MC)
    fireEvent.click(byText(container, '.gr-opt', "I don't like exams."))
    check()
    expect(snapshotScreen(container)).not.toContain(MARK)
  })
})

describe('впиши пропуск (gap)', () => {
  const GAP = { type: 'gap', before: 'I ', after: ' coffee.', answer: 'like', alts: [], why: 'Positive.' }

  it('неверно: в поле — ввод ученика (сайт его не подменяет), в эталоне — ключ', () => {
    const { container } = play(GAP)
    fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value: 'likes' } })
    check()
    const snap = snapshotScreen(container)
    expect(snap).toContain('ученик ввёл «likes» (отмечено как неверное)')
    expect(snap).toContain(expected('like'))
  })

  it('верно — эталона нет', () => {
    const { container } = play(GAP)
    fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value: 'like' } })
    check()
    expect(snapshotScreen(container)).not.toContain(MARK)
  })
})

describe('собери предложение (order)', () => {
  const ORDER = { type: 'order', words: ['like', "don't", 'I', 'rain'], answer: ['I', "don't", 'like', 'rain'], why: 'Order.' }

  it('неверно: эталон — фраза, а плитки в строке помечены как показанные сайтом, а не собранные учеником', () => {
    const { container } = play(ORDER)
    for (const w of ['I', 'like', "don't", 'rain']) fireEvent.click(byText(container, '.gr-bank .gr-word', w))
    check()
    const snap = snapshotScreen(container)
    expect(snap).toContain(expected("I don't like rain"))
    expect(snap).toContain('[кнопка «I» (верный ответ показал сайт)]')
  })

  it('верно — ни эталона, ни пометки', () => {
    const { container } = play(ORDER)
    for (const w of ['I', "don't", 'like', 'rain']) fireEvent.click(byText(container, '.gr-bank .gr-word', w))
    check()
    const snap = snapshotScreen(container)
    expect(snap).not.toContain(MARK)
    expect(snap).not.toContain('показал сайт')
  })
})

describe('найди ошибку (error)', () => {
  const ERR = { type: 'error', words: ['I', 'no', 'like', 'tea'], wrong: 1, correct: "don't", why: 'Negative.' }

  it('промах: эталон — ошибочное слово и исправление', () => {
    const { container } = play(ERR)
    fireEvent.click(byText(container, '.gr-eword', 'tea'))
    check()
    expect(snapshotScreen(container)).toContain(expected("no → don't"))
  })

  it('попал — эталона нет', () => {
    const { container } = play(ERR)
    fireEvent.click(byText(container, '.gr-eword', 'no'))
    check()
    expect(snapshotScreen(container)).not.toContain(MARK)
  })
})

describe('разложи по группам (categorize)', () => {
  const CAT = {
    type: 'categorize',
    prompt: 'Sort the things by the face.',
    buckets: ['I like', "I don't like"],
    items: [
      { t: 'coffee', b: 0 },
      { t: 'rain', b: 1 },
    ],
  }

  it('неверная раскладка — эталон «слово → группа» по каждому слову', () => {
    const { container } = play(CAT)
    for (const t of ['coffee', 'rain']) {
      fireEvent.click(byText(container, '.gr-cat-item', t))
      fireEvent.click(container.querySelectorAll('.gr-bucket')[0])
    }
    check()
    expect(snapshotScreen(container)).toContain(expected("coffee → I like; rain → I don't like"))
  })

  it('верная — эталона нет', () => {
    const { container } = play(CAT)
    fireEvent.click(byText(container, '.gr-cat-item', 'coffee'))
    fireEvent.click(container.querySelectorAll('.gr-bucket')[0])
    fireEvent.click(byText(container, '.gr-cat-item', 'rain'))
    fireEvent.click(container.querySelectorAll('.gr-bucket')[1])
    check()
    expect(snapshotScreen(container)).not.toContain(MARK)
  })
})

describe('соедини пары (matching) — проверяется сам по последней паре', () => {
  const MATCH = {
    type: 'matching',
    prompt: 'Match the short form to the long form.',
    pairs: [
      { l: "I'm", r: 'I am' },
      { l: "You're", r: 'you are' },
    ],
  }
  const pair = (container, l, r) => {
    fireEvent.click(byText(container, '.gr-match-l .gr-match-q', l).closest('button'))
    fireEvent.click(byText(container, '.gr-match-r', r))
  }

  it('неверно — эталон по всем парам; до последней пары эталона нет', () => {
    vi.useFakeTimers()
    const { container } = play(MATCH)
    pair(container, "I'm", 'you are')
    expect(snapshotScreen(container)).not.toContain(MARK)
    pair(container, "You're", 'I am')
    act(() => vi.advanceTimersByTime(300))
    expect(snapshotScreen(container)).toContain(expected("I'm → I am; You're → you are"))
  })

  it('верно — эталона нет', () => {
    vi.useFakeTimers()
    const { container } = play(MATCH)
    pair(container, "I'm", 'I am')
    pair(container, "You're", 'you are')
    act(() => vi.advanceTimersByTime(300))
    const snap = snapshotScreen(container)
    expect(snap).toContain('Молодец!')
    expect(snap).not.toContain(MARK)
  })
})

describe('True / False', () => {
  const TF = {
    type: 'truefalse',
    items: [
      { s: 'I like coffee.', ok: true },
      { s: 'I no like tea.', ok: false },
    ],
  }

  it('ошибка в одной строке — эталон по всем утверждениям подписями чипов', () => {
    const { container } = play(TF)
    const rows = container.querySelectorAll('.gr-tf-row')
    fireEvent.click(rows[0].querySelectorAll('.gr-fchip')[0]) // True — верно
    expect(snapshotScreen(container)).not.toContain(MARK) // ещё не итог
    fireEvent.click(rows[1].querySelectorAll('.gr-fchip')[0]) // True — неверно
    expect(snapshotScreen(container)).toContain(expected('I like coffee. → True; I no like tea. → False'))
  })
})

describe('шкала времени (timeline)', () => {
  it('промах — эталон подписью зоны на языке интерфейса', () => {
    const { container } = play({ type: 'timeline', sentence: '“The baby is sleeping.”', answer: 'now', why: 'Now.' })
    fireEvent.click(byText(container, '.gr-tzone', '⬅️Прошлое'))
    expect(snapshotScreen(container)).toContain(expected('Сейчас'))
  })
})

describe('диалог: неверная реплика — ещё не итог', () => {
  const DLG = {
    type: 'dialogue',
    scene: 'You meet a new classmate.',
    steps: [
      {
        npc: "Hello! What's your name?",
        options: [
          { t: "I'm Anna.", ok: true, reply: 'Nice to meet you, Anna!' },
          { t: 'I Anna.', ok: false, why: 'Don’t drop <b>am</b>.' },
        ],
      },
    ],
  }
  const flush = () => {
    for (let k = 0; k < 6; k++) act(() => vi.advanceTimersByTime(1500))
  }

  it('плашка «Попробуйте другой ответ» без эталона; итог после ошибки по пути — с эталоном', () => {
    vi.useFakeTimers()
    const { container } = play(DLG)
    flush()
    fireEvent.click(byText(container, '.gr-dlg-opts .gr-opt', 'I Anna.'))
    let snap = snapshotScreen(container)
    expect(snap).toContain('Попробуйте другой ответ')
    expect(snap).not.toContain(MARK)

    fireEvent.click(byText(container, '.gr-dlg-opts .gr-opt', "I'm Anna."))
    flush()
    snap = snapshotScreen(container)
    expect(snap).toContain('Неверный ответ')
    expect(snap).toContain(expected("Hello! What's your name? → I'm Anna."))
  })
})

describe('expectedOf — эталон каждого типа', () => {
  it('выбор, пропуск, трансформация, диктант', () => {
    expect(expectedOf(MC)).toBe("I don't like exams.")
    expect(expectedOf({ type: 'mc', options: ['<b>was</b>&nbsp;born'], answer: 0 })).toBe('was born')
    expect(expectedOf({ type: 'gap', answer: 'like' })).toBe('like')
    expect(expectedOf({ type: 'transform', answer: "I don't like fish." })).toBe("I don't like fish.")
    // Диктант: ключ — строчными, а звучит предложение из text.
    expect(expectedOf({ type: 'dictation', text: 'They are Turkish.', answer: 'they are turkish' })).toBe('They are Turkish.')
  })

  it('пустой ключ пропуска — «ничего не ставить», а не пустая строка', () => {
    expect(expectedOf({ type: 'gap', answer: '', alts: ['nothing'] })).toBe('— (ничего не ставить)')
  })

  it('порядок слов — массивом и строкой (30 заданий B1)', () => {
    expect(expectedOf({ type: 'order', answer: ['I', 'like', 'rain'] })).toBe('I like rain')
    expect(expectedOf({ type: 'order', answer: 'I like rain' })).toBe('I like rain')
  })

  it('«найди ошибку» с пояснением в скобках отдаёт его как есть', () => {
    expect(expectedOf({ type: 'error', words: ['She', 'stays', 'at', 'the', 'home'], wrong: 3, correct: '(delete the)' })).toBe(
      'the → (delete the)',
    )
  })

  it('шкала: подпись зоны по языку; незнакомый ключ — как есть, без имени строки', () => {
    expect(expectedOf({ type: 'timeline', answer: 'past' }, 'en')).toBe('Past')
    expect(expectedOf({ type: 'timeline', answer: 'usually' })).toBe('usually')
  })

  it('без эталона — пустая строка: карточка, пустые данные', () => {
    expect(expectedOf({ type: 'flashcard', cards: [{ f: 'buy →', b: 'bought' }] })).toBe('')
    expect(expectedOf(null)).toBe('')
    expect(expectedOf({ type: 'mc', options: ['a'] })).toBe('')
  })
})
