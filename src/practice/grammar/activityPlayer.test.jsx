// @vitest-environment jsdom
// Две регрессии из сверки с макетом «Практика → Граммар» (кадры 4273:6987 и
// 4273:8675): в обоих случаях экран сообщал студенту неправду.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../api.js', () => ({
  completeLessonModule: vi.fn(async () => ({})),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0 })),
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
