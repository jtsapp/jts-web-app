import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { poolFor } from '../src/practice/words/session.js'

// Раздел «Слова в картинках» (?screen=words): каталог → превью сцены → игра →
// результат. Тесты гостевые (без токена): раздел бесплатный, а прогресс живёт
// в localStorage — сеть здесь не нужна вовсе.
//
// Ожидания не захардкожены: спека читает тот же JSON, что и приложение.
// Правку контента тест переживёт, а разъехавшийся движок или разметку — нет.

const DATA = path.join(__dirname, '..', 'public', 'practice', 'words')
const meta = JSON.parse(readFileSync(path.join(DATA, 'meta.json'), 'utf8'))
const animals = JSON.parse(readFileSync(path.join(DATA, 'animals.json'), 'utf8'))

const SCENE = animals.scenes.find((s) => s.id === 'farm')
const POOL = poolFor(SCENE, animals.words)

const openCatalog = async (page) => {
  await page.goto('/?screen=words')
  // Диплинк применяется эффектом ПОСЛЕ гидратации — ждём заголовок каталога.
  await expect(page.locator('.wd-hero h1')).toHaveText('Слова в картинках', { timeout: 15000 })
}

const openScene = async (page, sceneId = 'farm') => {
  await page.goto(`/?screen=words&scene=${sceneId}`)
  await expect(page.locator('.wd-preview__text h1')).toHaveText(SCENE.name, { timeout: 15000 })
}

// Раунд проходится перебором: какое слово спрашивают, знает только звук, а
// неверный тап безвреден — он лишь трясёт спрайт.
//
// Условие выхода читается из живого DOM, а не из числа точек, снятого в
// начале: последний верный тап сам запускает переход к следующему раунду, и
// счётчик, снятый заранее, уводил помощник на лишний круг уже по чужому
// раунду.
const solveRound = async (page) => {
  for (;;) {
    if (await page.locator('.wd-result').isVisible()) return
    if (await page.locator('.wd-toast').isVisible()) return
    const on = await page.locator('.wd-dots i.on').count()
    const total = await page.locator('.wd-dots i').count()
    if (total && on >= total) return
    const sprites = page.locator('.wd-sprite:not([disabled])')
    const n = await sprites.count()
    if (!n) {
      await page.waitForTimeout(300)
      continue
    }
    for (let i = 0; i < n; i++) {
      await sprites.nth(i).click()
      if ((await page.locator('.wd-dots i.on').count()) > on) break
    }
    // Пауза показа найденного слова — 1500 мс, дальше спрашивают следующее.
    await page.waitForTimeout(1700)
  }
}

test.describe('каталог', () => {
  test('открывается диплинком и показывает секции с числом слов', async ({ page }) => {
    await openCatalog(page)
    const chips = page.locator('.wd-chip')
    await expect(chips).toHaveCount(meta.sections.length)
    for (const s of meta.sections) {
      await expect(page.locator('.wd-chip', { hasText: String(s.words) }).first()).toBeVisible()
    }
  })

  test('сцены секции показаны карточками с обложкой и счётчиком', async ({ page }) => {
    await openCatalog(page)
    const cards = page.locator('.wd-card')
    await expect(cards).toHaveCount(meta.sections[0].scenes.length)
    const farm = cards.filter({ hasText: SCENE.name })
    await expect(farm.locator('img')).toHaveAttribute('src', '/practice/words/scenes/farm/cover.webp')
    await expect(farm.locator('.wd-card__meta')).toHaveText(`${POOL.length} слов`)
  })

  test('чип переключает секцию', async ({ page }) => {
    await openCatalog(page)
    await page.locator('.wd-chip', { hasText: 'Еда' }).click()
    const food = meta.sections.find((s) => s.id === 'food')
    await expect(page.locator('.wd-card')).toHaveCount(food.scenes.length)
  })
})

test.describe('превью сцены', () => {
  test('диплинк на сцену открывает её со списком всех слов', async ({ page }) => {
    await openScene(page)
    await expect(page.locator('.wd-word')).toHaveCount(POOL.length)
    // Слово показано английским и переводом: перевод берётся из данных, а не
    // из сети — раздел работает офлайн.
    const first = POOL[0]
    const chip = page.locator('.wd-word', { hasText: first.word }).first()
    await expect(chip.locator('em')).toHaveText(first.ru)
  })

  test('переключатель языка меняет подпись на казахскую', async ({ page }) => {
    await openScene(page)
    await page.locator('.wd-lang__btn', { hasText: 'KZ' }).click()
    const first = POOL[0]
    const chip = page.locator('.wd-word', { hasText: first.word }).first()
    await expect(chip.locator('em')).toHaveText(first.kk)
  })
})

