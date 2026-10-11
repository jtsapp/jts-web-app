import { describe, it, expect } from 'vitest'
import {
  goalOptions,
  levelSummary,
  levelTrack,
  nextLevel,
  rankSkills,
  sanitizeGoal,
  skillHighlights,
  skillPercent,
  weeklyDelta,
} from './levelProgress.js'

describe('skillPercent', () => {
  it('без заданий — ноль, а не 100%', () => {
    expect(skillPercent()).toBe(0)
    expect(skillPercent({ done: 0, firstTry: 0 })).toBe(0)
  })

  // Одно верное задание — не «100% владения»: процент придерживается объёмом,
  // ровно как полоски рейтинга в профиле.
  it('маленький объём зажимает процент', () => {
    expect(skillPercent({ done: 1, firstTry: 1 })).toBe(4)
    expect(skillPercent({ done: 25, firstTry: 25 })).toBe(100)
  })

  it('точность влияет линейно', () => {
    expect(skillPercent({ done: 25, firstTry: 20 })).toBe(80)
  })
})

describe('rankSkills', () => {
  it('сортирует от сильного к слабому', () => {
    const ranked = rankSkills({
      speaking: { done: 25, firstTry: 21 },
      writing: { done: 25, firstTry: 10 },
    })
    expect(ranked[0]).toEqual({ skill: 'speaking', percent: 84 })
    expect(ranked[ranked.length - 1].percent).toBe(0)
  })
})

describe('skillHighlights', () => {
  it('у новичка без заданий нет ни сильной, ни слабой стороны', () => {
    expect(skillHighlights(rankSkills({}))).toEqual({ strongest: null, weakest: null })
  })

  it('сильнейший — первый в рейтинге, слабейший — последний', () => {
    const ranked = rankSkills({
      grammar: { done: 50, firstTry: 45 },
      listening: { done: 30, firstTry: 9 },
    })
    const { strongest, weakest } = skillHighlights(ranked)
    expect(strongest.skill).toBe('grammar')
    // Слабейший — не «любой нулевой», а последний в рейтинге: среди ещё не
    // тренированных навыков ничья по нулю решается порядком SKILLS, и vocab в нём
    // последний. «Главная» показывает именно его.
    expect(weakest).toEqual({ skill: 'vocab', percent: 0 })
  })

  it('слабейшего нет, если все навыки равны', () => {
    const ranked = ['listening', 'speaking', 'reading', 'writing', 'grammar', 'vocab']
      .map((skill) => ({ skill, percent: 40 }))
    expect(skillHighlights(ranked)).toEqual({ strongest: ranked[0], weakest: null })
  })

  it('не рейтинг (null) и пустой рейтинг — ни сильной, ни слабой стороны', () => {
    expect(skillHighlights(null)).toEqual({ strongest: null, weakest: null })
    expect(skillHighlights([])).toEqual({ strongest: null, weakest: null })
  })
})

describe('nextLevel', () => {
  it('следующая ступень CEFR', () => {
    expect(nextLevel('B1')).toBe('B2')
    expect(nextLevel('b1')).toBe('B2')
  })
  it('на потолке следующей нет', () => {
    expect(nextLevel('C2')).toBe(null)
  })
  it('после A0 идёт A1, а не A2', () => {
    expect(nextLevel('A0')).toBe('A1')
  })
  it('неизвестный уровень не роняет карточку', () => {
    expect(nextLevel(undefined)).toBe('A2')
  })
})

describe('levelSummary', () => {
  it('уровень карточки — из профиля, A0 остаётся A0', () => {
    const s = levelSummary('A0', null, { level: 'A0', next: 'A1', percent: 20, done: 10, total: 50, remaining: 40 })
    expect(s.level).toBe('A0')
    expect(s.next).toBe('A1')
  })
  it('пока сервер молчит, A0 ведёт к A1', () => {
    const s = levelSummary('A0', null)
    expect(s.level).toBe('A0')
    expect(s.next).toBe('A1')
  })
  const SKILLED = {
    listening: { done: 25, firstTry: 25 },
    speaking: { done: 25, firstTry: 25 },
    reading: { done: 25, firstTry: 25 },
    writing: { done: 25, firstTry: 25 },
    grammar: { done: 25, firstTry: 25 },
    vocab: { done: 25, firstTry: 25 },
  }

  it('процент и остаток — из освоенных материалов, а не из навыков', () => {
    const s = levelSummary('B1', SKILLED, { level: 'B1', next: 'B2', percent: 40, done: 12, total: 30, remaining: 18 })

    // Навыки безупречны, но уровень пройден на 40%: это разные величины, и
    // карточка обязана показывать вторую — «сколько пройдено», а не «как точно».
    expect(s.percent).toBe(40)
    expect(s.done).toBe(12)
    expect(s.total).toBe(30)
    expect(s.remaining).toBe(18)
    expect(s.next).toBe('B2')
  })

  it('без ответа сервера процента нет вовсе', () => {
    const s = levelSummary('B1', SKILLED)

    // Не ноль: ноль означал бы «ничего не пройдено», а мы просто ещё не знаем.
    // Подставить сюда правдоподобное число хуже, чем не показать ничего.
    expect(s.percent).toBe(null)
    expect(s.remaining).toBe(null)
  })

  it('у новичка нет ни сильной, ни слабой стороны', () => {
    const s = levelSummary('A1', null, { level: 'A1', next: 'A2', percent: 0, done: 0, total: 40, remaining: 40 })
    expect(s.percent).toBe(0)
    expect(s.strongest).toBe(null)
    expect(s.weakest).toBe(null)
    expect(s.remaining).toBe(40)
  })

  it('с заданиями сильная и слабая сторона берутся из рейтинга навыков', () => {
    const s = levelSummary('A1', {
      grammar: { done: 50, firstTry: 45 },
      listening: { done: 30, firstTry: 9 },
    })

    expect(s.strongest).toEqual({ skill: 'grammar', percent: 90 })
    expect(s.weakest).toEqual({ skill: 'vocab', percent: 0 })
  })

  it('на C2 следующего уровня нет', () => {
    expect(levelSummary('C2', null).next).toBe(null)
  })

  it('профиль важнее курса: админ поставил A2 после теста A1 — на карточке A2', () => {
    const s = levelSummary('A2', null, { level: 'A1', next: 'A2', percent: 10, done: 1, total: 10, remaining: 9 })
    expect(s.level).toBe('A2')
    expect(s.next).toBe('A2')
  })

  it('пустой профиль — берём уровень теста/прогресса, а не молчим A1 зря', () => {
    const s = levelSummary(null, null, { level: 'A2', next: 'B1', percent: 5, done: 1, total: 20, remaining: 19 })
    expect(s.level).toBe('A2')
  })

  it('купленный курс выше своего не переписывает CEFR на карточке', () => {
    // Ученик A1 купил A2 — полоса и цель считаются по курсу, подпись — профиль.
    const s = levelSummary('A1', null, { level: 'A2', next: 'B1', percent: 20, done: 4, total: 20, remaining: 16 })

    expect(s.level).toBe('A1')
    expect(s.next).toBe('B1')
  })

  it('сервер сказал «выше некуда» — своего мнения о потолке у карточки нет', () => {
    const s = levelSummary('B2', null, { level: 'C2', next: null, percent: 10, done: 1, total: 10, remaining: 9 })

    expect(s.next).toBe(null)
  })
})

