import { describe, it, expect } from 'vitest'
import {
  REPORT_LANGS, reportLang, reportLabels, skillName, goalResultLabel, periodLabel, badgeView, formatLabel,
} from './labels.js'

const SKILLS = ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary']

describe('reportLang', () => {
  it('приводит код к ru / kk / en, остальное — ru', () => {
    expect(reportLang('KK')).toBe('kk')
    expect(reportLang('kz')).toBe('kk')
    expect(reportLang('en')).toBe('en')
    expect(reportLang('de')).toBe('ru')
    expect(reportLang(undefined)).toBe('ru')
  })
})

describe('подписи на трёх языках', () => {
  it('у каждого языка есть все подписи блоков, навыков и статусов целей', () => {
    const keys = Object.keys(reportLabels('ru'))
    for (const l of REPORT_LANGS) {
      for (const k of keys) expect(reportLabels(l)[k], `${l}.${k}`).toBeTruthy()
      for (const s of SKILLS) expect(skillName(s, l), `${l}.${s}`).not.toBe(s)
      for (const r of ['achieved', 'partly', 'not']) expect(goalResultLabel(r, l), `${l}.${r}`).toBeTruthy()
    }
  })

  it('навыки и статусы — по прототипу', () => {
    expect(skillName('speaking', 'kk')).toBe('Сөйлеу')
    expect(skillName('vocabulary', 'ru')).toBe('Лексика')
    expect(skillName('unknown', 'ru')).toBe('unknown')
    expect(goalResultLabel('partly', 'en')).toBe('Partly')
    expect(goalResultLabel(null, 'ru')).toBe('')
  })
})

describe('periodLabel', () => {
  it('месяц и дни периода — 30-дневный ритм', () => {
    expect(periodLabel(2, 'ru')).toBe('2-й месяц (дни 31–60)')
    expect(periodLabel(2, 'kk')).toBe('2-ай (31–60 күн)')
    expect(periodLabel(2, 'en')).toBe('Month 2 (days 31–60)')
    expect(periodLabel(1, 'ru')).toBe('1-й месяц (дни 1–30)')
  })

  it('без номера периода — пусто, а не «NaN-й месяц»', () => {
    expect(periodLabel(null, 'ru')).toBe('')
    expect(periodLabel(0, 'ru')).toBe('')
  })
})

describe('badgeView', () => {
  it('подписывает бейдж на языке отчёта', () => {
    expect(badgeView({ type: 'skills_growth', n: 3 }, 'ru')).toEqual({ icon: '📈', text: 'Рост в 3 навыках' })
    expect(badgeView({ type: 'months_with_jts', n: 2 }, 'kk')).toEqual({ icon: '🏅', text: 'JTS-пен 2 ай' })
    expect(badgeView({ type: 'homework_hero' }, 'en')).toEqual({ icon: '📚', text: 'Homework hero' })
  })

  it('число в бейдже склоняет слово: «1 цель достигнута», а не «1 цели достигнуто»', () => {
    const text = (type, n, lang) => badgeView({ type, n }, lang).text
    expect(text('goals_achieved', 1, 'ru')).toBe('1 цель достигнута')
    expect(text('goals_achieved', 2, 'ru')).toBe('2 цели достигнуты')
    expect(text('goals_achieved', 5, 'ru')).toBe('5 целей достигнуто')
    expect(text('goals_achieved', 11, 'ru')).toBe('11 целей достигнуто')
    expect(text('goals_achieved', 21, 'ru')).toBe('21 цель достигнута')
    expect(text('skills_growth', 1, 'ru')).toBe('Рост в 1 навыке')
    expect(text('skills_growth', 4, 'ru')).toBe('Рост в 4 навыках')
    expect(text('goals_achieved', 1, 'en')).toBe('1 goal achieved')
    expect(text('goals_achieved', 3, 'en')).toBe('3 goals achieved')
    expect(text('skills_growth', 1, 'en')).toBe('Grew in 1 skill')
    expect(text('months_with_jts', 1, 'en')).toBe('1 month with JTS')
    expect(text('months_with_jts', 2, 'en')).toBe('2 months with JTS')
    // По-казахски существительное после числа не меняется.
    expect(text('goals_achieved', 1, 'kk')).toBe('1 мақсат орындалды')
    expect(text('goals_achieved', 3, 'kk')).toBe('3 мақсат орындалды')
  })

  it('незнакомый бейдж и бейдж без числа пропускаются', () => {
    expect(badgeView({ type: 'mystery' }, 'ru')).toBeNull()
    expect(badgeView({ type: 'goals_achieved' }, 'ru')).toBeNull()
    expect(badgeView(null, 'ru')).toBeNull()
  })
})

describe('formatLabel', () => {
  it('формат занятий как в прототипе', () => {
    expect(formatLabel('individual')).toBe('1 to 1')
    expect(formatLabel('group', 'Elementary 211 (kaz)')).toBe('Group · Elementary 211 (kaz)')
    expect(formatLabel('group', null)).toBe('Group')
  })
})
