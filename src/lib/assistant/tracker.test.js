import { describe, it, expect } from 'vitest'
import {
  RECALL_MARK,
  STALE_SECTION_DAYS,
  adviceDoneAt,
  adviceText,
  checkNotes,
  goalLine,
  inferAdviceOffer,
  mistakesLine,
  notesLines,
  practiceLine,
  weekLine,
} from './tracker.js'

const NOW = Date.parse('2026-10-15T12:00:00Z')
const note = (target, createdAt = '2026-10-14T10:00:00Z', extra = {}) => ({ id: '1', target, advice: 'совет', createdAt, doneAt: null, ...extra })

describe('совет одной строкой', () => {
  it('последние одно-два предложения перед вопросом-кнопкой', () => {
    expect(
      adviceText('Айгерім, вы на Главной. У вас домашка «Unit 4» со сроком 17 октября. С неё и стоит начать. Открыть?'),
    ).toBe('У вас домашка «Unit 4» со сроком 17 октября. С неё и стоит начать.')
    expect(adviceText('Сөздікті ашайын ба?')).toBe('Сөздікті ашайын ба?')
  })

  it('длинное — с конца, где и стоит совет', () => {
    const out = adviceText(`${'а'.repeat(300)}. Начните с аудирования.`, 60)
    expect(out.length).toBe(60)
    expect(out.startsWith('…')).toBe(true)
    expect(out.endsWith('Начните с аудирования.')).toBe(true)
  })
})

describe('кнопка к первой реплике, если модель забыла метку', () => {
  const profile = 'Уровень A2.\nСовет сайта, что сделать сейчас: Аудирование: мини-игра — самый слабый навык — listening (метка [[OPEN listening]]).'

  it('«Открыть …?» про раздел совета — кнопка этого раздела', () => {
    expect(inferAdviceOffer('Аудирование слабее всего. Открыть мини-игру по аудированию?', profile)).toEqual({
      kind: 'open',
      target: 'listening',
      now: false,
    })
    expect(inferAdviceOffer('Тыңдалым әлсіз. Шағын ойынды ашайын ба?', profile)?.target).toBe('listening')
  })

  it('без вопроса «открыть», про другой раздел или без совета — без кнопки', () => {
    expect(inferAdviceOffer('С аудирования и стоит начать?', profile)).toBeNull()
    expect(inferAdviceOffer('Повторите слова. Открыть словарь?', profile)).toBeNull()
    expect(inferAdviceOffer('Открыть мини-игру?', 'Уровень A2.')).toBeNull()
  })
})

describe('выполнен ли совет — по данным сайта после него', () => {
  it('раздел Практики: заход в него после совета', () => {
    const practice = [{ area: 'vocab', updatedAt: '2026-10-14T18:00:00Z' }, { area: 'reading', updatedAt: '2026-10-15T09:00:00Z' }]
    expect(adviceDoneAt(note('vocab'), { practice })).toEqual({ checkable: true, doneAt: '2026-10-14T18:00:00.000Z' })
    // Заход ДО совета — не выполнение.
    expect(adviceDoneAt(note('vocab', '2026-10-14T20:00:00Z'), { practice })).toEqual({ checkable: true, doneAt: null })
    // Вкладка навыка — любой её тренажёр.
    expect(adviceDoneAt(note('practice-reading'), { practice }).doneAt).toBe('2026-10-15T09:00:00.000Z')
    // «Практика» целиком — любой раздел, самый ранний заход после совета.
    expect(adviceDoneAt(note('practice'), { practice }).doneAt).toBe('2026-10-14T18:00:00.000Z')
  })

  it('Speaking Buddy — звонок с подключившимся тьютором после совета', () => {
    const tutorSessions = ['2026-10-13T10:00:00Z', '2026-10-15T08:00:00Z']
    expect(adviceDoneAt(note('tutor'), { tutorSessions })).toEqual({ checkable: true, doneAt: '2026-10-15T08:00:00.000Z' })
  })

  it('домашка — по дате сдачи; без дат у заданий — не проверить, а не «не выполнено»', () => {
    expect(adviceDoneAt(note('homework'), { homework: [{ status: 'SUBMITTED', submittedAt: '2026-10-14T15:00:00Z' }] }).doneAt).toBe(
      '2026-10-14T15:00:00.000Z',
    )
    expect(adviceDoneAt(note('homework'), { homework: [{ status: 'SUBMITTED' }] })).toEqual({ checkable: false, doneAt: null })
  })

  it('данных нет или проверить нечем — «не проверить»', () => {
    expect(adviceDoneAt(note('vocab'), { practice: null })).toEqual({ checkable: false, doneAt: null })
    expect(adviceDoneAt(note('learning'), { practice: [] })).toEqual({ checkable: false, doneAt: null })
    expect(adviceDoneAt(note('lessons'), {})).toEqual({ checkable: false, doneAt: null })
  })

  it('checkNotes: выполненные возвращает на запись, уже отмеченные не трогает', () => {
    const notes = [note('vocab'), note('tutor', '2026-10-10T10:00:00Z', { id: '2', doneAt: '2026-10-11T10:00:00.000Z' })]
    const { notes: out, updates } = checkNotes(notes, { practice: [{ area: 'vocab', updatedAt: '2026-10-14T18:00:00Z' }] })
    expect(updates).toEqual([{ id: '1', doneAt: '2026-10-14T18:00:00.000Z' }])
    expect(out[1].doneAt).toBe('2026-10-11T10:00:00.000Z')
  })
})

