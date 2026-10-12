// Инварианты данных «Чисел» (public/practice/numbers/data.json). Красный тест
// здесь — брак контента в прототипе data/jtsnumbers.html: задание, где верный
// остров совпадает с ложным, раздел без объяснения, ссылка на несуществующий
// источник.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAX_ROUNDS, SECTION_ID, spokenOf, withGeneratedTours } from './logic.js'

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/practice/numbers/data.json'), 'utf8'))
const tours = withGeneratedTours(data.sections, data.tours)
const allItems = Object.entries(tours).flatMap(([id, groups]) => groups.flatMap((g, k) => [...(g.own || []), ...g.items].map((it) => ({ where: `${id}[${k}]`, it }))))

describe('данные «Чисел»', () => {
  it('у каждого раздела есть раунды и объяснение, источники объяснений существуют', () => {
    for (const s of data.sections) {
      expect(tours[s.id]?.length, s.id).toBeGreaterThan(0)
      const L = data.lessons[s.id]
      expect(L?.lead?.en, s.id).toBeTruthy()
      for (const k of L.src) expect(data.sources[k], `${s.id}: ${k}`).toBeTruthy()
      for (const c of L.check) expect(c.opts, `${s.id}: ${c.a}`).toContain(c.a)
    }
  })

  it('верный остров не совпадает с ложными, ложные различны, ничего не пусто', () => {
    const bad = allItems.filter(({ it }) => {
      const [say, a, d1, d2] = it
      return !say || !a || !d1 || !d2 || a === d1 || a === d2 || d1 === d2
    })
    expect(bad.map((b) => `${b.where}: ${JSON.stringify(b.it.slice(0, 4))}`)).toEqual([])
  })

  it('у задания на чтение есть подсказка и подпись; произносимое не пусто', () => {
    for (const { where, it } of allItems) {
      if (it[5] === 'R') expect(it[6] && it[7], where).toBeTruthy()
      expect(spokenOf(it).trim(), where).toBeTruthy()
    }
  })

  it('id разделов и число раундов укладываются в рамки прогресса — иначе он терялся бы на записи', () => {
    for (const s of data.sections) {
      expect(s.id, s.id).toMatch(SECTION_ID)
      expect(tours[s.id].length, s.id).toBeLessThanOrEqual(MAX_ROUNDS)
    }
  })

  it('боссы и Lab — только звук во всех раундах', () => {
    for (const s of data.sections.filter((x) => x.boss || x.lab)) {
      for (const g of tours[s.id]) expect(g.hear, s.id).toBe('listen')
    }
  })
})
