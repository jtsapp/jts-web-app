import { describe, expect, it } from 'vitest'
import { REPLAN_OFF, dueWords, geGoalLine, gePlanToday, homeworkLine, lessonsPackageLine, tokensLine } from './contextLines.js'
import { STOP_OFF } from './dayControl.js'

// Строки профиля Луны (этап 1 ТЗ v2.0): данные те же, что у «Главной» и разделов. Слова строк — то, что видит модель.
const NOW = Date.parse('2026-11-07T08:00:00Z')

describe('dueWords', () => {
  it('сколько дней до срока — словами', () => {
    expect(dueWords('2026-11-05', NOW)).toBe('просрочено, срок был 2026-11-05')
    expect(dueWords('2026-11-07', NOW)).toBe('до 2026-11-07 (сегодня)')
    expect(dueWords('2026-11-08', NOW)).toBe('до 2026-11-08 (завтра)')
    expect(dueWords('2026-11-10', NOW)).toBe('до 2026-11-10 (через 3 дн.)')
    expect(dueWords('нет', NOW)).toBe('')
  })
})

describe('homeworkLine', () => {
  it('не загрузилось ≠ «работ нет»', () => {
    expect(homeworkLine(null, NOW)).toMatch(/^Домашку загрузить не удалось — не говори, что её нет/)
    expect(homeworkLine([], NOW)).toBe('Домашка от преподавателя: работ нет.')
  })

  it('всё сдано — открытых нет, но сдача и проверка названы', () => {
    expect(homeworkLine([{ title: 'A', status: 'SUBMITTED' }, { title: 'B', status: 'COMPLETED' }], NOW)).toBe(
      'Домашка от преподавателя: открытых работ нет (на проверке 1, проверено 1).',
    )
  })

  it('порядок: просрочено, на доработку, задано; больше восьми — «и ещё», длинное название обрезано', () => {
    const cards = [
      { title: 'Задано', status: 'ASSIGNED', dueDate: '2026-11-09' },
      { title: 'Доработать', status: 'NEEDS_REVISION' },
      { title: 'Опоздал', status: 'ASSIGNED', dueDate: '2026-11-01', materialParts: [{}], exercises: [{}, {}] },
      ...Array.from({ length: 7 }, (_, i) => ({ title: `Ещё ${i}`, status: 'ASSIGNED' })),
    ]
    const line = homeworkLine(cards, NOW)
    expect(line).toMatch(/^Домашка от преподавателя \(все работы раздела «Домашняя работа»\), открыто 10: «Опоздал» — просрочено, срок был 2026-11-01, заданий 3; «Доработать» — на доработку, без срока; «Задано» — задано, до 2026-11-09 \(через 2 дн\.\)/)
    expect(line).toMatch(/; и ещё 2\.$/)
    expect(homeworkLine([{ title: 'x'.repeat(120), status: 'ASSIGNED' }], NOW)).toContain(`«${'x'.repeat(79)}…»`)
  })
})

describe('lessonsPackageLine', () => {
  it('пакет: проведено, осталось, отмены и переносы; последний урок — подсказка продлить', () => {
    expect(lessonsPackageLine({ conducted: 7, remaining: 9, cancelled: 1, rescheduled: 0 })).toBe(
      'Уроки с преподавателем по пакету: проведено 7, осталось 9 (отменено 1).',
    )
    expect(lessonsPackageLine({ conducted: 15, remaining: 0 })).toMatch(/осталось 0\. Пакет заканчивается/)
    // Уроков не было вовсе (Self Study) или ручки нет — строки нет.
    expect(lessonsPackageLine({ conducted: 0, remaining: 0 })).toBe(null)
    expect(lessonsPackageLine(null)).toBe(null)
  })
})

describe('tokensLine', () => {
  it('баланс, период, ближайший недоступный приз и ночное списание', () => {
    const data = {
      period: { balance: 120, endsOn: '2026-11-30', daysLeft: 23, idlePoints: 10 },
      prizes: [{ name: 'Стикеры', costTokens: 100 }, { name: 'Кружка', costTokens: 300 }, { name: 'Худи', costTokens: 900 }],
    }
    expect(tokensLine(data, NOW)).toBe(
      'Токены: баланс 120; период до 2026-11-30 (осталось 23 дн.); ближайший приз «Кружка» — 300 токенов, не хватает 180; в будний день без активности ночью спишется 10.',
    )
    // В будний день так и сказано.
    expect(tokensLine(data, Date.parse('2026-11-06T08:00:00Z'))).toMatch(/спишется 10 — сегодня будний\.$/)
    expect(tokensLine({}, NOW)).toBe(null)
  })
})

