// @vitest-environment jsdom
// Регрессия по b1 `steps-T12` («Review test · Unit 12»): банк там
// ["of","in","on","on","of"], а занятость считалась по значению — первая же
// пара depend→on гасила ОБА «on». Собрать пять пар было нечем, «Проверить»
// оставалась серой, кнопки пропуска у теста нет, и вместе с непройденным
// тестом юнита запиралась вся остальная тропа B1.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer from './CourseStepPlayer.jsx'

const T12_MATCH = {
  type: 'match',
  title: 'Match the verb to its preposition',
  pairs: [
    { left: 'depend', right: 'on' },
    { left: 'rely', right: 'on' },
    { left: 'aware', right: 'of' },
    { left: 'interested', right: 'in' },
    { left: 'capable', right: 'of' },
  ],
  options: ['of', 'in', 'on', 'on', 'of'],
}

function playMatch(step = T12_MATCH) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="Unit 12" level="B1" onExit={() => {}} onDone={() => {}} />
    </I18nProvider>,
  )
}

const chips = () => [...document.querySelectorAll('.cp-match__bank .cp-chip')]
const liveChips = (text) => chips().filter((b) => b.textContent === text && !b.disabled)
const checkBtn = () => screen.getByRole('button', { name: 'Проверить' })

// Банк перемешан сидом, поэтому копию берём адресно — первую незанятую.
function link(left, right) {
  const item = [...document.querySelectorAll('.cp-match__item')].find((b) =>
    b.querySelector('.cp-match__left')?.textContent === left,
  )
  fireEvent.click(item)
  fireEvent.click(liveChips(right)[0])
}

describe('CourseStepPlayer — банк матчинга с повторяющимися вариантами', () => {
  it('две пары берут два одинаковых «on», тест собирается целиком', () => {
    playMatch()
    expect(liveChips('on')).toHaveLength(2)

    link('depend', 'on')
    // Гаснет ровно одна копия — вторая ещё нужна паре rely→on.
    expect(liveChips('on')).toHaveLength(1)
    expect(checkBtn().disabled).toBe(true)

    link('rely', 'on')
    expect(liveChips('on')).toHaveLength(0)

    link('aware', 'of')
    expect(liveChips('of')).toHaveLength(1)
    link('interested', 'in')
    link('capable', 'of')

    expect(checkBtn().disabled).toBe(false)
    fireEvent.click(checkBtn())
    expect(screen.queryByText(/неверный ответ/i)).toBeNull()
  })

  it('разрыв пары возвращает копию в банк', () => {
    playMatch()
    link('depend', 'on')
    expect(liveChips('on')).toHaveLength(1)

    // Повторный тап по соединённому пункту разрывает пару.
    const item = [...document.querySelectorAll('.cp-match__item')].find((b) =>
      b.querySelector('.cp-match__left')?.textContent === 'depend',
    )
    fireEvent.click(item)
    expect(liveChips('on')).toHaveLength(2)
  })

  it('лишняя копия в банке остаётся доступной как дистрактор', () => {
    // Банк богаче пар: третий «on» никому не нужен, но гасить его не за что —
    // расход считается по копиям банка, а не по числу пар.
    playMatch({
      type: 'match',
      pairs: [
        { left: 'depend', right: 'on' },
        { left: 'rely', right: 'on' },
      ],
      options: ['on', 'on', 'on'],
    })
    link('depend', 'on')
    link('rely', 'on')
    expect(liveChips('on')).toHaveLength(1)
    expect(checkBtn().disabled).toBe(false)
  })
})
