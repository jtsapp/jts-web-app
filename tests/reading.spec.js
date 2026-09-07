import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { choiceItems, exTotal, gapParts } from '../src/practice/reading/engine.js'

// Раздел «Чтение» (?screen=reading): библиотека → читалка → результат.
// Тесты гостевые (без токена) — квоты гостей не касаются
// (usePracticeEntitlement), а проверка ответов целиком локальная, без сети.
//
// Ожидания не захардкожены: спека читает те же JSON, что и приложение, и берёт
// правильные ответы оттуда — тест переживёт правку контента, но упадёт, если
// разъедется движок или разметка.

const DATA = path.join(__dirname, '..', 'public', 'practice', 'reading')
const a1 = JSON.parse(readFileSync(path.join(DATA, 'a1.json'), 'utf8'))

const TEXT = a1.texts.find((x) => x.id === 'a1-sci-honey')
const TITLE = TEXT.title

const openLibrary = async (page) => {
  await page.goto('/?screen=reading')
  // Диплинк применяется эффектом после гидратации — ждём заголовок каталога.
  await expect(page.locator('.rd-hero h1')).toHaveText('Библиотека', { timeout: 15000 })
}

const openText = async (page) => {
  await openLibrary(page)
  const card = page.locator('.rd-card', { hasText: TITLE })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: /Начать чтение|Продолжить|Читать снова/ }).click()
  await expect(page.locator('.rd-texthero h1')).toHaveText(TITLE)
}

// На мобильном раскладка вкладочная — задания живут за вкладкой «Задания».
const openTasks = async (page) => {
  const tab = page.getByRole('tab', { name: /Задания/ })
  if (await tab.isVisible()) await tab.click()
}

test.describe('библиотека', () => {
  test('показывает уровень A1 и фильтрует по жанру', async ({ page }) => {
    await openLibrary(page)
    await expect(page.locator('.rd-card')).toHaveCount(a1.texts.length)

    await page.getByRole('button', { name: /Наука/ }).click()
    const science = a1.texts.filter((x) => x.genre === 'science').length
    await expect(page.locator('.rd-card')).toHaveCount(science)
    await expect(page.locator('.rd-card', { hasText: TITLE })).toBeVisible()

    await page.getByRole('button', { name: 'Все', exact: true }).click()
    await expect(page.locator('.rd-card')).toHaveCount(a1.texts.length)
  })

  test('переключение уровня подгружает свои тексты', async ({ page }) => {
    await openLibrary(page)
    await page.getByRole('button', { name: 'C1', exact: true }).click()
    const c1 = JSON.parse(readFileSync(path.join(DATA, 'c1.json'), 'utf8'))
    await expect(page.locator('.rd-card').first()).toContainText(c1.texts[0].title, { timeout: 15000 })
  })
})

test.describe('читалка', () => {
  test('показывает задание, ключевые слова и текст', async ({ page }) => {
    await openText(page)
    await expect(page.locator('.rd-task')).toContainText(TEXT.task.ru)
    await expect(page.locator('.rd-word')).toHaveCount(TEXT.words.length)
    await expect(page.locator('.rd-article p')).toHaveCount(TEXT.text.length)
  })

  test('тап по слову открывает перевод из словаря раздела', async ({ page }) => {
    await openText(page)
    // «honey» есть и в ключевых словах текста — карточка обязана показать
    // транскрипцию, а не сетевой перевод.
    await page.locator('.rd-article .rd-w', { hasText: /^honey$/i }).first().click()
    const pop = page.locator('.rd-pop')
    await expect(pop).toBeVisible()
    await expect(pop.locator('.rd-pop__en')).toHaveText(/honey/i)
    await expect(pop).toContainText('мёд')
    await page.keyboard.press('Escape')
    await expect(pop).toBeHidden()
  })

  test('панель настроек меняет типографику текста', async ({ page }) => {
    await openText(page)
    const article = page.locator('.rd-article')
    const before = await article.evaluate((el) => getComputedStyle(el).fontSize)

    await page.getByRole('button', { name: 'A+' }).click()
    await expect
      .poll(async () => article.evaluate((el) => getComputedStyle(el).fontSize))
      .not.toBe(before)

    await page.getByRole('button', { name: /Настройки чтения/ }).click()
    await page.getByRole('button', { name: 'Узкая' }).click()
    await expect
      .poll(async () => article.evaluate((el) => getComputedStyle(el).maxWidth))
      .not.toBe('none')
  })
})

