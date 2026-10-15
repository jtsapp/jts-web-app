import { describe, it, expect, vi } from 'vitest'
import fixture from './__fixtures__/envelope-b1.json'
import { envelopeSummary, levelFromEnvelope, validateEnvelope, MAX_ENVELOPE_BYTES } from './envelope.js'
import { geProfileBody, purposeFromGoals } from './geMapping.js'
import { navForActivity, navForSection } from './activityRoutes.js'
import { bandFor, pickTopic, topicById, TOPICS } from './speakingTopics.js'
import { reportView } from './reportModel.js'
import { installBridge, readEnvelope } from './bridge.js'
import { isExistingStudent } from './existingStudent.js'

// Фикстура — настоящий конверт, снятый с самого теста v16 (симулятор ученика B1 + анкета «путешествовать без
// переводчика»): форма не придумана, а та, что придёт в приложение.
const env = () => JSON.parse(JSON.stringify(fixture))

describe('envelope', () => {
  it('настоящий конверт v16 проходит проверку', () => {
    expect(validateEnvelope(env())).toEqual({ ok: true, envelope: expect.any(Object) })
    expect(envelopeSummary(env())).toEqual({ attemptId: 'jts_fixture_b1_travel', overall: 'B1', status: 'partial', target: 'B1' })
  })

  it('чужая форма, битый id и неизвестный уровень — отказ', () => {
    expect(validateEnvelope(null).ok).toBe(false)
    expect(validateEnvelope({ ...env(), schemaVersion: 2 }).error).toBe('schema_version')
    expect(validateEnvelope({ ...env(), source: 'x' }).error).toBe('source')
    const bad = env()
    bad.assessment.attemptId = '../../etc'
    expect(validateEnvelope(bad).error).toBe('attempt_id')
    const lvl = env()
    lvl.assessment.overallCEFR = 'Z9'
    expect(validateEnvelope(lvl).error).toBe('overall_cefr')
    expect(validateEnvelope('{').error).toBe('bad_json')
  })

  it('раздутый конверт не принимаем', () => {
    const big = env()
    big.goals.personalExpectations = 'x'.repeat(MAX_ENVELOPE_BYTES)
    expect(validateEnvelope(big).error).toBe('too_large')
  })

  it('уровень аккаунта — только когда пройдены грамматика и чтение', () => {
    expect(levelFromEnvelope(env())).toBe('B1')
    const onlyLu = env()
    onlyLu.assessment.skillResults.R.level = null
    expect(levelFromEnvelope(onlyLu)).toBe(null)
    // аудирование можно пропустить из-за звука — уровень всё равно ставим
    const noL = env()
    noL.assessment.skillResults.L.level = null
    expect(levelFromEnvelope(noL)).toBe('B1')
    const none = env()
    none.assessment.overallCEFR = null
    expect(levelFromEnvelope(none)).toBe(null)
  })
})

describe('geMapping', () => {
  it('категория цели → «зачем» нашей анкеты', () => {
    expect(purposeFromGoals({ primaryGoal: 'career_promotion', selectedSubcategories: [{ id: 'career_promotion', categoryId: 'career' }] })).toBe('work')
    expect(purposeFromGoals({ selectedCategories: ['education'] })).toBe('study')
    expect(purposeFromGoals({ selectedCategories: ['entertainment'] })).toBe('self')
    expect(purposeFromGoals({})).toBe('self')
  })

  it('цель v16 «уже достигнута» → следующая плитка выше уровня', () => {
    // v16 даёт B1 ученику B1 с целью поездок; наша плитка обязана быть выше уровня
    expect(geProfileBody(env(), 'B1')).toEqual({
      purpose: 'travel',
      targetLevel: 'B2',
      deadlineDate: null,
      deadlineWindow: '3-6m',
      dailyMinutes: 30,
      startMode: null,
    })
  })

  it('цель v16 выше уровня берётся как есть; тарифный уровень важнее тестового', () => {
    expect(geProfileBody(env(), 'A2').targetLevel).toBe('B1')
  })

  it('C1 — цель ставить некуда', () => {
    expect(geProfileBody(env(), 'C1')).toBe(null)
  })

  it('неизвестные срок и время — без срока и по умолчанию', () => {
    const e = env()
    e.goals.targetDeadline = { optionId: 'unsure', customText: '' }
    e.preferences.availableStudyTime = 'other'
    const body = geProfileBody(e, 'A2')
    expect(body.deadlineWindow).toBe('none')
    expect(body.dailyMinutes).toBe(30)
  })
})

describe('activityRoutes', () => {
  it('задание ведёт в свой раздел, чтение — на полку уровня', () => {
    expect(navForActivity({ navigation: { identifier: 'reading' }, practiceLevel: 'B1' })).toEqual({ key: 'reading', payload: { level: 'b1' } })
    expect(navForActivity({ navigation: { identifier: 'speakspin' } })).toEqual({ key: 'speakspin', payload: undefined })
    expect(navForActivity({ navigation: { identifier: 'practice' } })).toEqual({ key: 'practice', payload: undefined })
    expect(navForActivity({ navigation: { identifier: 'whatever' } }).key).toBe('practice')
    expect(navForActivity({ navigation: { identifier: 'reading' }, practiceLevel: 'A0' }).payload).toBe(undefined)
  })

  it('разделы экрана итога', () => {
    expect(navForSection('tutor').key).toBe('tutor')
    expect(navForSection('shadowing').key).toBe('practice')
  })
})

