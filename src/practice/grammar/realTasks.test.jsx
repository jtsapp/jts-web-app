// @vitest-environment jsdom
// Ревью «Практики» 08.10.2026: задания грамматики, которые нельзя было пройти
// правильным ответом или которые роняли экран. Все кейсы — настоящие задания из
// public/practice/grammar/*.json, чтобы тест ловил ровно то, что видит ученик.
import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../api.js', () => ({
  completeLessonModule: vi.fn(async () => ({})),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0 })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
}))

import ActivityPlayer from './ActivityPlayer.jsx'

const cache = {}
function level(code) {
  if (!cache[code]) {
    cache[code] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/practice/grammar', `${code}.json`), 'utf8'))
  }
  return cache[code]
}
const task = (code, unit, i) => level(code).units[String(unit)].activities[i]

function play(activities) {
  return render(
    <I18nProvider>
      <ActivityPlayer activities={activities} lang="ru" token={null} level="b1" unitId={1} onExit={() => {}} onNextLesson={() => {}} />
    </I18nProvider>,
  )
}

const checkBtn = () => screen.getByRole('button', { name: 'Проверить' })
const verdict = (container) => {
  const fb = container.querySelector('.gr-fb.show')
  return fb ? fb.classList.contains('ok') : null
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Categorize в формате {cats, items[].c, instruction} (57 заданий B1)', () => {
  it('B1 u53 «Sort: does it take -ing?» рисуется и проходится верной раскладкой', () => {
    const a = task('b1', 53, 6)
    expect(a.cats).toBeTruthy() // сам формат данных, на котором падало
    const { container } = play([a])
    for (const it of a.items) {
      fireEvent.click([...container.querySelectorAll('.gr-cat-item')].find((b) => b.textContent === it.t))
      fireEvent.click(container.querySelectorAll('.gr-bucket')[it.c])
    }
    fireEvent.click(checkBtn())
    expect(verdict(container)).toBe(true)
  })

  it('ни одно задание categorize ни на одном уровне не роняет плеер', () => {
    for (const code of ['a0', 'a1', 'a2', 'b1', 'b2', 'c1']) {
      for (const u of Object.values(level(code).units)) {
        for (const a of u.activities || []) {
          if (a.type !== 'categorize') continue
          expect(() => {
            play([a])
            cleanup()
          }).not.toThrow()
        }
      }
    }
  })
})

describe('Transform с «→»: подходит и целое предложение, и одни слова пропусков', () => {
  const type = (container, value) => {
    fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value } })
    fireEvent.click(checkBtn())
    return verdict(container)
  }
  const cases = [
    ['a1', 65, 5, 'I saw an old man and a dog.', true],
    ['a1', 65, 5, 'an, a', true],
    ['a1', 65, 5, 'an old man and a dog', true],
    ['a1', 65, 5, 'a, an', false],
    ['a1', 68, 5, 'I need some eggs and some butter.', true],
    ['a1', 68, 5, 'some, some', true],
    ['a1', 69, 5, 'I bought a book. The book was expensive.', true],
    ['a1', 69, 5, 'a, the', true],
    ['a1', 82, 5, 'I speak both English and French.', true],
    ['a1', 82, 5, 'both, and', true],
    ['a1', 106, 5, 'We live in London, in a small flat.', true],
    ['a1', 106, 5, 'in, in', true],
    ['a1', 108, 5, 'I fly to Paris tonight and arrive in Paris at nine.', true],
    ['a1', 108, 5, 'to, in', true],
    ['a1', 102, 5, 'The book you lent me', true],
    ['a1', 102, 5, 'The book that you lent me', false],
  ]
  for (const [code, unit, i, value, ok] of cases) {
    it(`${code} u${unit}[${i}] «${value}» → ${ok ? 'верно' : 'неверно'}`, () => {
      const { container } = play([task(code, unit, i)])
      expect(type(container, value)).toBe(ok)
    })
  }
})

