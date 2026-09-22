// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { PlacementResult } from './PlacementTestPage.jsx'

const result = {
  level: 'B1',
  theta: -0.2,
  se: 0.5,
  flags: [],
  skills: { routing: { n: 6, correct: 4, score: 4 } },
  lex: null,
  writing: null,
  speaking: [],
}

const renderResult = ({ result: r = result, ...props } = {}) =>
  render(
    <I18nProvider>
      <PlacementResult result={r} lang="ru" onDone={() => {}} {...props} />
    </I18nProvider>
  )

describe('PlacementResult — честность оценки', () => {
  it('говорит, что шкала временная, пока банк не откалиброван', () => {
    renderResult({ result: { ...result, cutsProvisional: true } })

    expect(screen.getByText(/шкала уровней ещё калибруется/)).toBeTruthy()
  })

  it('предупреждает, когда движок сам не уверен в уровне', () => {
    // флаг `unresolved` = SE > 0.6
    renderResult({ result: { ...result, flags: ['unresolved'] } })

    expect(screen.getByText(/не хватило для уверенной оценки/)).toBeTruthy()
  })

  it('на A0 объясняет, что учиться начнём с A1', () => {
    renderResult({ result: { ...result, level: 'A0' } })

    expect(screen.getByText(/Начнём с A1/)).toBeTruthy()
  })

  it('на уверенном результате по калиброванной шкале молчит', () => {
    renderResult()

    expect(screen.queryByText(/калибруется/)).toBeNull()
    expect(screen.queryByText(/уверенной оценки/)).toBeNull()
    expect(screen.queryByText(/Начнём с A1/)).toBeNull()
  })
})

describe('PlacementResult — шкала не спорит с заголовком', () => {
  /** Инлайновый left подписи уровня на шкале, в процентах. */
  const tickLeft = (name) => {
    const span = [...document.querySelectorAll('.plc-band__ticks span')]
      .find((el) => el.textContent === name)
    return span ? parseFloat(span.style.left) : null
  }

  it('подписи стоят на своих границах по θ, а не через равные промежутки', () => {
    // Границы из CUTS: A1 с θ=-2.5, A2 с -1.8, B1 с -1.0, B2 с 0. В шкале
    // от -3.5 до 2.5 это 16.7 / 28.3 / 41.7 / 58.3 %. Разложенные поровну
    // (space-between) они стояли бы через 16.7% — и B1 промахивался почти
    // на четверть шкалы.
    renderResult()

    expect(tickLeft('A0')).toBeCloseTo(0, 1)
    expect(tickLeft('A1')).toBeCloseTo(16.7, 1)
    expect(tickLeft('A2')).toBeCloseTo(28.3, 1)
    expect(tickLeft('B1')).toBeCloseTo(41.7, 1)
    expect(tickLeft('B2')).toBeCloseTo(58.3, 1)
    expect(tickLeft('C1')).toBeCloseTo(75, 1)
    expect(tickLeft('C2')).toBeCloseTo(91.7, 1)
  })

  it('A0 по разминке шкалу не рисует — она показывала бы другой уровень', () => {
    // Жалоба с экрана: крупная «A0», а полоса под ней дотянута до A2. A0 тут
    // ставится ПРАВИЛОМ (провалена разминка, не пройден мост), а полоса
    // рисуется по θ, которая правилом не затронута.
    renderResult({ result: { ...result, level: 'A0', flags: ['a0_branch'] } })

    expect(document.querySelector('.plc-level').textContent).toBe('A0')
    expect(document.querySelector('.plc-band')).toBeNull()
    expect(screen.getByText(/по разминке, а не по шкале/)).toBeTruthy()
  })

  it('когда шкала согласуется с уровнем — она на месте', () => {
    // θ=-0.2 это B1, заголовок тоже B1: противоречия нет, прятать нечего.
    renderResult()

    expect(document.querySelector('.plc-band')).toBeTruthy()
    expect(screen.queryByText(/по разминке, а не по шкале/)).toBeNull()
  })
})

describe('PlacementResult — сохранение уровня', () => {
  it('молчит, когда уровень сохранён', () => {
    renderResult({ saveState: 'saved' })

    // «B1» есть и в крупной цифре, и в подписи шкалы — берём саму цифру.
    expect(document.querySelector('.plc-level').textContent).toBe('B1')
    expect(screen.queryByText(/не сохранился/)).toBeNull()
  })

  it('говорит вслух, когда уровень не сохранился, и даёт повторить', () => {
    // Раньше осечка уходила в console.warn: экран выглядел успешным, а на
    // бэкенде уровня не было — и следующий вход снова требовал тест.
    const onRetrySave = vi.fn()
    renderResult({ saveState: 'error', onRetrySave })

    expect(screen.getByText(/не сохранился на сервере/)).toBeTruthy()
    fireEvent.click(screen.getByText('Сохранить ещё раз'))
    expect(onRetrySave).toHaveBeenCalledTimes(1)
  })

  it('во время сохранения показывает, что идёт запись', () => {
    renderResult({ saveState: 'saving' })

    expect(screen.getByText('Сохраняем уровень…')).toBeTruthy()
  })
})
