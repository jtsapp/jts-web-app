// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LearningPage from './LearningPage.jsx'

// jsdom не грузит картинки по-настоящему (сеть отключена), поэтому проверить
// поведение при неудачной загрузке можно только руками — сымитировать событие
// error на реальном <img>, которое браузер прислал бы для отсутствующего файла
// (после сдвига карты нет public/assets/world/levels/a0.webp).
// Запросы скопированы на канвас карты (.lp-map__canvas), а не на весь документ:
// сайдбар тоже показывает уровень пользователя текстом "A0" — без скоупа
// getByText('A0') находит не тот узел.
function renderMap(props) {
  const utils = render(
    <I18nProvider>
      <LearningPage userName="Demo" userLevel="A0" token="t" onOpenKingdom={() => {}} onNav={() => {}} onProfile={() => {}} {...props} />
    </I18nProvider>,
  )
  const canvas = utils.container.querySelector('.lp-map__canvas')
  return { ...utils, map: within(canvas) }
}

describe('LearningPage — узел карты без картинки маскота', () => {
  it('узел A0 (текущий) остаётся опознаваемым, когда маскот не загрузился', () => {
    const { map } = renderMap()
    const mascot = map.getByAltText('Redtown')
    fireEvent.error(mascot)

    // Битой картинки больше нет...
    expect(map.queryByAltText('Redtown')).toBeNull()
    // ...а вместо неё в кольце виден код уровня — узел не превратился в пустой кружок.
    expect(map.getByText('A0')).toBeTruthy()
  })

  it('узел остаётся кликабельным и после ошибки загрузки маскота', () => {
    const onOpenKingdom = vi.fn()
    const { map } = renderMap({ onOpenKingdom })
    fireEvent.error(map.getByAltText('Redtown'))
    fireEvent.click(map.getByText('A0').closest('button'))
    expect(onOpenKingdom).toHaveBeenCalledWith(expect.objectContaining({ level: 'A0' }))
  })

  it('успешная загрузка маскота не показывает текстовый фолбэк', () => {
    const { map } = renderMap()
    expect(map.getByAltText('Redtown')).toBeTruthy()
    expect(map.queryByText('A0')).toBeNull()
  })
})