test.describe('игра', () => {
  // Экраны сцены тяжёлые: фон 1600px, до восьми спрайтов и записи раунда,
  // и всё это тянется с дев-сервера, который параллельно обслуживает второй
  // вьюпорт. В штатные 30 секунд такой тест укладывается не всегда — падал
  // не код, а нетерпение.
  test.slow()

  test('раунд начинается заданием, точками по числу слов и спрайтами на сцене', async ({ page }) => {
    await openScene(page)
    await page.locator('.wd-preview__text .wd-btn').click()
    await expect(page.locator('.wd-task__text')).toHaveText('Слушай и найди животное')
    const dots = await page.locator('.wd-dots i').count()
    expect(dots).toBeGreaterThan(0)
    // Спрайтов ровно столько же: слово без картинки на сцене спросить нельзя.
    await expect(page.locator('.wd-sprite')).toHaveCount(dots)
  })

  test('верный тап отмечает слово и показывает его с переводом', async ({ page }) => {
    await openScene(page)
    await page.locator('.wd-preview__text .wd-btn').click()
    await expect(page.locator('.wd-sprite').first()).toBeVisible()

    const sprites = page.locator('.wd-sprite:not([disabled])')
    const n = await sprites.count()
    for (let i = 0; i < n; i++) {
      await sprites.nth(i).click()
      if ((await page.locator('.wd-dots i.on').count()) > 0) break
    }
    await expect(page.locator('.wd-dots i.on')).toHaveCount(1)
    await expect(page.locator('.wd-fb--show b')).toBeVisible()
  })

  test('промах не засчитывается и подсказывает переслушать', async ({ page }) => {
    await openScene(page)
    await page.locator('.wd-preview__text .wd-btn').click()
    await expect(page.locator('.wd-sprite').first()).toBeVisible()

    // Тапаем подряд, пока не поймаем промах: хотя бы один из спрайтов раунда
    // заведомо неверный.
    const sprites = page.locator('.wd-sprite:not([disabled])')
    const n = await sprites.count()
    let missed = false
    for (let i = 0; i < n && !missed; i++) {
      await sprites.nth(i).click()
      missed = (await page.locator('.wd-hint').innerText()).length > 0
    }
    expect(missed).toBe(true)
    await expect(page.locator('.wd-dots i.on')).toHaveCount(0)
  })

  test('сцена проходится целиком и доводит до результата', async ({ page }) => {
    await openScene(page)
    await page.locator('.wd-preview__text .wd-btn').click()
    await expect(page.locator('.wd-sprite').first()).toBeVisible()

    // Раундов у сцены три; потолок с запасом — чтобы поломка движка кончалась
    // внятным падением, а не бесконечным циклом.
    for (let guard = 0; guard < 10; guard++) {
      await solveRound(page)
      if (await page.locator('.wd-result').isVisible()) break
      // Заставку между раундами не проверяем: она живёт полторы секунды, и
      // помощник, доигравший свою паузу, застаёт её то показанной, то уже
      // снятой. Ждём признак нового раунда — доступный для тапа спрайт.
      await expect(page.locator('.wd-sprite:not([disabled])').first()).toBeVisible({ timeout: 8000 })
    }

    await expect(page.locator('.wd-result__card h1')).toHaveText(`Все ${POOL.length} слов найдены!`)
    await expect(page.locator('.wd-result .wd-word')).toHaveCount(POOL.length)

    // Прогресс дошёл до каталога: карточка сцены помечена пройденной.
    await page.locator('.wd-result__btns .wd-btn--ghost').click()
    const card = page.locator('.wd-card', { hasText: SCENE.name })
    await expect(card.locator('.wd-card__done')).toHaveText('Пройдено')
  })
})

test.describe('звук', () => {
  // Экраны сцены тяжёлые: фон 1600px, до восьми спрайтов и записи раунда,
  // и всё это тянется с дев-сервера, который параллельно обслуживает второй
  // вьюпорт. В штатные 30 секунд такой тест укладывается не всегда — падал
  // не код, а нетерпение.
  test.slow()

  // Слово должно звучать РОВНО один раз на вопрос. Регрессия из первой версии:
  // хук голоса возвращал новый объект на каждый рендер, эффект озвучки видел
  // «изменившийся voice» и переозвучивал слово заново — а play() начинается со
  // stop(), поэтому запись рвалась с начала по три раза подряд и не слышалась
  // вовсе. Глазами такое не ловится: DOM при этом правильный.
  const countPlays = async (page) => {
    await page.addInitScript(() => {
      window.__played = []
      const orig = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function play(...args) {
        window.__played.push((this.currentSrc || this.src || '').split('/').pop())
        // Звука в headless нет, и отклонённый промис здесь не важен: считаем
        // попытки, а не факт воспроизведения.
        return orig.apply(this, args).catch(() => {})
      }
    })
  }

  test('слово раунда произносится один раз, а не на каждый рендер', async ({ page }) => {
    await countPlays(page)
    await openScene(page)
    await page.locator('.wd-preview__text .wd-btn').click()
    await expect(page.locator('.wd-sprite').first()).toBeVisible()
    await page.waitForTimeout(2000)

    const played = await page.evaluate(() => window.__played)
    expect(played.length).toBe(1)
    // И это запись слова, а не что-то постороннее.
    expect(played[0]).toMatch(/^[a-z-]+\.mp3$/)
  })

  test('тап по слову в превью проигрывает его запись', async ({ page }) => {
    await countPlays(page)
    await openScene(page)
    const first = POOL[0]
    await page.locator('.wd-word', { hasText: first.word }).first().click()
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => window.__played)).toEqual([`${first.id}.mp3`])
  })

  test('кнопка повтора называет то же слово, что и было', async ({ page }) => {
    await countPlays(page)
    await openScene(page)
    await page.locator('.wd-preview__text .wd-btn').click()
    await expect(page.locator('.wd-sprite').first()).toBeVisible()
    await page.waitForTimeout(1200)

    const asked = await page.evaluate(() => window.__played[0])
    await page.locator('.wd-speak').click()
    await page.waitForTimeout(400)
    const played = await page.evaluate(() => window.__played)
    expect(played).toEqual([asked, asked])
  })
})

test.describe('вход из Практики', () => {
  test('баннер раздела ведёт на его каталог', async ({ page }) => {
    await page.goto('/?screen=practice')
    const banner = page.locator('#sec-words')
    await expect(banner).toBeVisible({ timeout: 15000 })
    await banner.locator('.pp-listen__cta').click()
    await expect(page.locator('.wd-hero h1')).toHaveText('Слова в картинках')
  })
})
