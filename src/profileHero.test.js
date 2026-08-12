import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Шапка Профиля: код и файлы арта должны сходиться.
//
// Экран уже разъезжался с ассетами молча. Во-первых, арт лежал в PNG по
// 1.7–2.3 МБ на полосу высотой 190px — на 4G шапка приезжала последней, и это
// была одна из жалоб клиента. Во-вторых, `a0.png` не существовало вовсе, а код
// его всё равно просил: каждый заход в Профиль на первом уровне давал
// неуспешный запрос, и никто этого не замечал, потому что экран
// самодостаточен и без арта.
//
// Тест читает исходник как текст, а не рендерит экран: предмет проверки —
// договор между списком уровней в коде и содержимым папки.

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'screens/ProfilePage.jsx'), 'utf8')
const dir = join(here, '../public/assets/world/hero')
const files = readdirSync(dir)

/** Уровни из HERO_LEVELS в ProfilePage.jsx. */
function heroLevels() {
  const block = src.match(/const HERO_LEVELS = new Set\(\[([^\]]*)\]\)/)
  expect(block, 'в ProfilePage.jsx нет HERO_LEVELS').not.toBe(null)
  return block[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
}

describe('шапка Профиля — код и арт сходятся', () => {
  it('арт запрашивается в webp', () => {
    expect(src).toMatch(/\/assets\/world\/hero\/\$\{key\}\.webp/)
    expect(src).not.toMatch(/\/assets\/world\/hero\/[^`'"]*\.png/)
  })

  it('у каждого уровня из HERO_LEVELS есть файл', () => {
    for (const level of heroLevels()) expect(files, `нет арта для ${level}`).toContain(`${level}.webp`)
  })

  it('лишнего арта в папке нет — иначе уровень попросит файл, которого код не знает', () => {
    const known = new Set(heroLevels().map((l) => `${l}.webp`))
    for (const f of files) expect(known, `${f} лежит в папке, но не указан в HERO_LEVELS`).toContain(f)
  })

  it('ни один файл шапки не тяжелее 400 КБ', () => {
    for (const f of files) {
      const kb = Math.round(statSync(join(dir, f)).size / 1024)
      expect(kb, `${f} весит ${kb} КБ — полоса 190px столько не стоит`).toBeLessThanOrEqual(400)
    }
  })
})
