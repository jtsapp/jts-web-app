import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { bankWords, optOrder, slotCount, taskOf } from '../src/practice/workbook/engine.js'

// Воркбук A0 (?screen=workbook): каталог юнитов → экран задания → итог урока
// → разбор ошибок. Тесты гостевые (без токена): квоты гостей не касаются
// (usePracticeEntitlement), сеть нужна только за JSON уровня.
//
// Ожидания НЕ захардкожены: порядок вариантов и слов детерминирован (сид из
// данных), поэтому спека считает его тем же движком из тех же JSON. Тест
// переживает правки контента, но упадёт, если поедет сам посев.

const DATA = path.join(__dirname, '..', 'public', 'practice', 'workbook', 'a0')
const index = JSON.parse(readFileSync(path.join(DATA, 'index.json'), 'utf8'))
const lesson = (n) => JSON.parse(readFileSync(path.join(DATA, 'lesson-' + n + '.json'), 'utf8'))

const L1 = lesson(1)
// Первый экран первого урока — «соедини»: банк слов сверху, пропуски в строках.
const MATCH = L1.acts[0]
const MATCH_BANK = bankWords(MATCH)

// Куда идти за каждым типом задания: первый экран, где он встречается.
const FIRST_OF_TYPE = (() => {
  const out = {}
  for (const n of Object.keys(index.lessons).map(Number).sort((a, b) => a - b)) {
    index.lessons[n].types.forEach((t, i) => {
      if (!out[t]) out[t] = { n, i }
    })
  }
  return out
})()

// Что обязано появиться на экране каждого типа.
const MARKER = {
  choose: '.wb-opts', odd: '.wb-opts', label: '.wb-opts', respond: '.wb-sit',
  bank: '.wb-bank', match: '.wb-bank', table: '.wb-table', chat: '.wb-chat',
  order: '.wb-built', fix: '.wb-fixw', sort: '.wb-cols', type: '.wb-tin',
  drop: '.wb-dsel', memo: '.wb-memo', listen: '.wb-play', read: '.wb-src__body',
  write: '.wb-ta', speak: '.wb-recbtn',
}

const openCatalog = async (page) => {
  await page.goto('/?screen=workbook')
  // Диплинк применяется эффектом после гидратации — ждём каталог.
  await expect(page.locator('.wb-hero h1')).toContainText('A0', { timeout: 15000 })
}

/** Открыть конкретный экран урока через оглавление (☰ Урок). */
const openScreen = async (page, n, i) => {
  await openCatalog(page)
  const unit = index.units.find((u) => u.ls.includes(n) || u.rev === n)
  const head = page.locator('.wb-unit__head', { hasText: unit.title })
  // Юнит, до которого дошёл студент, каталог раскрывает сам — клик по нему
  // закрыл бы список уроков вместо того, чтобы открыть.
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
  await page.locator('.wb-lrow', { hasText: index.lessons[n].title }).first().click()
  await expect(page.locator('.wb-rail')).toBeVisible({ timeout: 15000 })
  if (i > 0) {
    await page.locator('.wb-open').click()
    await page.locator('.wb-step').nth(i).click()
  }
  await expect(page.locator('.wb-railmeta__t span')).toContainText(String(i + 1))
}

test.describe('Воркбук — каталог и экран задания', () => {
  test('каталог показывает юниты, уроки и общий прогресс', async ({ page }) => {
    await openCatalog(page)
    await expect(page.locator('.wb-unit')).toHaveCount(index.units.length)
    const screens = Object.values(index.lessons).reduce((s, l) => s + l.acts, 0)
    await expect(page.locator('.wb-hero p')).toContainText('0 / ' + screens)
    // Разбирать пока нечего — карточки ошибок нет.
    await expect(page.locator('.wb-mistakes')).toHaveCount(0)
  })

  test('верное слово встаёт в пропуск, неверное возвращается в банк', async ({ page }) => {
    await openScreen(page, 1, 0)
    await expect(page.locator('.wb-tok')).toHaveCount(MATCH_BANK.length)

    const right = MATCH.items[0].r
    await page.locator('.wb-tok', { hasText: right }).click()
    await page.locator('.wb-blank').first().click()
    await expect(page.locator('.wb-blank').first()).toHaveClass(/is-ok/)
    await expect(page.locator('.wb-tally__n')).toHaveText('1 / 8')

    // Неверное слово: остаётся в пропуске видимым, потом уходит обратно.
    const wrong = MATCH_BANK.find((w) => w !== right && w !== MATCH.items[1].r)
    await page.locator('.wb-tok', { hasText: wrong }).click()
    await page.locator('.wb-blank').nth(1).click()
    await expect(page.locator('.wb-blank').nth(1)).toHaveClass(/is-no/)
    await expect(page.locator('.wb-blank').nth(1)).toHaveText('')
    await expect(page.locator('.wb-tally__n')).toHaveText('1 / 8')
  })

  test('ответ не раскрывается сам — только кнопкой, и тогда это ошибка', async ({ page }) => {
    await openScreen(page, 1, 0)
    // До первой ошибки выхода нет: «показать» не предлагают.
    await expect(page.locator('.wb-ghost', { hasText: 'Показать ответ' })).toHaveCount(0)

    const wrong = MATCH_BANK.find((w) => w !== MATCH.items[0].r)
    await page.locator('.wb-tok', { hasText: wrong }).click()
    await page.locator('.wb-blank').first().click()
    await expect(page.locator('.wb-ghost', { hasText: 'Показать ответ' })).toBeVisible()

    await page.locator('.wb-ghost', { hasText: 'Показать ответ' }).click()
    await expect(page.locator('.wb-blank.is-rev').first()).toHaveText(MATCH.items[0].r)
    // Раскрытые пункты закрыты как ошибки, поэтому экран стал проходимым.
    await expect(page.locator('.wb-primary')).toBeEnabled()
  })

  test('порядок вариантов не меняется между перезагрузками', async ({ page }) => {
    const spot = FIRST_OF_TYPE.choose
    const act = taskOf(lesson(spot.n).acts[spot.i])
    const expected = optOrder(act, act.items[0], 0).map((k) => act.items[0].o[k])

    await openScreen(page, spot.n, spot.i)
    await expect(page.locator('.wb-opts').first().locator('.wb-opt')).toHaveText(expected)
    // Перезагрузка возвращает в каталог (диплинк адресует раздел, не экран),
    // поэтому заходим на тот же экран заново — порядок обязан совпасть.
    await openScreen(page, spot.n, spot.i)
    await expect(page.locator('.wb-opts').first().locator('.wb-opt')).toHaveText(expected)
  })
})

