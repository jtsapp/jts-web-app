import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { optOrder, slotCount, transTiles } from '../src/practice/workbook/engine.js'

// Воркбуки A1–B2 (?screen=workbook&level=<код>). У A0 своя спека
// (workbook.spec.js): она проверяет общую механику раздела. Здесь — то, чем
// уровни ОТЛИЧАЮТСЯ: типы заданий, которых у A0 нет, каталог без юнит-ревью
// (A1) и с одним ревью на три юнита (B2), видео-репортаж из материалов курса.
//
// Ожидания не захардкожены: порядок вариантов и плиток считает тот же движок
// из тех же JSON, что и приложение.

const LEVELS = ['a1', 'a2', 'b1', 'b2']

const dir = (level) => path.join(__dirname, '..', 'public', 'practice', 'workbook', level)
const readIndex = (level) => JSON.parse(readFileSync(path.join(dir(level), 'index.json'), 'utf8'))
const readLesson = (level, n) =>
  JSON.parse(readFileSync(path.join(dir(level), 'lesson-' + n + '.json'), 'utf8'))

const INDEX = Object.fromEntries(LEVELS.map((l) => [l, readIndex(l)]))

/** Первый экран каждого типа на уровне. */
function firstOfType(level) {
  const index = INDEX[level]
  const out = {}
  for (const n of Object.keys(index.lessons).map(Number).sort((a, b) => a - b)) {
    index.lessons[n].types.forEach((t, i) => {
      if (!out[t]) out[t] = { n, i }
    })
  }
  return out
}

const FIRST = Object.fromEntries(LEVELS.map((l) => [l, firstOfType(l)]))

// Что обязано появиться на экране типа, которого у A0 не было.
const MARKER = {
  trans: '.wb-built',
  ttrans: '.wb-tin',
  wform: '.wb-root',
  chain: '.wb-cstep',
  worked: '.wb-worked',
  model: '.wb-parts',
  rule: '.wb-rule',
  cloze: '.wb-bank',
  epara: '.wb-epara',
  quiz: '.wb-qbar',
  video: '.wb-vid',
}

const openCatalog = async (page, level) => {
  await page.goto('/?screen=workbook&level=' + level)
  await expect(page.locator('.wb-hero h1')).toContainText(level.toUpperCase(), { timeout: 15000 })
}

/** Открыть конкретный экран урока через оглавление (☰ Урок). */
const openScreen = async (page, level, n, i) => {
  const index = INDEX[level]
  await openCatalog(page, level)
  const unit = index.units.find((u) => u.ls.includes(n) || u.rev === n)
  const head = page.locator('.wb-unit__head', { hasText: unit.title })
  // Юнит, до которого дошёл студент, каталог раскрывает сам — клик по нему
  // закрыл бы список уроков вместо того, чтобы открыть.
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
  await page.locator('.wb-lrow', { hasText: index.lessons[n].title }).first().click()
  await expect(page.locator('.wb-rail')).toBeVisible({ timeout: 15000 })
  if (i > 0) {
    await page.locator('.wb-open').click()
    await page.locator('.wb-sheet .wb-step').nth(i).click()
  }
  await expect(page.locator('.wb-railmeta__t span')).toContainText(String(i + 1))
}

test.describe('Воркбук — каталоги уровней', () => {
  for (const level of LEVELS) {
    test(level.toUpperCase() + ': каталог показывает все юниты и экраны', async ({ page }) => {
      const index = INDEX[level]
      await openCatalog(page, level)
      await expect(page.locator('.wb-unit')).toHaveCount(index.units.length)
      const screens = Object.values(index.lessons).reduce((s, l) => s + l.acts, 0)
      await expect(page.locator('.wb-hero p')).toContainText('0 / ' + screens)
    })
  }

  test('A1: юнит-ревью нет — все строки с номерами', async ({ page }) => {
    await openCatalog(page, 'a1')
    const rows = page.locator('.wb-unit').first().locator('.wb-lrow')
    await expect(rows).toHaveCount(INDEX.a1.units[0].ls.length)
    await expect(page.locator('.wb-lrow__n--star')).toHaveCount(0)
  })

  test('B2: зачёт стоит у каждого третьего юнита и помечен звёздочкой', async ({ page }) => {
    const index = INDEX.b2
    await openCatalog(page, 'b2')
    // Первый юнит — без зачёта, третий — с ним: это структура уровня, а не
    // случайность данных.
    expect(index.units[0].rev).toBe(null)
    expect(index.units[2].rev).toBe(201)
    const head = page.locator('.wb-unit__head', { hasText: index.units[2].title })
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
    const rows = page.locator('.wb-unit').nth(2).locator('.wb-lrow')
    await expect(rows).toHaveCount(index.units[2].ls.length + 1)
    await expect(rows.last().locator('.wb-lrow__n')).toHaveText('★')
  })
})

test.describe('Воркбук — новые типы заданий рисуются', () => {
  for (const level of LEVELS) {
    for (const [type, marker] of Object.entries(MARKER)) {
      const spot = FIRST[level][type]
      if (!spot) continue
      test(level.toUpperCase() + ': «' + type + '» открывается и показывает свой интерфейс', async ({ page }) => {
        const errors = []
        page.on('pageerror', (e) => errors.push(String(e)))

        await openScreen(page, level, spot.n, spot.i)
        await expect(page.locator(marker).first()).toBeVisible()

        // Счётчик мест сходится с движком: у обёрток считается вложенное
        // задание, у цепочки — шаги, а не пункты.
        const act = readLesson(level, spot.n).acts[spot.i]
        const total = slotCount(act)
        if (total) await expect(page.locator('.wb-tally__n')).toHaveText('0 / ' + total)
        else await expect(page.locator('.wb-tally--free')).toBeVisible()

        expect(errors, 'ошибки в консоли: ' + errors.join('; ')).toHaveLength(0)
      })
    }
  }
})

