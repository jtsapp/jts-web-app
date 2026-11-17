import { describe, expect, it } from 'vitest'
import {
  ROW_LIMIT, defaultOpen, ieltsSection, needsTracksCard, openCount, orderTracks, satSection, totalCount, visibleRows,
} from './todayTracks.js'

const TODAY = '2026-11-17'

describe('«Задачи на сегодня» по направлениям', () => {
  it('направления — в порядке карточки задачи: IELTS, General English, SAT; лишнее и повторы отброшены', () => {
    expect(orderTracks(['sat', 'ge', 'ielts'])).toEqual(['ielts', 'ge', 'sat'])
    expect(orderTracks(['ge', 'ge', 'toefl'])).toEqual(['ge'])
    expect(orderTracks(null)).toEqual([])
  })

  it('один общий курс — прежнее «Сегодня»; два направления или одно не General English — карточка по направлениям', () => {
    expect(needsTracksCard(['ge'])).toBe(false)
    expect(needsTracksCard([])).toBe(false)
    expect(needsTracksCard(['ielts'])).toBe(true)
    expect(needsTracksCard(['sat'])).toBe(true)
    expect(needsTracksCard(['ge', 'ielts'])).toBe(true)
  })

  it('счётчик — невыполненные задачи без необязательных; данные в пути — null, а не ноль', () => {
    expect(openCount([{ done: false }, { done: true }, { done: false, optional: true }])).toBe(1)
    expect(openCount([])).toBe(0)
    expect(openCount(null)).toBeNull()
    expect(openCount([{ status: 'completed' }, { status: 'available' }], (x) => x.status === 'completed')).toBe(1)
  })

  it('общий счётчик шапки — сумма известных направлений', () => {
    expect(totalCount([5, 3])).toBe(8)
    expect(totalCount([5, null])).toBe(5)
    expect(totalCount([null, null])).toBeNull()
    expect(totalCount([0, 0])).toBe(0)
  })

  it('раскрыта первая секция, где есть что делать; всё сделано — первая по порядку', () => {
    expect(defaultOpen([{ key: 'ielts', count: 0 }, { key: 'ge', count: 3 }])).toBe('ge')
    expect(defaultOpen([{ key: 'ielts', count: 5 }, { key: 'ge', count: 3 }])).toBe('ielts')
    expect(defaultOpen([{ key: 'ielts', count: 0 }, { key: 'ge', count: 0 }])).toBe('ielts')
    // IELTS ещё в пути — раскрыт он (с «Загружаем…»): придут задачи — раскрытие не прыгнет на соседнюю секцию
    expect(defaultOpen([{ key: 'ielts', count: null }, { key: 'ge', count: 2 }])).toBe('ielts')
    expect(defaultOpen([])).toBeNull()
  })

  it('до «+ ещё N» видно три строки: сначала невыполненные, порядок прежний', () => {
    const rows = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, done: i < 2 }))
    const { shown, hidden } = visibleRows(rows)
    expect(shown.map((x) => x.id)).toEqual(['c', 'd', 'e'])
    expect(hidden).toBe(2)
    expect(ROW_LIMIT).toBe(3)
    // открытых меньше трёх — добираем выполненными, порядок как пришёл
    const few = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, done: i !== 3 }))
    expect(visibleRows(few).shown.map((x) => x.id)).toEqual(['a', 'b', 'd'])
    expect(visibleRows(rows, { expanded: true })).toEqual({ shown: rows, hidden: 0 })
    expect(visibleRows(rows.slice(0, 3)).hidden).toBe(0)
  })

  describe('IELTS', () => {
    it('до анкеты и до доступа — шаг старта, а не пустой список', () => {
      expect(ieltsSection({ me: { onboarded: false } }).rows).toEqual([{ id: 'ielts-start', step: 'onboarding' }])
      expect(ieltsSection({ me: { onboarded: true, access: false } }).rows).toEqual([{ id: 'ielts-diagnostic', step: 'diagnostic' }])
      expect(ieltsSection(null)).toBeNull()
    })

    it('программа не назначена — причина бэкенда, а не «всё сделано»', () => {
      const s = ieltsSection({ me: { onboarded: true, access: true }, programme: { enrollment: { status: 'programme_pending', pendingReason: 'no_goal' } } })
      expect(s).toEqual({ rows: [], note: 'ieltsPlan.pending.no_goal' })
      expect(ieltsSection({ me: { onboarded: true }, programme: null }).note).toBe('ieltsPlan.pending.no_diagnostic')
      expect(ieltsSection({ me: { onboarded: true }, failed: true }).note).toBe('home.tracks.failed')
    })

    it('задачи программы дня — строками; выполненные отмечены', () => {
      const programme = {
        enrollment: { status: 'active' },
        tasks: [
          { id: 11, sec: 'reading', kind: 'type', status: 'completed' },
          { id: 12, sec: 'writing', kind: 't2', status: 'available' },
        ],
      }
      const s = ieltsSection({ me: { onboarded: true, access: true }, programme })
      expect(s.rows.map((r) => [r.id, r.done])).toEqual([['ielts-11', true], ['ielts-12', false]])
      expect(openCount(s.rows)).toBe(1)
      expect(ieltsSection({ me: { onboarded: true }, programme: { enrollment: { status: 'active' }, tasks: [] } }).note).toBe('ieltsPlan.allDone')
    })
  })

  describe('SAT', () => {
    const lesson = { number: 4, startsAt: `${TODAY}T19:00:00+05:00`, section: 'RW', status: 'PLANNED' }
    const roadmap = (kind) => ({ roadmap: { active: 2, phases: [{ n: 2, kind }] }, selfPrep: { openErrors: 12, weakDomains: ['rw.info'], bankLeft: 0, bluebookLeft: [6, 8] } })

    it('до доступа от менеджера — один шаг старта', () => {
      expect(satSection({ me: { access: false } }).rows).toEqual([{ id: 'sat-start', key: 'start' }])
      expect(satSection(null)).toBeNull()
    })

    it('обычный день — три задания вкладки «Сегодня»; слабый навык в счёт не идёт', () => {
      const s = satSection({
        me: { access: true },
        roadmap: roadmap('group'),
        schedule: { lessons: [lesson] },
        tasks: { practiceToday: 10, openErrors: 0, weakSkill: 'rw.words' },
        words: 'none',
        todayIso: TODAY,
      })
      expect(s.rows.map((r) => [r.key, r.done, !!r.optional])).toEqual([['words', false, false], ['practice', true, false], ['weak', false, true]])
      expect(openCount(s.rows)).toBe(1)
    })

    it('ошибки ждут разбора — третье задание с их числом', () => {
      const s = satSection({ me: { access: true }, roadmap: roadmap('group'), schedule: { lessons: [lesson] }, tasks: { practiceToday: 3, openErrors: 4, reviewedToday: 1 }, words: 'done', todayIso: TODAY })
      expect(s.rows.map((r) => r.key)).toEqual(['words', 'practice', 'errors'])
      expect(s.rows[1]).toMatchObject({ started: true, progress: { d: 3, n: 10 } })
      expect(s.rows[2]).toMatchObject({ n: 4, started: true, done: false })
      expect(openCount(s.rows)).toBe(2)
    })

    it('фаза самоподготовки — её список дел, пустые строки не рисуются', () => {
      const s = satSection({ me: { access: true }, roadmap: roadmap('self'), todayIso: TODAY })
      expect(s.rows.map((r) => [r.key, r.n])).toEqual([['selfErrors', 12], ['selfWeak', 1], ['selfBluebook', 2]])
      const empty = satSection({ me: { access: true }, roadmap: { ...roadmap('self'), selfPrep: {} }, todayIso: TODAY })
      expect(empty).toEqual({ rows: [], note: 'sat.self7.empty' })
    })

    it('задания дня не загрузились — подпись сбоя, а не «всё сделано»', () => {
      expect(satSection({ me: { access: true }, roadmap: roadmap('group'), failed: true, todayIso: TODAY })).toEqual({ rows: [], note: 'home.tracks.failed' })
    })
  })
})
