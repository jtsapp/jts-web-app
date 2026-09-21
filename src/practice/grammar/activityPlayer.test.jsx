// @vitest-environment jsdom
// Две регрессии из сверки с макетом «Практика → Граммар» (кадры 4273:6987 и
// 4273:8675): в обоих случаях экран сообщал студенту неправду.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../api.js', () => ({
  completeLessonModule: vi.fn(async () => ({})),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0 })),
  // Сайдбар спрашивает демо-статус сам — пункт «Главная» и плашка скидки.
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
}))

import ActivityPlayer from './ActivityPlayer.jsx'

function play(activity) {
  return render(
    <I18nProvider>
      <ActivityPlayer activities={[activity]} lang="ru" token={null} level="a1" unitId={1} onExit={() => {}} onNextLesson={() => {}} />
    </I18nProvider>
  )
}

describe('True/False — цвет ложится на нажатый чип', () => {
  const activity = {
    type: 'truefalse',
    items: [{ s: 'Listen means “use your ears”.', ok: true }],
  }

  it('ошибка красит выбранный чип, а не правильный', () => {
    const { container } = play(activity)
    const [yes, no] = container.querySelectorAll('.gr-fchip')
    // Верный ответ — «✓», студент жмёт «✗».
    fireEvent.click(no)
    expect(no.className).toMatch(/picked-no/)
    expect(yes.className).not.toMatch(/picked/)
  })

  it('верный выбор красит тот же чип, по которому нажали', () => {
    const { container } = play(activity)
    const [yes, no] = container.querySelectorAll('.gr-fchip')
    fireEvent.click(yes)
    expect(yes.className).toMatch(/picked-ok/)
    expect(no.className).not.toMatch(/picked/)
  })
})

describe('Свободный ввод — ответ студента остаётся в поле', () => {
  const activity = { type: 'gap', q: 'I ___ coffee', answer: 'like', why: 'Present Simple' }

  it('после неверной проверки в поле лежит то, что написал студент', () => {
    const { container } = play(activity)
    const field = container.querySelector('.gr-gap-input')
    fireEvent.change(field, { target: { value: 'likes' } })
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))

    expect(field.value).toBe('likes')
    expect(field.className).toMatch(/wrong/)
  })

  // Поле правильный ответ больше не подставляет (и правильно — студент не
  // понимал, чей текст видит), но узнать верный вариант ему всё равно нужно:
  // у 434 из 1956 текстовых заданий разбор сам по себе ответа не содержит,
  // и без этой строки правильный вариант не показывался нигде. Остальные типы
  // его раскрывают: MC помечает ✓, Order подставляет, Matching пишет прямо.
  it('разбор показывает правильный ответ, даже когда объяснение его не называет', () => {
    const { container } = play({
      type: 'transform',
      instruction: 'Сделайте отрицание',
      prompt: 'She is from Brazil.',
      answer: "She isn't from Brazil.",
      why: "is + not = isn't.",
    })
    fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value: 'She not from Brazil.' } })
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))

    const why = container.querySelector('.gr-fb__why')
    expect(why.textContent).toContain("She isn't from Brazil.")
    expect(why.textContent).toContain("is + not = isn't.")
  })

  it('верный ответ не дублируется подсказкой — разбор остаётся как есть', () => {
    const { container } = play(activity)
    fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value: 'like' } })
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))

    expect(container.querySelector('.gr-fb__why').textContent.trim()).toBe('Present Simple')
  })
})

// В b1.json у 30 заданий «Put in order» ответ лежит строкой, а не массивом
// слов, как во всех остальных уровнях. Плеер звал answer.join — клик
// «Проверить» падал с TypeError, и урок нельзя было закончить.
describe('Order — ответ строкой (b1.json)', () => {
  const activity = {
    type: 'order',
    words: ['I', "don't", 'mind', 'waiting'],
    answer: "I don't mind waiting",
    why: 'mind + -ing.',
  }
  const pick = (container, order) => {
    const bank = container.querySelectorAll('.gr-word')
    order.forEach((i) => fireEvent.click(bank[i]))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
  }

  it('верная сборка засчитывается', () => {
    const { container } = play(activity)
    pick(container, [0, 1, 2, 3])
    expect(container.querySelector('.gr-slots').className).toMatch(/correct/)
  })

  it('неверная сборка показывает правильный порядок по словам', () => {
    const { container } = play(activity)
    pick(container, [3, 2, 1, 0])
    const slots = container.querySelector('.gr-slots')
    expect(slots.className).toMatch(/wrong/)
    expect([...slots.querySelectorAll('.gr-slot-word')].map((b) => b.textContent)).toEqual([
      'I', "don't", 'mind', 'waiting',
    ])
  })
})

// «the or nothing?»: верный ответ — прочерк («type – if none»), и нормализация
// превращает его в пустую строку. Любой набранный знак препинания тоже
// нормализуется в пустоту — и засчитывался: «?» или «.» проходили за «нет
// артикля». Прочерк сверяется как есть, но разные тире — это один прочерк.
describe('Свободный ввод — ответ-прочерк', () => {
  const activity = { type: 'gap', before: 'I love ', after: ' music.', answer: '-', alts: ['nothing', 'no'], why: 'no article' }

  function check(value) {
    const { container, unmount } = play(activity)
    fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    const wrong = /wrong/.test(container.querySelector('.gr-gap-input').className)
    unmount()
    return !wrong
  }

  it('случайный знак препинания не засчитывается', () => {
    expect(check('?')).toBe(false)
    expect(check('.')).toBe(false)
  })

  it('дефис, тире и слово-альтернатива засчитываются', () => {
    expect(check('-')).toBe(true)
    expect(check('–')).toBe(true)
    expect(check('—')).toBe(true)
    expect(check('nothing')).toBe(true)
  })

  it('обычный неверный ответ остаётся неверным', () => {
    expect(check('the')).toBe(false)
  })
})

// Эталон пустой — «ничего не ставить» (c1: «zero article (leave it blank)»).
// Пустое поле не отправить, поэтому прочерк и слово-альтернатива верны, а
// случайный знак — нет.
describe('Свободный ввод — пустой эталон', () => {
  const activity = { type: 'gap', before: 'They emigrated to ', after: ' Canada.', answer: '', alts: ['zero'], why: 'zero article' }

  function check(value) {
    const { container, unmount } = play(activity)
    fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    const wrong = /wrong/.test(container.querySelector('.gr-gap-input').className)
    unmount()
    return !wrong
  }

  it('прочерк и «zero» засчитываются, «?» и «the» — нет', () => {
    expect(check('-')).toBe(true)
    expect(check('—')).toBe(true)
    expect(check('Zero')).toBe(true)
    expect(check('?')).toBe(false)
    expect(check('the')).toBe(false)
  })
})

// «Add the right mark»: ответ — сам знак «?». Точка вместо него раньше тоже
// проходила — всё знаковое нормализовалось в пустоту.
describe('Свободный ввод — ответ-знак', () => {
  it('засчитывается только нужный знак', () => {
    const activity = { type: 'gap', before: 'Where do you live', after: '', answer: '?', alts: [], why: 'a question' }
    const run = (value) => {
      const { container, unmount } = play(activity)
      fireEvent.change(container.querySelector('.gr-gap-input'), { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
      const ok = !/wrong/.test(container.querySelector('.gr-gap-input').className)
      unmount()
      return ok
    }
    expect(run('?')).toBe(true)
    expect(run('.')).toBe(false)
  })
})