describe('sanitizeGoal', () => {
  it('принимает цель выше точки отсчёта, регистр не важен', () => {
    expect(sanitizeGoal({ target: 'b2', from: 'a0' })).toEqual({ target: 'B2', from: 'A0' })
  })
  it('цель не выше старта, мусор и пустое — null', () => {
    expect(sanitizeGoal({ target: 'A1', from: 'A2' })).toBe(null)
    expect(sanitizeGoal({ target: 'B1', from: 'B1' })).toBe(null)
    expect(sanitizeGoal({ target: 'Z9', from: 'A1' })).toBe(null)
    expect(sanitizeGoal(null)).toBe(null)
    expect(sanitizeGoal('B2')).toBe(null)
  })
})

describe('goalOptions', () => {
  it('от ближайшей ступени до C2', () => {
    expect(goalOptions({ level: 'A0', next: 'A1' })).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  })
  it('профиль выше курса — начинаем после профиля', () => {
    // Менеджер поставил A2, а курс считается по A1 (next A2): цель A2 уже в профиле.
    expect(goalOptions({ level: 'A2', next: 'A2' })).toEqual(['B1', 'B2', 'C1', 'C2'])
  })
  it('на потолке выбирать нечего', () => {
    expect(goalOptions({ level: 'C2', next: null })).toEqual([])
  })
})

describe('levelTrack', () => {
  const A0 = { level: 'A0', next: 'A1' }

  it('A0 с целью B2: A1, A2, B1 и Финиш · B2', () => {
    expect(levelTrack(A0, { target: 'B2', from: 'A0' })).toEqual({
      mode: 'goal', stops: ['A1', 'A2', 'B1'], finish: 'B2', goal: 'B2', short: true,
    })
  })

  it('цель — ближайший уровень: сразу финиш', () => {
    expect(levelTrack(A0, { target: 'A1', from: 'A0' })).toMatchObject({ mode: 'goal', stops: [], finish: 'A1' })
  })

  it('две ступени помещаются полными подписями', () => {
    expect(levelTrack({ level: 'A1', next: 'A2' }, { target: 'B2', from: 'A1' }).short).toBe(false)
  })

  it('без цели — как раньше: ближайший уровень и следующий', () => {
    expect(levelTrack({ level: 'A1', next: 'A2' }, null)).toEqual({
      mode: 'default', stops: ['A2', 'B1'], finish: null, goal: 'A2', short: false,
    })
  })

  it('на C2 ступеней нет, а не «Уровень A2»', () => {
    expect(levelTrack({ level: 'C2', next: null }, null).stops).toEqual([])
  })

  it('профиль дорос до цели — дорожка от старта цели, вся пройдена', () => {
    expect(levelTrack({ level: 'B2', next: 'C1' }, { target: 'B2', from: 'A1' })).toEqual({
      mode: 'reached', stops: ['A2', 'B1'], finish: 'B2', goal: 'B2', short: false,
    })
  })

  it('цель позади курса, но не достигнута профилем — откат к обычной дорожке', () => {
    // Профиль A1, купленный курс B1 (next B2), цель A2 осталась от старых времён.
    expect(levelTrack({ level: 'A1', next: 'B2' }, { target: 'A2', from: 'A0' }).mode).toBe('default')
  })
})

describe('weeklyDelta', () => {
  it('без снимка прироста ещё нет', () => {
    expect(weeklyDelta(40, null)).toBe(null)
  })
  it('разница со снимком', () => {
    expect(weeklyDelta(46, { percent: 40, at: 0 }, 1000)).toBe(6)
  })
})
