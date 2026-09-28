import { describe, it, expect } from 'vitest'
import {
  REPORT_BUG_MARKER,
  REPORTED_STREAM_MARKER,
  splitReport,
  createReportFilter,
  createReportedFlagFilter,
  errorThreadFromMessages,
  shouldAutoReportBug,
  fallbackBugSummary,
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

describe('errorThreadFromMessages', () => {
  it('берёт чат с чипа «На сайте ошибка», а не только последнюю реплику', () => {
    const thread = errorThreadFromMessages([
      { role: 'user', content: 'почему неверно?' },
      { role: 'assistant', content: 'опечатка' },
      { role: 'user', content: 'На сайте ошибка' },
      { role: 'assistant', content: 'Расскажите подробнее' },
      { role: 'user', content: 'на втором упражнении аудио обрывается через 2 секунды' },
      { role: 'assistant', content: 'Обновите страницу' },
      { role: 'user', content: 'все еще не работает ты сам передаш?' },
    ])
    expect(thread).toContain('Ученик: На сайте ошибка')
    expect(thread).toContain('аудио обрывается через 2 секунды')
    expect(thread).toContain('все еще не работает ты сам передаш?')
    expect(thread).not.toContain('почему неверно?')
  })

  it('без чипа — последнее сообщение ученика', () => {
    expect(errorThreadFromMessages([
      { role: 'user', content: 'урок не открывается, белый экран' },
    ])).toBe('Ученик: урок не открывается, белый экран')
  })
})

describe('shouldAutoReportBug', () => {
  it('чип без описания — ещё рано', () => {
    expect(shouldAutoReportBug([{ role: 'user', content: 'На сайте ошибка' }])).toBe(false)
  })

  it('чип плюс описание — писать команде, не ждать «передай сам»', () => {
    expect(shouldAutoReportBug([
      { role: 'user', content: 'На сайте ошибка' },
      { role: 'assistant', content: 'Что случилось?' },
      { role: 'user', content: 'на втором упражнении аудио обрывается через 2 секунды' },
    ])).toBe(true)
  })

  it('чип плюс «спасибо» — не отчёт', () => {
    expect(shouldAutoReportBug([
      { role: 'user', content: 'На сайте ошибка' },
      { role: 'user', content: 'спасибо' },
    ])).toBe(false)
  })
})

describe('fallbackBugSummary', () => {
  it('коротко пишет раздел и суть', () => {
    expect(fallbackBugSummary({
      screenName: 'Урок',
      pageUrl: 'https://app.example/lesson/12',
      lastUserText: 'аудио обрывается',
    })).toContain('Раздел: Урок')
  })
})