test.describe('Воркбук — прогресс и разбор ошибок', () => {
  test('пройденный экран и промахи переживают перезагрузку', async ({ page }) => {
    await openScreen(page, 1, 0)
    const wrong = MATCH_BANK.find((w) => w !== MATCH.items[0].r)
    await page.locator('.wb-tok', { hasText: wrong }).click()
    await page.locator('.wb-blank').first().click()
    await page.locator('.wb-ghost', { hasText: 'Показать ответ' }).click()
    await page.locator('.wb-primary', { hasText: 'Дальше' }).click()

    // Второй экран открылся, первый отмечен пройденным в полосе шагов.
    await expect(page.locator('.wb-railmeta__t span')).toContainText('2')
    await expect(page.locator('.wb-seg i').first()).toHaveClass(/is-on/)

    await openCatalog(page)
    await expect(page.locator('.wb-mistakes')).toBeVisible()
    await expect(page.locator('.wb-lrow').first()).toContainText('1 / ' + L1.acts.length)
  })

  test('промах возвращается в разборе и уходит после верного ответа', async ({ page }) => {
    await openScreen(page, 1, 0)
    // Ошибаемся ровно в одном пункте, остальные решаем верно.
    const wrong = MATCH_BANK.find((w) => w !== MATCH.items[0].r)
    await page.locator('.wb-tok', { hasText: wrong }).click()
    await page.locator('.wb-blank').first().click()
    for (let k = 0; k < MATCH.items.length; k++) {
      await page.locator('.wb-tok', { hasText: MATCH.items[k].r }).click()
      await page.locator('.wb-blank').nth(k).click()
    }
    await page.locator('.wb-primary', { hasText: 'Дальше' }).click()
    await expect(page.locator('.wb-railmeta__t span')).toContainText('2')

    await openCatalog(page)
    await page.locator('.wb-mistakes').click()
    await expect(page.locator('.wb-railmeta__t b')).toHaveText('Разбор ошибок')
    // В разборе — только промахнувшийся пункт.
    await expect(page.locator('.wb-blank')).toHaveCount(1)

    await page.locator('.wb-tok', { hasText: MATCH.items[0].r }).click()
    await page.locator('.wb-blank').first().click()
    await page.locator('.wb-primary').click()
    // Разбирать больше нечего — каталог без карточки ошибок.
    await expect(page.locator('.wb-mistakes')).toHaveCount(0)
  })
})

test.describe('Воркбук — все типы заданий рисуются', () => {
  for (const [type, marker] of Object.entries(MARKER)) {
    test('тип «' + type + '» открывается и показывает свой интерфейс', async ({ page }) => {
      const spot = FIRST_OF_TYPE[type]
      expect(spot, 'в данных A0 нет ни одного экрана типа ' + type).toBeTruthy()
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))

      await openScreen(page, spot.n, spot.i)
      await expect(page.locator(marker).first()).toBeVisible()

      // Счётчик мест сходится с движком: свободные экраны — без проверки.
      const act = lesson(spot.n).acts[spot.i]
      const total = slotCount(act)
      if (total) await expect(page.locator('.wb-tally__n')).toHaveText('0 / ' + total)
      else await expect(page.locator('.wb-tally--free')).toBeVisible()

      expect(errors, 'ошибки в консоли: ' + errors.join('; ')).toHaveLength(0)
    })
  }
})