test.describe('задания', () => {
  test('верные ответы в true/false дают полный балл и пишут прогресс', async ({ page }) => {
    await openText(page)
    await openTasks(page)

    const idx = TEXT.exercises.findIndex((ex) => ex.type === 'tf')
    const ex = TEXT.exercises[idx]
    const block = page.locator(`#rd-ex-${idx}`)
    const items = choiceItems(ex, { yes: 'Правда', no: 'Ложь', notGiven: 'Не сказано' })

    for (let k = 0; k < items.length; k++) {
      await block.locator('.rd-q').nth(k).locator('.rd-opt').nth(items[k].a).click()
    }
    await block.getByRole('button', { name: /Проверить/ }).click()
    await expect(block.locator('.rd-ex__res')).toContainText('Всё верно')
    await expect(block.locator('.rd-ex__best')).toContainText(`${exTotal(ex)}/${exTotal(ex)}`)

    // Прогресс уходит в localStorage — карточка каталога обязана его увидеть.
    await page.getByRole('button', { name: /← Библиотека/ }).click()
    await expect(page.locator('.rd-card', { hasText: TITLE }).locator('.rd-card__bar span')).not.toHaveText('0%')
  })

  test('«показать ответ» заполняет ответы, но не засчитывает результат', async ({ page }) => {
    await openText(page)
    await openTasks(page)

    const idx = TEXT.exercises.findIndex((ex) => ex.type === 'gap')
    const block = page.locator(`#rd-ex-${idx}`)
    await block.getByRole('button', { name: 'Показать ответ' }).click()

    await expect(block.locator('.rd-ex__res')).toContainText('Показаны правильные ответы')
    await expect(block.locator('.rd-ex__best')).toHaveCount(0)

    const { answers } = gapParts(TEXT.exercises[idx])
    await expect(block.locator('.rd-gap').first()).toHaveText(new RegExp(answers[0], 'i'))
  })

  test('пропуск заполняется тапом: сначала слово, потом пропуск', async ({ page }) => {
    await openText(page)
    await openTasks(page)

    const idx = TEXT.exercises.findIndex((ex) => ex.type === 'gap')
    const block = page.locator(`#rd-ex-${idx}`)
    const { answers } = gapParts(TEXT.exercises[idx])

    await block.locator('.rd-gap').first().click()
    await block.locator('.rd-chipw', { hasText: new RegExp('^' + answers[0] + '$', 'i') }).click()
    await expect(block.locator('.rd-gap').first()).toHaveText(answers[0])

    // Повторный тап по заполненному пропуску очищает его — иначе ошибку не
    // исправить, не начиная задание заново.
    await block.locator('.rd-gap').first().click()
    await expect(block.locator('.rd-gap').first()).toHaveText('____')
  })

  test('порядок собирается стрелками', async ({ page }) => {
    await openText(page)
    await openTasks(page)

    const idx = TEXT.exercises.findIndex((ex) => ex.type === 'order')
    const ex = TEXT.exercises[idx]
    const block = page.locator(`#rd-ex-${idx}`)
    const items = block.locator('.rd-ord__item')
    await expect(items).toHaveCount(ex.items.length)

    // Пузырьком: каждый элемент поднимаем на своё место сверху вниз.
    for (let want = 0; want < ex.items.length; want++) {
      const texts = await items.locator('.rd-ord__txt').allTextContents()
      let at = texts.indexOf(ex.items[want])
      while (at > want) {
        await items.nth(at).getByRole('button', { name: 'Выше' }).click()
        at -= 1
      }
    }
    await block.getByRole('button', { name: /Проверить/ }).click()
    await expect(block.locator('.rd-ex__res')).toContainText('Всё верно')
  })
})

test.describe('результат', () => {
  test('показывает счёт, список на повтор и ведёт обратно в библиотеку', async ({ page }) => {
    await openText(page)
    await openTasks(page)
    await page.getByRole('button', { name: /Завершить и увидеть результат/ }).click()

    await expect(page.locator('.rd-stats .rd-stat').first()).toContainText('%')
    // Ничего не решали — на повтор должны уйти все упражнения текста.
    await expect(page.locator('.rd-review li')).toHaveCount(TEXT.exercises.length)
    await expect(page.locator('.rd-words .rd-word')).toHaveCount(TEXT.words.length)

    await page.getByRole('button', { name: /В библиотеку/ }).click()
    await expect(page.locator('.rd-hero h1')).toHaveText('Библиотека')
    // «Дочитал» — метка на карточке каталога.
    await expect(page.locator('.rd-card', { hasText: TITLE }).locator('.rd-card__done')).toBeVisible()
  })
})