test.describe('Воркбук — новые типы работают', () => {
  test('A1: переделанное предложение собирается плитками', async ({ page }) => {
    const spot = FIRST.a1.trans
    const act = readLesson('a1', spot.n).acts[spot.i]
    const tiles = transTiles(act, 0)
    await openScreen(page, 'a1', spot.n, spot.i)

    const line = page.locator('.wb-built').first()
    // Собираем первое предложение: тайлы кликаются в порядке эталона.
    for (const word of act.items[0].a.split(' ')) {
      const k = tiles.indexOf(word)
      expect(k, 'слова «' + word + '» нет в лотке').toBeGreaterThan(-1)
      await page.locator('.wb-item').first().locator('.wb-tiles .wb-tok').nth(k).click()
    }
    await expect(line).toHaveClass(/is-ok/)
    await expect(page.locator('.wb-tally__n')).toHaveText('1 / ' + act.items.length)
  })

  test('B1: переписанное предложение засчитывается по ключу', async ({ page }) => {
    const spot = FIRST.b1.ttrans
    const act = readLesson('b1', spot.n).acts[spot.i]
    await openScreen(page, 'b1', spot.n, spot.i)

    const input = page.locator('.wb-tin').first()
    await input.fill(act.items[0].a)
    await input.press('Enter')
    await expect(input).toHaveClass(/is-ok/)
    await expect(page.locator('.wb-tally__n')).toHaveText('1 / ' + act.items.length)
  })

  test('B2: в тесте урока вопросы идут по одному', async ({ page }) => {
    const spot = FIRST.b2.quiz
    const act = readLesson('b2', spot.n).acts[spot.i]
    await openScreen(page, 'b2', spot.n, spot.i)

    await expect(page.locator('.wb-qbar b')).toContainText('1')
    await expect(page.locator('.wb-opt')).toHaveCount(act.items[0].o.length)

    const order = optOrder(act, act.items[0], 0)
    await page.locator('.wb-opt').nth(order.indexOf(act.items[0].a)).click()
    await expect(page.locator('.wb-opt.is-ok')).toBeVisible()
    await page.locator('.wb-ghost', { hasText: 'Дальше' }).click()
    await expect(page.locator('.wb-qbar b')).toContainText('2')
  })

  test('B2: найденная ошибка в абзаце показывает правку', async ({ page }) => {
    const spot = FIRST.b2.epara
    const act = readLesson('b2', spot.n).acts[spot.i]
    await openScreen(page, 'b2', spot.n, spot.i)

    // Слова-кнопки идут в том же порядке, что и в данных, но знаки препинания
    // кнопками не становятся — считаем индекс по тому же правилу.
    const buttons = act.words.filter((w) => !/^[.,;:!?]$/.test(w))
    const bad = act.bad[0]
    const at = buttons.indexOf(act.words[bad.i])
    await page.locator('.wb-ew').nth(at).click()
    await expect(page.locator('.wb-ew.is-ok').first()).toBeVisible()
    await expect(page.locator('.wb-epfix').first()).toHaveText(bad.fix)
    await expect(page.locator('.wb-tally__n')).toHaveText('1 / ' + act.bad.length)
  })

  test('B2: видео-репортаж юнита играется файлом курса', async ({ page }) => {
    const spot = FIRST.b2.video
    const unit = INDEX.b2.lessons[spot.n].unit
    await openScreen(page, 'b2', spot.n, spot.i)
    const src = await page.locator('.wb-vid__pl source').getAttribute('src')
    expect(src).toBe('/course/b2/video/v' + unit + '.mp4')
    // Файл обязан существовать: иначе экран молча покажет заглушку.
    const head = await page.request.head(src)
    expect(head.status(), 'ролика нет: ' + src).toBeLessThan(400)
  })
})

test.describe('Воркбук — зачёт юнита', () => {
  // Зачёт B2 (урок 201) — семь экранов выбора: проходим его целиком верными
  // ответами и смотрим отметку. Это единственный экран раздела, где есть балл,
  // и единственный, который можно пересдать.
  test('B2: пройденный зачёт показывает отметку и пересдаётся', async ({ page }) => {
    test.slow()
    const lesson = readLesson('b2', 201)
    let total = 0

    await openScreen(page, 'b2', 201, 0)
    for (let i = 0; i < lesson.acts.length; i += 1) {
      const act = lesson.acts[i]
      total += act.items.length
      for (let k = 0; k < act.items.length; k += 1) {
        const order = optOrder(act, act.items[k], k)
        await page.locator('.wb-opts').nth(k).locator('.wb-opt').nth(order.indexOf(act.items[k].a)).click()
      }
      await expect(page.locator('.wb-tally__done')).toBeVisible()
      await page.locator('.wb-primary').click()
    }

    await expect(page.locator('.wb-testscore')).toHaveClass(/is-pass/)
    await expect(page.locator('.wb-testscore__n')).toHaveText(total + ' / ' + total)

    // Пересдача стирает попытку: снова первый экран, счётчик пустой.
    await page.locator('.wb-ghost', { hasText: 'Пройти заново' }).click()
    await expect(page.locator('.wb-railmeta__t span')).toContainText('1')
    await expect(page.locator('.wb-tally__n')).toHaveText('0 / ' + lesson.acts[0].items.length)
    await expect(page.locator('.wb-seg i.is-on')).toHaveCount(0)
  })
})