describe('gePlanToday', () => {
  // shortDay и stopDay: null — план нового бэкенда (с «мало времени» и «На сегодня всё»), как на стенде
  const plan = (tasks) => ({ state: 'ready', today: '2026-11-07', shortDay: null, stopDay: null, tasks })

  it('план не собран — строк нет', () => {
    expect(gePlanToday(null, NOW)).toEqual({ lines: [], next: null })
    expect(gePlanToday({ state: 'building' }, NOW)).toEqual({ lines: [], next: null })
  })

  it('без своих задач на сегодня — так и сказано; занятие и задача преподавателя не в плане', () => {
    const r = gePlanToday(plan([
      { id: 'l', date: '2026-11-07', kind: 'live', status: 'available' },
      { id: 't', date: '2026-11-07', kind: 'practice', module: 'vocabulary_sr', origin: 'teacher', status: 'available', minutes: 10 },
    ]), NOW)
    expect(r).toEqual({ lines: ['План на сегодня: на сегодня своих задач в плане нет.'], next: null })
  })

  it('перенесённое с прошлых дней — без упрёка и первым шагом; старше двух недель — забыто', () => {
    const r = gePlanToday(plan([
      { id: 'old', date: '2026-10-01', kind: 'course', status: 'available', minutes: 30 },
      { id: 'm', date: '2026-11-05', kind: 'practice', module: 'shadowing', status: 'available', minutes: 10 },
      { id: 'c', date: '2026-11-07', kind: 'course', status: 'completed', minutes: 30 },
    ]), NOW)
    expect(r.lines).toEqual([
      'План на сегодня (тот же, что блок «Сегодня» на Главной; занятия и домашка преподавателя — не в нём): урок курса — 30 мин, готово. Сделано 30 из 30 мин.',
      'Перенесено с прошлых дней (не «просрочено» — без упрёка): шэдоуинг (с 2026-11-05).',
    ])
    expect(r.next).toEqual({ id: 'shadowing', name: expect.any(String), reason: 'следующий шаг плана (шэдоуинг, перенесён с 2026-11-05)' })
  })

  it('всё выполнено — следующего шага нет', () => {
    const r = gePlanToday(plan([{ id: 'c', date: '2026-11-07', kind: 'course', status: 'completed', minutes: 30 }]), NOW)
    expect(r.lines.at(-1)).toBe('Все задачи плана на сегодня выполнены.')
    expect(r.next).toBe(null)
  })
})

describe('geGoalLine', () => {
  it('цель профиля GE со сроком и без', () => {
    expect(geGoalLine({ targetLevel: 'B1', deadline: { date: '2027-01-21' } })).toBe(
      'Цель ученика (профиль General English, как на баннере Главной): B1, срок 2027-01-21.',
    )
    expect(geGoalLine({ targetLevel: 'B2' })).toBe('Цель ученика (профиль General English, как на баннере Главной): B2.')
    expect(geGoalLine({})).toBe(null)
  })
})

// ТЗ v2.0, 5.2: Луна знает, что день уже собран под «мало времени», и что ушло.
describe('gePlanToday: «мало времени»', () => {
  it('строка о выбранных минутах и перенесённом', () => {
    const r = gePlanToday({
      state: 'ready',
      today: '2026-11-07',
      shortDay: { minutes: 20 },
      tasks: [
        { id: 1, date: '2026-11-07', kind: 'practice', module: 'ai_tutor', status: 'available', minutes: 15 },
        { id: 2, date: '2026-11-09', kind: 'course', status: 'planned', minutes: 30, deferred: true },
      ],
    }, NOW)
    expect(r.lines).toContain('Сегодня выбрано «У меня мало времени»: план дня собран на 20 мин; перенесено на другой день: урок курса (на 2026-11-09). Вернуть обычный план — метка [[REPLAN_NOW 0]].')
    expect(r.lines).not.toContain(REPLAN_OFF)
  })

  it('«На сегодня всё»: прежний бэкенд — нельзя, так и сказано; день остановлен — строка и как вернуть', () => {
    const task = { id: 1, date: '2026-11-07', kind: 'course', status: 'available', minutes: 30 }
    expect(gePlanToday({ state: 'ready', today: '2026-11-07', shortDay: null, tasks: [task] }, NOW).lines).toContain(STOP_OFF)
    const stopped = gePlanToday({ state: 'ready', today: '2026-11-07', shortDay: null, stopDay: { moved: 1 }, tasks: [task] }, NOW).lines
    expect(stopped).not.toContain(STOP_OFF)
    expect(stopped.join('\n')).toMatch(/закончил день кнопкой «На сегодня всё».*\[\[REPLAN_NOW 0\]\]/)
  })

  it('прежний бэкенд (плана без shortDay) — пересчитать нельзя, так и сказано', () => {
    const r = gePlanToday({ state: 'ready', today: '2026-11-07', tasks: [{ id: 1, date: '2026-11-07', kind: 'course', status: 'available', minutes: 30 }] }, NOW)
    expect(r.lines).toContain(REPLAN_OFF)
  })
})
