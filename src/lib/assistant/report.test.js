import { describe, it, expect } from 'vitest'
import {
  REPORT_BUG_MARKER,
  REPORTED_STREAM_MARKER,
  splitReport,
  createReportFilter,
  createReportedFlagFilter,
} from './report.js'

describe('splitReport', () => {
  it('без метки — весь текст видимый', () => {
    expect(splitReport('просто ответ')).toStrictEqual({ visible: 'просто ответ', report: null })
  })

  it('отрезает служебный отчёт после метки', () => {
    const raw = `Страница не открывается. Обновите и напишите ещё раз, если не поможет — передам команде.\n${REPORT_BUG_MARKER}\nРаздел: Урок\nАдрес: /lesson/12\nЧто: белый экран после «Начать»`
    expect(splitReport(raw)).toStrictEqual({
      visible: 'Страница не открывается. Обновите и напишите ещё раз, если не поможет — передам команде.',
      report: 'Раздел: Урок\nАдрес: /lesson/12\nЧто: белый экран после «Начать»',
    })
  })
})

describe('createReportFilter', () => {
  it('отдаёт обычный текст как есть', () => {
    const f = createReportFilter()
    const out = f.push('Опечатка: ') + f.push('«Cleare».') + f.flush()
    expect(out).toBe('Опечатка: «Cleare».')
    expect(f.report()).toBeNull()
  })

  it('прячет метку, разрезанную на куски', () => {
    const f = createReportFilter()
    const visible = f.push('Похоже, урок завис. ') + f.push('[[REP') + f.push('ORT_BUG]]\nРаздел: Урок\nкнопка не отвечает') + f.flush()
    expect(visible.trimEnd()).toBe('Похоже, урок завис.')
    expect(f.report()).toBe('Раздел: Урок\nкнопка не отвечает')
  })
})

describe('createReportedFlagFilter', () => {
  it('срезает служебный хвост и ставит флаг', () => {
    const f = createReportedFlagFilter()
    const out = f.push('Ответ ученику') + f.push(REPORTED_STREAM_MARKER) + f.flush()
    expect(out).toBe('Ответ ученику')
    expect(f.reported).toBe(true)
  })

  it('без хвоста флага нет', () => {
    const f = createReportedFlagFilter()
    expect(f.push('просто текст') + f.flush()).toBe('просто текст')
    expect(f.reported).toBe(false)
  })
})
