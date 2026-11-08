// «Сегодня» по ТЗ v2.0, 5.2: минуты дня, плитки навыков, когда блок сам открывается «По навыкам», строка «Зачем».
import { describe, it, expect } from 'vitest'
import { defaultTodayView, doneMinutes, groupBySkill, skillOf, todayMinutes, whyLine } from './todaySkills.js'

const course = (over = {}) => ({ id: 1, kind: 'course', module: null, minutes: 30, got: 0, status: 'available', ...over })
const prac = (module, over = {}) => ({ id: module, kind: 'practice', module, minutes: 15, got: 0, status: 'available', ...over })

// t как у словаря: ключ и переменные строкой — видно, какой шаблон и с чем выбран
const t = (key, vars) => (vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(',')})` : key)

describe('skillOf — раздел плана → навык плитки', () => {
  it('урок курса, разговор, шэдоуинг, воркбук, медиа, словарь', () => {
    expect(skillOf(course())).toBe('lesson')
    expect(skillOf(prac('ai_tutor'))).toBe('speaking')
    expect(skillOf(prac('shadowing'))).toBe('speaking')
    expect(skillOf(prac('workbooks'))).toBe('grammar')
    expect(skillOf(prac('media_practice'))).toBe('reading')
    expect(skillOf(prac('vocabulary_sr'))).toBe('vocab')
  })
  it('неизвестный раздел — «Чтение»; занятие, домашка и задача преподавателя — без навыка', () => {
    expect(skillOf(prac('new_module'))).toBe('reading')
    expect(skillOf({ kind: 'live' })).toBeNull()
    expect(skillOf({ kind: 'homework' })).toBeNull()
    expect(skillOf(prac('ai_tutor', { origin: 'teacher' }))).toBeNull()
  })
})

describe('минуты дня', () => {
  it('выполненная — целиком, начатая практика — набранное, но не больше нормы', () => {
    expect(doneMinutes(course({ status: 'completed' }))).toBe(30)
    expect(doneMinutes(prac('ai_tutor', { status: 'in_progress', got: 6 }))).toBe(6)
    expect(doneMinutes(prac('ai_tutor', { status: 'in_progress', got: 40 }))).toBe(15)
    expect(doneMinutes(course({ status: 'in_progress', got: 10 }))).toBe(0)
  })
  it('«21 из 60 мин» и доля для полосы', () => {
    const day = [course(), prac('ai_tutor', { status: 'in_progress', got: 6 }), prac('vocabulary_sr', { status: 'completed', got: 15 })]
    expect(todayMinutes(day)).toEqual({ done: 21, total: 60, percent: 35 })
    expect(todayMinutes([])).toEqual({ done: 0, total: 0, percent: 0 })
  })
})

describe('groupBySkill — плитки «По навыкам»', () => {
  it('порядок ТЗ, только навыки с задачами, минуты и число выполненных', () => {
    const day = [
      prac('vocabulary_sr', { id: 'v' }),
      prac('ai_tutor', { id: 'a', status: 'completed' }),
      course(),
      prac('shadowing', { id: 's', minutes: 10 }),
    ]
    const tiles = groupBySkill(day)
    expect(tiles.map((g) => g.skill)).toEqual(['lesson', 'speaking', 'vocab'])
    const speaking = tiles.find((g) => g.skill === 'speaking')
    expect(speaking.tasks.map((x) => x.id)).toEqual(['a', 's'])
    expect(speaking.minutes).toBe(25)
    expect(speaking.done).toBe(1)
  })
})

describe('defaultTodayView', () => {
  it('больше пяти задач — «По навыкам», пять и меньше — по порядку', () => {
    expect(defaultTodayView(Array.from({ length: 5 }, (_, i) => prac('ai_tutor', { id: i })))).toBe('order')
    expect(defaultTodayView(Array.from({ length: 6 }, (_, i) => prac('ai_tutor', { id: i })))).toBe('skills')
    expect(defaultTodayView([])).toBe('order')
  })
})

describe('whyLine — «Зачем» из данных', () => {
  it('урок курса: следующий урок уровня и хвост цели, если цель выше уровня', () => {
    expect(whyLine(t, course(), { level: 'A2', target: 'B2' })).toBe('gePlan.why.course(level=A2)gePlan.why.goal(target=B2).')
    expect(whyLine(t, course(), { level: 'B2', target: 'B2' })).toBe('gePlan.why.course(level=B2).')
    expect(whyLine(t, course(), { level: 'A2' })).toBe('gePlan.why.course(level=A2).')
  })
  it('навык задачи — самый слабый: довод данными, без хвоста цели', () => {
    const weakest = { skill: 'speaking', percent: 41 }
    expect(whyLine(t, prac('shadowing'), { level: 'A2', target: 'B2', weakest })).toBe(
      'gePlan.why.weak(skill=gePlan.skill.speaking,pct=41).',
    )
    // слабый навык другой — обычный довод раздела
    expect(whyLine(t, prac('vocabulary_sr'), { level: 'A2', weakest })).toBe('gePlan.why.vocabulary_sr(level=A2).')
  })
  it('урок курса не бывает «слабым навыком»; без уровня шаблоны с уровнем молчат', () => {
    expect(whyLine(t, course(), { level: 'A2', weakest: { skill: 'speaking', percent: 10 } })).toBe('gePlan.why.course(level=A2).')
    expect(whyLine(t, prac('workbooks'), {})).toBe('')
    expect(whyLine(t, prac('ai_tutor'), {})).toBe('gePlan.why.ai_tutor(level=).')
    expect(whyLine(t, { kind: 'homework' }, { level: 'A2' })).toBe('')
  })
})

describe('фокус плана — «Стоит подтянуть» (кейс 20)', () => {
  const focus = { skill: 'listening', module: 'media_practice' }
  it('задача раздела в фокусе — плитка слабого навыка; остальные — как были', () => {
    expect(skillOf(prac('media_practice'), focus)).toBe('listening')
    expect(skillOf(prac('vocabulary_sr'), focus)).toBe('vocab')
    expect(skillOf(prac('workbooks'), { skill: 'writing', module: 'workbooks' })).toBe('writing')
    expect(groupBySkill([prac('media_practice'), prac('ai_tutor')], focus).map((g) => g.skill)).toEqual(['listening', 'speaking'])
  })
  it('«Зачем» у задачи в фокусе — про слабый навык и план недели, сильнее довода раздела', () => {
    expect(whyLine(t, prac('media_practice'), { level: 'A2', target: 'B2', focus })).toBe('gePlan.why.focus(skill=gePlan.skill.listening).')
    expect(whyLine(t, prac('vocabulary_sr'), { level: 'A2', focus })).toBe('gePlan.why.vocabulary_sr(level=A2).')
  })
})
