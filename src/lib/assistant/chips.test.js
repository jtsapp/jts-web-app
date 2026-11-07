import { describe, it, expect } from 'vitest'
import { assistantChips, chipScreenKind } from './chips.js'
import { formatLine, learnerFormat } from './format.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dictText = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')

const keys = (args) => assistantChips(args).map((c) => c.key)

describe('готовые вопросы Луны по экрану и формату (ТЗ v2.0, 7.3)', () => {
  it('вид экрана: тест сильнее задания, задание сильнее раздела', () => {
    expect(chipScreenKind({ screen: 'kingdom-interior', test: true, task: true })).toBe('test')
    expect(chipScreenKind({ screen: 'home', task: true })).toBe('task')
    expect(chipScreenKind({ screen: 'home' })).toBe('home')
    expect(chipScreenKind({ screen: 'ge-onboarding' })).toBe('onboarding')
    expect(chipScreenKind({ screen: 'practice' })).toBe('other')
  })

  // Кейс 44: у Self Study и демо нет «Как перенести урок?» и «Где мои домашки?».
  it('Главная: вопросы про уроки и домашку — только формату с преподавателем', () => {
    expect(keys({ kind: 'home', format: 'with_teacher' })).toEqual([
      'assistant.suggest.today', 'assistant.suggest.move', 'assistant.suggest.homework', 'assistant.suggest.bug',
    ])
    for (const format of ['self_study', 'demo', null]) {
      expect(keys({ kind: 'home', format })).not.toContain('assistant.suggest.move')
      expect(keys({ kind: 'home', format })).not.toContain('assistant.suggest.homework')
    }
    expect(keys({ kind: 'home', format: 'demo' })).toContain('assistant.suggest.trial')
  })

  it('«Как работают токены?» — только где токены включены', () => {
    expect(keys({ kind: 'home', format: 'self_study', rewards: true })).toContain('assistant.suggest.tokens')
    expect(keys({ kind: 'home', format: 'self_study', rewards: false })).not.toContain('assistant.suggest.tokens')
  })

  it('задание: «Подсказать?» с просьбой о подсказке; на тесте подсказки нет', () => {
    const task = assistantChips({ kind: 'task' })
    expect(task[0]).toEqual({ key: 'assistant.suggest.hint', ask: 'assistant.suggest.hintAsk' })
    expect(keys({ kind: 'test' })).not.toContain('assistant.suggest.hint')
    // «Почему мой ответ неверный?» на Главной висел у всех (аудит 06.11.2026) — его там больше нет.
    expect(keys({ kind: 'home', format: 'with_teacher' })).not.toContain('assistant.suggest.whyWrongShort')
  })

  it('у каждого вопроса — строка на трёх языках', () => {
    const all = new Set()
    for (const kind of ['test', 'task', 'home', 'onboarding', 'other']) {
      for (const format of ['with_teacher', 'self_study', 'demo', null]) {
        for (const rewards of [true, false]) {
          for (const c of assistantChips({ kind, format, rewards })) {
            all.add(c.key)
            if (c.ask) all.add(c.ask)
          }
        }
      }
    }
    const dicts = ['../../i18n.jsx', '../../i18n/lang-en.js', '../../i18n/lang-kk.js'].map(dictText)
    for (const key of all) for (const d of dicts) expect(d, key).toContain(`'${key}':`)
  })
})

describe('формат ученика (format.js)', () => {
  it('демо сильнее абонемента, SELF — Self Study, остальные — с преподавателем', () => {
    expect(learnerFormat({ demo: true, sections: { known: true, format: 'INDIVIDUAL' } })).toBe('demo')
    expect(learnerFormat({ sections: { known: true, format: 'SELF' } })).toBe('self_study')
    for (const f of ['INDIVIDUAL', 'PAIR', 'GROUP']) expect(learnerFormat({ sections: { known: true, format: f } })).toBe('with_teacher')
    // Абонемента нет или ответ не пришёл — формат неизвестен, а не «с преподавателем».
    expect(learnerFormat({ sections: { known: false, format: null } })).toBeNull()
    expect(learnerFormat({})).toBeNull()
  })

  it('строка профиля для модели', () => {
    expect(formatLine({ sections: { known: true, format: 'GROUP' } })).toBe(
      'Формат обучения: с преподавателем (в группе) — есть уроки по расписанию и домашка от преподавателя.',
    )
    expect(formatLine({ sections: { known: true, format: 'SELF' } })).toMatch(/Self Study — самостоятельно/)
    expect(formatLine({ demo: true })).toMatch(/демо-доступ/)
    expect(formatLine({})).toBeNull()
  })
})