describe('строки трекера для модели', () => {
  it('прошлые советы: когда, куда, что и статус', () => {
    const text = notesLines(
      [
        { ...note('homework'), advice: 'С домашки и стоит начать.', doneAt: '2026-10-14T15:00:00.000Z', checkable: true },
        { ...note('listening', '2026-10-12T10:00:00Z'), advice: 'Начните с аудирования.', checkable: true },
        { ...note('learning', '2026-10-15T09:00:00Z'), checkable: false },
      ],
      NOW,
    )
    // Вспомнить — самый свежий из прошлых дней с известным исходом; пометку ставит код, не модель.
    expect(text).toContain(`- 2026-10-14 (вчера): Домашняя работа — «С домашки и стоит начать.» — выполнено 2026-10-14  ${RECALL_MARK}`)
    expect(text).toContain('- 2026-10-12 (3 дн. назад): Аудирование: мини-игра — «Начните с аудирования.» — пока не выполнено\n')
    expect(text).toContain('(сегодня)')
    expect(text).toContain('выполнение не проверить по данным сайта')
    expect(text.split(RECALL_MARK)).toHaveLength(2)
    expect(notesLines([], NOW)).toBeNull()
  })

  it('пометка «вспомни»: не сегодняшний, не старше недели и не «не проверить»', () => {
    const marked = (notes) => (notesLines(notes, NOW).match(/^- .*$/gm) || []).filter((l) => l.includes(RECALL_MARK))
    expect(marked([{ ...note('vocab', '2026-10-15T09:00:00Z'), checkable: true }])).toEqual([])
    expect(marked([{ ...note('vocab', '2026-10-07T09:00:00Z'), checkable: true }])).toEqual([])
    expect(marked([{ ...note('learning', '2026-10-13T09:00:00Z'), checkable: false }])).toEqual([])
    expect(
      marked([
        { ...note('vocab', '2026-10-15T09:00:00Z'), checkable: true },
        { ...note('learning', '2026-10-14T09:00:00Z'), checkable: false },
        { ...note('tutor', '2026-10-13T09:00:00Z'), checkable: true },
      ]),
    ).toEqual([expect.stringContaining('Speaking Buddy')])
  })

  it('две недели рядом — по суточным строкам', () => {
    const days = [
      { date: '2026-10-15', tutorSeconds: 600, trainerSeconds: 0, practiceTasks: 10, practiceFirstTry: 7 },
      { date: '2026-10-10', tutorSeconds: 0, trainerSeconds: 300, practiceTasks: 10, practiceFirstTry: 9 },
      { date: '2026-10-05', tutorSeconds: 0, trainerSeconds: 0, practiceTasks: 4, practiceFirstTry: 2 },
    ]
    expect(weekLine(days, NOW)).toBe(
      'Последние 7 дней: дней с занятиями 2, заданий 20 (верно с первой попытки 80%), Speaking Buddy 10 мин, тренажёры 5 мин. ' +
        'Неделей раньше: дней с занятиями 1, заданий 4 (верно с первой попытки 50%), Speaking Buddy 0 мин, тренажёры 0 мин.',
    )
  })

  it('две недели без занятий — так и сказано; новичок без единого дня — строки нет', () => {
    expect(weekLine([{ date: '2026-09-01', practiceTasks: 3 }], NOW)).toBe('Последние две недели занятий на сайте не было.')
    expect(weekLine([], NOW)).toBeNull()
  })

  it('разделы Практики: давно не открытые отдельно от свежих', () => {
    expect(STALE_SECTION_DAYS).toBe(7)
    const line = practiceLine(
      [
        { area: 'vocab', updatedAt: '2026-10-15T08:00:00Z' },
        { area: 'reading', updatedAt: '2026-10-04T08:00:00Z' },
        // Ровно STALE_SECTION_DAYS (7) дней назад — ещё «недавно».
        { area: 'grammar', updatedAt: '2026-10-08T08:00:00Z' },
        { area: 'verbs', updatedAt: '2026-09-25T08:00:00Z' },
        { area: 'unknown-area', updatedAt: '2026-10-15T08:00:00Z' },
      ],
      NOW,
    )
    expect(line).toBe(
      'Разделы Практики, где ученик уже бывал: давно не открывал — Чтение (11 дн. назад), Неправильные глаголы (20 дн. назад); недавно — Словарь (сегодня), Грамматика (7 дн. назад).',
    )
    expect(practiceLine([], NOW)).toBeNull()
  })

  it('цель и ошибки из звонков', () => {
    expect(goalLine({ target: 'B1', from: 'A2' })).toBe('Цель уровня, которую ученик выбрал: B1 (от A2).')
    expect(goalLine(null)).toBeNull()
    expect(mistakesLine(['he go to school', '  ', 'I am agree'])).toBe(
      'Ошибки из разговоров со Speaking Buddy, ещё не пройденные: «he go to school»; «I am agree».',
    )
    expect(mistakesLine([])).toBeNull()
  })
})
