import { describe, it, expect } from 'vitest'
import { situationSub } from './SituationGrid.jsx'
import { SCENARIOS } from './scenarios.js'
import { DICT } from '../i18n/dict.js'

describe('situationSub — подпись карточки ситуации', () => {
  it('берёт часть описания до двоеточия, с заглавной', () => {
    expect(situationSub('собеседование в посольстве США: визовый офицер и вердикт')).toBe(
      'Собеседование в посольстве США',
    )
  })

  it('без двоеточия — описание целиком', () => {
    expect(situationSub('заказ кофе')).toBe('Заказ кофе')
  })

  it('пустое — пусто', () => {
    expect(situationSub('')).toBe('')
  })

  // Подпись в карточку влезает одной строкой: формат «коротко: подробно» у
  // описаний обязателен, иначе в сетке встанет целый абзац с многоточием.
  it('у каждой сцены описание в формате «коротко: подробно» на всех языках', () => {
    for (const lang of Object.keys(DICT)) {
      for (const s of SCENARIOS) {
        const desc = DICT[lang][`scen.desc.${s.id}`]
        if (!desc) continue
        expect(desc.includes(':'), `${lang} ${s.id}`).toBe(true)
      }
    }
  })
})