describe('«Найди ошибку»: ошибка из двух слов засчитывается за любое из них', () => {
  const pickWord = (container, word) => {
    fireEvent.click([...container.querySelectorAll('.gr-eword')].find((s) => s.textContent === word))
    fireEvent.click(checkBtn())
    return verdict(container)
  }
  const cases = [
    ['a2', 34, 7, 'Do', true], // «Do you can drive» — пояснение «(remove 'do')»
    ['a2', 34, 7, 'can', true],
    ['a2', 34, 7, 'you', false],
    ['a2', 35, 7, 'are', true], // «Where you are going» — (swap: are you)
    ['a2', 35, 7, 'you', true],
    ['a2', 35, 7, 'Where', false],
    ['a2', 47, 7, 'enough', true], // (order: not enough)
    ['a2', 58, 7, 'black', true], // (order: black leather)
    ['b1', 40, 6, 'have', true], // (remove 'would have') had known
  ]
  for (const [code, unit, i, word, ok] of cases) {
    it(`${code} u${unit}[${i}] «${word}» → ${ok ? 'верно' : 'неверно'}`, () => {
      const { container } = play([task(code, unit, i)])
      expect(pickWord(container, word)).toBe(ok)
    })
  }

  // «Find and correct the mistake» в предложении без ошибки (ключ «(correct) …»):
  // засчитывалось только одно произвольное верное слово — задание-угадайка.
  it('задания «(correct) …» без ошибки из урока убраны', () => {
    for (const [code, unit, i] of [['b1', 133, 7], ['b1', 137, 7], ['b1', 144, 7]]) {
      const all = level(code).units[String(unit)].activities
      expect(all[i].correct).toMatch(/^\(correct\)/)
      const { container } = play(all)
      // Пройти весь урок долго; достаточно, что счётчик заданий меньше на одно.
      expect(container.querySelector('.gr-act__count').textContent).toBe(`1 / ${all.length - 1}`)
      cleanup()
    }
  })
})

describe('Timeline: ответ «usually» вне зон прошлое/сейчас/будущее', () => {
  it('a2 u6[4] «Anna likes rap music» — «Сейчас» верно', () => {
    const { container } = play([task('a2', 6, 4)])
    fireEvent.click([...container.querySelectorAll('.gr-tzone')].find((b) => /Сейчас/.test(b.textContent)))
    expect(verdict(container)).toBe(true)
  })
})

describe('Matching: одинаковые подписи справа сверяются по тексту', () => {
  it('a2 u70[4] — две «suggestion»: верная раскладка верна при любом перемешивании', () => {
    const a = task('a2', 70, 4)
    vi.useFakeTimers()
    for (let run = 0; run < 8; run++) {
      const { container } = play([a])
      a.pairs.forEach((p, li) => {
        fireEvent.click(container.querySelectorAll('.gr-match-l')[li])
        // Первая свободная кнопка с нужным текстом — для «suggestion» это может
        // быть «чужая» по номеру пара.
        const right = [...container.querySelectorAll('.gr-match-r')].find((b) => !b.disabled && b.innerHTML.includes(p.r))
        fireEvent.click(right)
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(verdict(container)).toBe(true)
      cleanup()
    }
    vi.useRealTimers()
  })
})

describe('Варианты перемешаны: верный ответ не угадывается по месту', () => {
  it('MC: при перевёрнутом случае верный вариант стоит не на своём месте из данных', () => {
    const a = task('a1', 1, 6)
    expect(a.type).toBe('mc')
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { container } = play([a])
    const labels = [...container.querySelectorAll('.gr-opt')].map((b) => b.textContent)
    expect(labels).not.toEqual(a.options.map((o) => o.replace(/<[^>]+>/g, '')))
    // И верный по тексту остаётся верным.
    const right = a.options[a.answer].replace(/<[^>]+>/g, '')
    fireEvent.click([...container.querySelectorAll('.gr-opt')].find((b) => b.textContent === right))
    fireEvent.click(checkBtn())
    expect(verdict(container)).toBe(true)
  })

  // В 742 шагах диалогов из 742 верная реплика в данных — первая.
  it('Dialogue: верная реплика не всегда первая кнопка', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = task('a1', 1, 11)
    expect(a.type).toBe('dialogue')
    expect(a.steps[0].options[0].ok).toBe(true)
    const { container } = play([a])
    for (let n = 0; n < 20 && !container.querySelector('.gr-dlg-opts'); n++) {
      act(() => {
        vi.advanceTimersByTime(500)
      })
    }
    const first = container.querySelector('.gr-dlg-opts .gr-opt')
    expect(first.textContent).not.toBe(a.steps[0].options[0].t.replace(/<[^>]+>/g, ''))
    vi.useRealTimers()
  })

  it('Order: банк слов не выложен в порядке ответа (C1 u2 — было ровно так)', () => {
    const units = level('c1').units['2'].activities
    const a = units.find((x) => x.type === 'order')
    const answer = (Array.isArray(a.answer) ? a.answer : String(a.answer).split(/\s+/)).join(' ')
    expect(a.words.join(' ')).toBe(answer) // в данных банк совпадает с ответом
    const { container } = play([a])
    const bank = [...container.querySelectorAll('.gr-word')].map((b) => b.textContent).join(' ')
    expect(bank).not.toBe(answer)
  })
})