describe('speakingTopics', () => {
  it('полоса темы — медиана намеренных уровней, A0 — к A1', () => {
    expect(bandFor(['A0', 'A0', 'A1'])).toBe('A1')
    expect(bandFor(['B1', 'B2', 'A2'])).toBe('B1')
    expect(bandFor(['C1', 'C1', 'B2'])).toBe('C1')
    expect(bandFor([null, undefined])).toBe('A2')
  })

  it('у каждой полосы есть темы, тема находится по id', () => {
    for (const band of ['A1', 'A2', 'B1', 'B2', 'C1']) expect(pickTopic([band], 0).band).toBe(band)
    expect(pickTopic(['B2'], 0.99).id).not.toBe(pickTopic(['B2'], 0).id)
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length)
    expect(topicById('b1-trip').band).toBe('B1')
    expect(topicById('nope')).toBe(null)
  })
})

describe('reportModel', () => {
  it('отчёт по настоящему конверту', () => {
    const v = reportView({ ...env(), host: { goalLabel: { ru: 'Путешествовать без переводчика' }, savedAt: '2026-10-14T10:00:00.000Z' } }, 'ru')
    expect(v.overall).toBe('B1')
    expect(v.partial).toBe(true)
    expect(v.skills.map((s) => s.id)).toEqual(['LU', 'R', 'L', 'S'])
    expect(v.skills[0]).toMatchObject({ level: 'B1', assessed: true, total: 12, correct: 9, percent: 75 })
    expect(v.skills[3]).toMatchObject({ id: 'S', assessed: false, level: null })
    expect(v.goal).toBe('Путешествовать без переводчика')
    expect(v.activities.length).toBeGreaterThan(0)
    expect(v.activities[0].nav).toEqual({ key: 'reading', payload: { level: 'b1' } })
    expect(v.completedAt).toBe('2026-10-14T10:00:00.000Z')
  })

  it('без конверта — нечего рисовать', () => {
    expect(reportView(null)).toBe(null)
  })
})

describe('existingStudent', () => {
  it('аккаунт старше выкатки — «уже учится», новый и без даты — новый', () => {
    // бэкенд отдаёт LocalDateTime без зоны — время сервера
    expect(isExistingStudent('2026-09-01T12:00:00')).toBe(true)
    expect(isExistingStudent('2026-10-14T23:59:59')).toBe(true)
    expect(isExistingStudent('2026-10-15T00:00:01')).toBe(false)
    expect(isExistingStudent('2026-10-14T20:00:00Z')).toBe(false) // 01:00 15.10 по Алматы
    expect(isExistingStudent(null)).toBe(false)
    expect(isExistingStudent('мусор')).toBe(false)
  })
})

describe('bridge', () => {
  function fakeWin() {
    return {
      JTSPersonalizedResults: { getPayload: () => env() },
      JTSStudentGoals: {
        getConfiguration: () => ({ categories: [{ id: 'travel', goals: [{ id: 'travel_independent', label: { ru: 'Путешествовать', kk: 'Саяхат', en: 'Travel' } }] }] }),
      },
    }
  }

  it('конверт несёт название цели и время сохранения', () => {
    const e = readEnvelope(fakeWin(), () => new Date('2026-10-14T10:00:00Z'))
    expect(e.host).toEqual({ goalLabel: { ru: 'Путешествовать', kk: 'Саяхат', en: 'Travel' }, savedAt: '2026-10-14T10:00:00.000Z' })
  })

  it('крючки теста зовут обработчики приложения и подтверждают только сделанное', async () => {
    vi.useFakeTimers()
    const win = fakeWin()
    const h = { onResult: vi.fn(), onContinue: vi.fn(async () => {}), onActivity: vi.fn(async () => {}), onSection: vi.fn(), startSpeaking: vi.fn(async () => ({ status: 'completed' })) }
    const off = installBridge(win, h)

    win.JTSPlacementConfig.onComplete({})
    await vi.runAllTimersAsync()
    expect(h.onResult).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: 1 }))

    expect(await win.JTSPlacementConfig.openLearning({})).toEqual({ accepted: true, persisted: true, navigated: true })
    expect(h.onContinue).toHaveBeenCalled()
    expect(await win.JTSPlacementConfig.openPracticeActivity({ id: 'x' })).toEqual({ navigated: true })
    win.JTSPlacementConfig.navigate({ section: 'tutor' })
    expect(h.onSection).toHaveBeenCalledWith('tutor', expect.any(Object))
    expect(await win.JTSSpeakingBuddy.start({ placementSessionId: 'a' })).toEqual({ status: 'completed' })

    off()
    expect(win.JTSSpeakingBuddy).toBe(undefined)
    vi.useRealTimers()
  })
})
