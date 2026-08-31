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

const renderResult = (props = {}) =>
  render(
    <I18nProvider>
      <PlacementResult result={result} lang="ru" onDone={() => {}} {...props} />
    </I18nProvider>
  )

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
