// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WRITING_ARTIFACT_KEYS,
  draftsAll,
  saveDraft,
  currentDraftFor,
  lastAssessmentFor,
  newDraftId,
  snapshotDraft,
  versionsFor,
  getPlan,
  setPlan,
  getGuided,
  setGuided,
  getIdeas,
  setIdeas,
  myWords,
  addMyWord,
  removeMyWord,
  noteAnswer,
  answersFor,
  cachedTranslation,
  rememberTranslation,
} from './writingStore.js'

function draft(id, extra) {
  return { id, genreId: 'g1', genreTitle: 'Genre', levelId: 'a1', title: 'T', html: '', text: '', words: 0, checks: {}, assessment: null, ...extra }
}

describe('writingStore', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('черновики: upsert по id уводит запись в начало', () => {
    saveDraft(draft('d1'))
    saveDraft(draft('d2'))
    saveDraft(draft('d1', { title: 'Обновлён' }))
    const items = draftsAll()
    expect(items.map((d) => d.id)).toEqual(['d1', 'd2'])
    expect(items[0].title).toBe('Обновлён')
  })

  it('черновики: 61-я запись вытесняет самую старую', () => {
    for (let i = 1; i <= 61; i++) saveDraft(draft('d' + i))
    const items = draftsAll()
    expect(items).toHaveLength(60)
    expect(items[0].id).toBe('d61')
    expect(items.some((d) => d.id === 'd1')).toBe(false)
  })

  it('currentDraftFor берёт самый свежий по updatedAt, lastAssessmentFor — его оценку', () => {
    let now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    saveDraft(draft('d1', { assessment: { band: 5 } }))
    now = 2000
    saveDraft(draft('d2', { genreId: 'g2' }))
    now = 3000
    saveDraft(draft('d3'))
    expect(currentDraftFor('g1').id).toBe('d3')
    expect(lastAssessmentFor('g1')).toBeNull() // у свежего оценки нет
    expect(lastAssessmentFor('нет-такого')).toBeNull()
  })

  it('newDraftId даёт уникальные id с префиксом d', () => {
    const a = newDraftId()
    expect(a[0]).toBe('d')
    expect(a.length).toBeGreaterThan(1)
  })

  it('снимки: <30 c — склейка с последним, позже — новый, тот же текст — no-op', () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    saveDraft(draft('d1'))
    snapshotDraft('d1', 'раз')
    now = 10_000
    snapshotDraft('d1', 'раз-два') // склейка: моложе 30 секунд
    expect(versionsFor('d1')).toEqual([{ ts: 10_000, text: 'раз-два' }])
    now = 50_000
    snapshotDraft('d1', 'три') // прошло больше 30 c — отдельный снимок
    expect(versionsFor('d1').map((v) => v.text)).toEqual(['три', 'раз-два'])
    snapshotDraft('d1', 'три') // текст не менялся
    expect(versionsFor('d1')).toHaveLength(2)
  })

  it('снимки: force добавляет даже внутри окна склейки, кап — 10', () => {
    let now = 0
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    saveDraft(draft('d1'))
    snapshotDraft('d1', 'v0')
    now = 5000
    snapshotDraft('d1', 'v1', true) // явное сохранение — без склейки
    expect(versionsFor('d1')).toHaveLength(2)
    for (let i = 2; i <= 11; i++) {
      now += 31_000
      snapshotDraft('d1', 'v' + i)
    }
    const snaps = versionsFor('d1')
    expect(snaps).toHaveLength(10)
    expect(snaps[0].text).toBe('v11')
    expect(snaps.some((s) => s.text === 'v0')).toBe(false) // самый старый выпал
  })

  it('план/направляемые ответы/идеи: раздельные карты под одним ключом', () => {
    setPlan('g1', ['вступление', 'вывод'])
    setGuided('g1', { 1: 'ответ' })
    setIdeas('g1', ['идея'])
    setPlan('g2', ['другое'])
    expect(getPlan('g1')).toEqual(['вступление', 'вывод'])
    expect(getGuided('g1')).toEqual({ 1: 'ответ' })
    expect(getIdeas('g1')).toEqual(['идея'])
    expect(getPlan('g2')).toEqual(['другое'])
    expect(getPlan('g3')).toEqual([])
    expect(getGuided('g3')).toEqual({})
    expect(getIdeas('g3')).toEqual([])
  })

  it('мои слова: дедуп без учёта регистра, удаление тоже', () => {
    addMyWord('Hello')
    addMyWord('hello')
    addMyWord('  WORLD ')
    expect(myWords()).toEqual(['hello', 'world'])
    removeMyWord('HELLO')
    expect(myWords()).toEqual(['world'])
    addMyWord('') // пустое не добавляется
    expect(myWords()).toEqual(['world'])
  })

  it('журнал: один ответ на пункт n (последний выигрывает), сортировка по n', () => {
    noteAnswer('g1', 't1', { n: 2, your: 'b' })
    noteAnswer('g1', 't1', { n: 1, your: 'a' })
    noteAnswer('g1', 't1', { n: 2, your: 'b2' })
    expect(answersFor('g1', 't1')).toEqual([
      { n: 1, your: 'a' },
      { n: 2, your: 'b2' },
    ])
    expect(answersFor('g1', 'нет')).toEqual([])
  })

  it('кэш переводов: ключ в нижнем регистре, 401-я запись вытесняет первую', () => {
    rememberTranslation('Hello', 'привет', 'сәлем')
    expect(cachedTranslation('hello')).toEqual({ ru: 'привет', kk: 'сәлем' })
    expect(cachedTranslation('HELLO')).toEqual({ ru: 'привет', kk: 'сәлем' })
    for (let i = 0; i < 400; i++) rememberTranslation('w' + i, 'р' + i, 'қ' + i)
    expect(cachedTranslation('hello')).toBeNull() // самая старая выпала
    expect(cachedTranslation('w399')).toEqual({ ru: 'р399', kk: 'қ399' })
  })

  it('битый JSON под любым ключом не роняет чтение', () => {
    for (const k of WRITING_ARTIFACT_KEYS) localStorage.setItem(k, '{не json')
    expect(draftsAll()).toEqual([])
    expect(myWords()).toEqual([])
    expect(answersFor('g1', 't1')).toEqual([])
    expect(cachedTranslation('x')).toBeNull()
    expect(getPlan('g1')).toEqual([])
  })
})
