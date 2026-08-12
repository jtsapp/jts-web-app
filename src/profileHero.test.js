import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HERO_LEVELS } from './kingdoms.js'

// Шапка Профиля: код и файлы арта должны сходиться.
//
// Экран уже разъезжался с ассетами молча. Во-первых, арт лежал в PNG по
// 1.7–2.3 МБ на полосу высотой 190px — на 4G шапка приезжала последней, и это
// была одна из жалоб клиента. Во-вторых, `a0.png` не существовало вовсе, а код
// его всё равно просил: каждый заход в Профиль на первом уровне давал
// неуспешный запрос, и никто этого не замечал, потому что экран
// самодостаточен и без арта.
//
// HERO_LEVELS импортируется из kingdoms.js, а не выковыривается регуляркой из
// исходника: тест не должен ломаться от того, что список стали считать иначе.

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '../public/assets/world/hero')
const files = readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile())

describe('шапка Профиля — код и арт сходятся', () => {
  it('файлы в папке ровно те, что перечислены в HERO_LEVELS', () => {
    expect(new Set(files)).toEqual(new Set([...HERO_LEVELS].map((l) => `${l}.webp`)))
  })

  it('экран просит webp, а не png', () => {
    const src = readFileSync(join(here, 'screens/ProfilePage.jsx'), 'utf8')
    expect(src).toMatch(/\/assets\/world\/hero\/\$\{key\}\.webp/)
  })

  it('ни один файл шапки не тяжелее 400 КБ', () => {
    for (const f of files) {
      const kb = Math.round(statSync(join(dir, f)).size / 1024)
      expect(kb, `${f} весит ${kb} КБ — полоса 190px столько не стоит`).toBeLessThanOrEqual(400)
    }
  })
})
