// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { I18nProvider } from '../i18n.jsx'
import { KINGDOMS } from '../kingdoms.js'
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

// Находка ревью: дефолт пропса остался от прежней карты ('A1'), где первым
// городом был A1. После сдвига городов студент без уровня в профиле открывал
// карту на втором городе, а первый — курс A0, с которого его и надо начинать —
// выглядел уже пройденным.
describe('LearningPage — уровень по умолчанию', () => {
  const nodeOf = (map, name) => map.getByAltText(name).closest('.lp-node')

  it('без уровня в пропсах текущий город — первый на карте, Redtown (A0)', () => {
    const { map } = renderMap({ userLevel: undefined })
    expect(nodeOf(map, 'Redtown').className).toContain('is-current')
  })

  it('без уровня в пропсах второй город закрыт, а не пройден', () => {
    const { map } = renderMap({ userLevel: undefined })
    const next = nodeOf(map, 'Bluewave Town')
    expect(next.className).toContain('is-locked')
    expect(next.disabled).toBe(true)
  })
})

// Находка ревью: белый код уровня лежал прямо на цвете кольца — 3.1:1 на
// оранжевом Redtown и 2.2:1 на жёлтом Cocalastic Town при кегле ~13px, ниже
// требуемых WCAG 2.1 AA 4.5:1. Доступность в проекте — часть определения
// готовности, поэтому контраст проверяется числом, а не на глаз.
describe('LearningPage — контраст текстового фолбэка на узле карты', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'styles.css'), 'utf8')
  const rule = /\.lp-node__fallback\s*\{([^}]*)\}/.exec(css)[1]
  const prop = (name) => new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+)`, 'm').exec(rule)?.[1].trim()

  const parseColor = (value) => {
    const rgba = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(value)
    if (rgba) return { rgb: [+rgba[1], +rgba[2], +rgba[3]], alpha: rgba[4] === undefined ? 1 : +rgba[4] }
    const hex = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(value)[1]
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    return { rgb: full.match(/../g).map((h) => parseInt(h, 16)), alpha: 1 }
  }
  const over = (fg, bg) => fg.rgb.map((c, i) => fg.alpha * c + (1 - fg.alpha) * bg[i])
  const luminance = (rgb) =>
    rgb
      .map((c) => c / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  it('код уровня читается на кольце любого города — не ниже AA 4.5:1', () => {
    const text = parseColor(prop('color'))
    const scrim = parseColor(prop('background'))
    for (const kingdom of KINGDOMS) {
      const ring = parseColor(kingdom.ring).rgb
      const behind = over(scrim, ring)
      const ratio = contrast(over(text, behind), behind)
      expect(ratio, `${kingdom.level} (кольцо ${kingdom.ring})`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
