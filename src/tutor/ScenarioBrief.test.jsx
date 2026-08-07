// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { LanguageProvider } from '../i18n/LanguageContext.jsx'
import ScenarioBrief from './ScenarioBrief.jsx'

// LanguageProvider — адаптер над I18nProvider (см. src/app/providers.jsx) и
// без него падает с ошибкой; тестовое дерево повторяет тот же порядок
// вложенности, что и реальное приложение.
function renderBrief(props) {
  return render(
    <I18nProvider>
      <LanguageProvider>
        <ScenarioBrief {...props} />
      </LanguageProvider>
    </I18nProvider>,
  )
}

describe('ScenarioBrief', () => {
  it('у сцены без текста ничего не рисует', () => {
    // Без @testing-library/jest-dom в проекте: пустой контейнер проверяем
    // отсутствием первого дочернего узла, а не матчером toBeEmptyDOMElement.
    const { container } = renderBrief({ scenarioId: 'hotel-check-in' })
    expect(container.firstChild).toBeNull()
  })
  it('без текста не рисует и переданное действие', () => {
    // Плашка либо целая, либо её нет вовсе: голая кнопка без ситуации —
    // это половина интерфейса.
    renderBrief({
      scenarioId: 'hotel-check-in',
      action: <button type="button">Поехали</button>,
    })
    expect(screen.queryByText('Поехали')).toBeNull()
  })
  it('рисует пункты ситуации и переданное действие', () => {
    renderBrief({
      scenarioId: '911-call',
      action: <button type="button">Поехали</button>,
    })
    expect(screen.getByRole('note')).toBeTruthy()
    // Пять строк брифинга — по пункту на строку.
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Поехали')).toBeTruthy()
  })
})
