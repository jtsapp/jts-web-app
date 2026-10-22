import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, OPTIONS } from './route.js'

// Каталог отдаётся панели преподавателя — там его единственный потребитель.
describe('GET /api/practice/catalog', () => {
  // Каталог спрашивает у бэкенда счётчики Аудирования. В тестах сети нет:
  // по умолчанию бэкенд «молчит», и раздел строится с диска, как раньше.
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Аудирование: счётчики уровней с бэкенда, когда пакет залит', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (!/\/practice-content\/listening\//.test(String(url))) throw new Error('offline')
      expect(String(url)).toMatch(/\/practice-content\/listening\/levels$/)
      return { ok: true, json: async () => [{ level: 'a1', count: 3 }, { level: 'b2', count: 0 }] }
    }))
    const body = await (await GET()).json()
    const listening = body.areas.find((a) => a.key === 'listening')
    expect(listening.levels.map((l) => l.code)).toEqual(['a1'])
    expect(listening.levels[0].units[0]).toMatchObject({ key: 'a1', section: '3 заданий' })
  })

  it('отдаёт уровни со списком юнитов', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    const grammar = body.areas.find((a) => a.key === 'grammar')
    expect(grammar).toBeTruthy()
    expect(grammar.levels.map((l) => l.code)).toEqual(['a0', 'a1', 'a2', 'b1', 'b2', 'c1'])

    const a1 = grammar.levels.find((l) => l.code === 'a1')
    expect(a1.units.length).toBeGreaterThan(0)
    expect(a1.units[0]).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      section: expect.any(String),
    })
  })

  /**
   * Ярлык темы не говорит, что ученик будет делать: «Present simple negative» —
   * это название правила. Описание у юнита в данных есть с самого начала, и
   * пока каталог его выбрасывал, преподаватель выбирал вслепую.
   */
  it('у юнитов грамматики есть описание, и оно без разметки', async () => {
    const body = await (await GET()).json()
    const grammar = body.areas.find((a) => a.key === 'grammar')
    const units = grammar.levels.flatMap((l) => l.units)

    const withDesc = units.filter((u) => u.desc)
    expect(withDesc.length).toBeGreaterThan(units.length / 2)
    expect(withDesc.some((u) => u.desc.includes('<'))).toBe(false)
  })

  // Названия в каталоге размечены (<em>…</em>) — в списке выбора нужен голый текст.
  it('в названиях юнитов нет разметки', async () => {
    const body = await (await GET()).json()
    const titles = body.areas.flatMap((a) => a.levels.flatMap((l) => l.units.map((u) => u.title)))
    expect(titles.some((t) => t.includes('<'))).toBe(false)
  })

  // Преподаватель просил задавать не только грамматику: заданий в остальных
  // разделах кабинета больше, чем в самих уроках.
  it('отдаёт все разделы «Практики», а не одну грамматику', async () => {
    const body = await (await GET()).json()

    expect(body.areas.map((a) => a.key).sort()).toEqual(
      ['grammar', 'listening', 'reading', 'shadowing', 'situations', 'workbooks', 'writing']
    )
    body.areas.forEach((area) => {
      expect(area.title).toBeTruthy()
      expect(area.levels.length).toBeGreaterThan(0)
    })
  })

  /* Адрес обязателен у КАЖДОГО юнита: без него задание указывает в пустоту, и
     ученик увидит строку, которую нечем открыть. Нумерация есть только в
     грамматике — в остальных разделах адрес строковый. */
  it('у каждого юнита есть адрес: номер или ключ', async () => {
    const body = await (await GET()).json()

    body.areas.forEach((area) => {
      area.levels.forEach((level) => {
        expect(level.units.length).toBeGreaterThan(0)
        level.units.forEach((unit) => {
          const addressed = typeof unit.id === 'number' || (typeof unit.key === 'string' && unit.key.length > 0)
          expect(addressed).toBe(true)
        })
      })
    })
  })

  // Тексты «Чтения» заводят в админке: когда пакет на стенде залит, каталог
  // обязан показывать то, что видит ученик, а не файлы релиза.
  it('«Чтение»: тексты с бэкенда, когда пакет залит', async () => {
    const replies = {
      levels: [{ level: 'a1', count: 1 }, { level: 'b1', count: 0 }],
      a1: [{ id: 'a1-sci-honey-k3f9q', level: 'A1', genre: 'science', title: 'New <i>honey</i>' }],
    }
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const m = String(url).match(/\/practice-content\/reading\/(\w+)$/)
      if (!m || !replies[m[1]]) throw new Error('offline')
      return { ok: true, json: async () => replies[m[1]] }
    }))
    const body = await (await GET()).json()
    const reading = body.areas.find((a) => a.key === 'reading')
    expect(reading.levels.map((l) => l.code)).toEqual(['a1'])
    expect(reading.levels[0].units).toEqual([
      { key: 'a1-sci-honey-k3f9q', title: 'New honey', section: 'science', minutes: null, difficulty: null },
    ])
  })

  it('«Чтение»: уровень с бэкенда не ответил — весь раздел с диска, без смеси', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (/\/practice-content\/reading\/levels$/.test(String(url))) {
        return { ok: true, json: async () => [{ level: 'a1', count: 1 }, { level: 'a2', count: 1 }] }
      }
      if (/\/practice-content\/reading\/a1$/.test(String(url))) {
        return { ok: true, json: async () => [{ id: 'a1-remote-x', level: 'A1', genre: 'science', title: 'R' }] }
      }
      return { ok: false, status: 502, json: async () => ({}) }
    }))
    const body = await (await GET()).json()
    const reading = body.areas.find((a) => a.key === 'reading')
    expect(reading.levels.map((l) => l.code)).toEqual(['a1', 'a2', 'b1', 'b2', 'c1'])
    expect(reading.levels[0].units.some((u) => u.key === 'a1-remote-x')).toBe(false)
    expect(reading.levels[0].units[0].key).toBe('a1-sci-honey')
  })

  it('«Чтение» адресует текст его id, а не номером', async () => {
    const body = await (await GET()).json()
    const a1 = body.areas.find((a) => a.key === 'reading').levels.find((l) => l.code === 'a1')

    expect(a1.units[0].key).toMatch(/^a1-/)
    expect(a1.units[0].id).toBeUndefined()
  })

  it('«Письмо» адресует жанр, шэдоуинг — урок', async () => {
    const body = await (await GET()).json()
    const writing = body.areas.find((a) => a.key === 'writing')
    const shadowing = body.areas.find((a) => a.key === 'shadowing')

    expect(writing.levels.find((l) => l.code === 'a1').units[0].key).toBe('a1-form')
    // Уровней у шэдоуинга нет — уроки лежат одним списком, уровень служебный.
    expect(shadowing.levels.map((l) => l.code)).toEqual(['all'])
    expect(shadowing.levels[0].units.some((u) => u.key === 'sg')).toBe(true)
  })

  /* Аудирование, воркбуки и разговорная практика выдаются уровнем целиком:
     мельче ученику всё равно не открыть, а обещать в домашней работе адрес,
     по которому нельзя перейти, хуже, чем задать уровень. */
  it('уровневые разделы отдают один юнит на уровень с ключом-уровнем', async () => {
    const body = await (await GET()).json()

    for (const key of ['listening', 'workbooks', 'situations']) {
      const area = body.areas.find((a) => a.key === key)
      area.levels.forEach((level) => {
        expect(level.units.length).toBe(1)
        expect(level.units[0].key).toBe(level.code)
      })
    }
  })

  // Запрос идёт с домена админки — без этих заголовков браузер его отклонит.
  it('отвечает с заголовками CORS', async () => {
    const res = await GET()
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(OPTIONS().status).toBe(204)
  })
})
