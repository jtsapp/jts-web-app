import { describe, it, expect } from 'vitest'
import { GET, OPTIONS } from './route.js'

// Каталог отдаётся панели преподавателя — там его единственный потребитель.
describe('GET /api/practice/catalog', () => {
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
