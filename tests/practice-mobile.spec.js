import { test, expect } from '@playwright/test'

// Мобильная адаптация Практики (вьюпорт 390×844, см. playwright.config.js):
//   — страница не шире экрана, чипсы-фильтры одной строкой с прокруткой;
//   — Словарь уходит ПОД ленты (раньше order: -1 ставил его первым);
//   — баннер «Аудирование» складывается в колонку: CTA на всю ширину,
//     печать уровня в нижней строке и не перекрывает текст;
//   — рилсы переключаются вертикальным тач-свайпом;
//   — кнопки в списке слов дотягивают до тач-размера.
// Данные и авторизация замоканы — как в practice-vocab.spec.js.

const CLIPS = [
  { id: 1, title: 'Reel A', mediaUrl: '/practice/reel-a.mp4', thumbnailUrl: '', views: 100 },
  { id: 2, title: 'Reel B', mediaUrl: '/practice/reel-b.mp4', thumbnailUrl: '', views: 200 },
]
const WORDS = [
  { id: 1, word: 'window', translation: 'окно', learned: false },
  { id: 2, word: 'green', translation: 'зелёный', learned: false },
]
const BOOKS = [
  { id: 1, title: 'Alice in Wonderland', author: 'Lewis Carroll', level: 'A2', coverImageUrl: '' },
]

async function mockPracticeApi(page) {
  const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/api/auth/me', (route) =>
    route.fulfill(
      json({
        user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel: 'A2' },
      }),
    ),
  )
  await page.route('**/mobile/media-clips', (route) => route.fulfill(json(CLIPS)))
  await page.route('**/mobile/situativki*', (route) => route.fulfill(json([])))
  await page.route('**/mobile/audio-lessons', (route) => route.fulfill(json(BOOKS)))
  await page.route('**/mobile/saved-words', (route) => route.fulfill(json(WORDS)))
  await page.route('**/mobile/balance/info', (route) => route.fulfill(json({ coins: 0, streak: 0 })))
}

async function openPractice(page) {
  await mockPracticeApi(page)
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
  await page.goto('/?screen=practice')
  await expect(page.locator('.pp')).toBeVisible({ timeout: 15000 })
}

test.describe('Практика — мобильная адаптация', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  test('страница не шире экрана; чипсы — одна строка с прокруткой', async ({ page }) => {
    await openPractice(page)

    // Нет горизонтального скролла всей страницы.
    const overflow = await page.evaluate(
      () => document.scrollingElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    // Чипсы не переносятся (высота одной строки), а прокручиваются.
    const chips = page.locator('.pp-chips')
    const box = await chips.boundingBox()
    expect(box.height).toBeLessThan(60)
    const scrollable = await chips.evaluate((el) => el.scrollWidth > el.clientWidth)
    expect(scrollable).toBeTruthy()
  })

  test('Словарь идёт после лент контента, кнопки слов — тач-размера', async ({ page }) => {
    await openPractice(page)

    const banner = await page.locator('.pp-listen__card').boundingBox()
    const side = await page.locator('.pp__side').boundingBox()
    expect(side.y).toBeGreaterThan(banner.y + banner.height)

    await expect(page.locator('.pp-word')).toHaveCount(2, { timeout: 10000 })
    const say = await page.locator('.pp-word__say').first().boundingBox()
    expect(say.height).toBeGreaterThanOrEqual(36)
  })

  test('баннер аудирования: CTA на всю ширину, печать уровня ниже текста', async ({ page }) => {
    await openPractice(page)

    const card = await page.locator('.pp-listen__card').boundingBox()
    const cta = await page.locator('.pp-listen__cta').boundingBox()
    const aside = await page.locator('.pp-listen__aside').boundingBox()

    // CTA растянута почти на всю карточку (карточка минус паддинги).
    expect(cta.width).toBeGreaterThan(card.width * 0.8)
    // Строка с печатью уровня — под кнопкой, а не поверх текста.
    expect(aside.y).toBeGreaterThan(cta.y + cta.height)
    await expect(page.locator('.pp-listen__level')).toHaveText('A2')
  })

  test('рилсы: полноэкранная TikTok-лента со snap-скроллом, без стрелок', async ({ page }) => {
    await openPractice(page)
    await page.locator('.pp-mcard').first().click()

    // Ждём конца входной анимации (scr-in двигает .rl по Y) — иначе замер
    // геометрии попадает в середину transform-а.
    await page.locator('.rl').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))

    // Полноэкранный оверлей: лента накрывает весь вьюпорт (поверх оболочки).
    const vp = page.viewportSize()
    const rl = await page.locator('.rl').boundingBox()
    expect(rl.x).toBe(0)
    expect(rl.y).toBe(0)
    expect(Math.round(rl.width)).toBe(vp.width)
    expect(Math.round(rl.height)).toBe(vp.height)

    // Стрелок вверх/вниз на телефоне нет.
    await expect(page.locator('.rl__nav')).toBeHidden()

    // Лента — нативный скролл со snap, каждый ролик занимает полный кадр.
    const feed = page.locator('.rl__feed')
    const snap = await feed.evaluate((el) => getComputedStyle(el).scrollSnapType)
    expect(snap).toContain('y')
    expect(snap).toContain('mandatory')
    await expect(page.locator('.rl__item')).toHaveCount(CLIPS.length)
    const item = await page.locator('.rl__item').first().boundingBox()
    expect(Math.round(item.height)).toBe(vp.height)
    await expect(page.locator('.rl__item').first().locator('.rl__video')).toHaveAttribute(
      'src',
      CLIPS[0].mediaUrl,
    )

    // Активный ролик ведёт IntersectionObserver: прокрутили ленту на кадр —
    // активен второй, вернулись — снова первый.
    const active = page.locator('.rl__item[data-active]')
    await expect(active).toHaveAttribute('data-idx', '0')
    await feed.evaluate((el) => el.scrollTo(0, el.clientHeight))
    await expect(active).toHaveAttribute('data-idx', '1')
    await feed.evaluate((el) => el.scrollTo(0, 0))
    await expect(active).toHaveAttribute('data-idx', '0')

    // «Назад» плавает поверх ленты и закрывает просмотр.
    await page.locator('.vd__back').click()
    await expect(page.locator('.rl')).toHaveCount(0)
  })
})

test.describe('Практика — десктоп не пострадал', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 760, 'только широкий вьюпорт')

  test('Словарь — правая колонка рядом с контентом', async ({ page }) => {
    await openPractice(page)

    const center = await page.locator('.pp__center').boundingBox()
    const side = await page.locator('.pp__side').boundingBox()
    // Колонки стоят рядом: словарь правее контента и на той же высоте.
    expect(side.x).toBeGreaterThan(center.x + center.width - 10)
    expect(Math.abs(side.y - center.y)).toBeLessThan(120)
  })

  test('рилсы: кнопки вверх/вниз остались и листают ленту', async ({ page }) => {
    await openPractice(page)
    await page.locator('.pp-mcard').first().click()

    // На десктопе лента в кадре 9:16 (не оверлей), стрелки видны.
    await expect(page.locator('.rl__nav')).toBeVisible()
    const active = page.locator('.rl__item[data-active]')
    await expect(active).toHaveAttribute('data-idx', '0')
    await expect(page.locator('.rl__navbtn').first()).toBeDisabled() // вверх некуда

    // «Вниз» плавно домётывает ленту до следующего ролика (scroll-snap).
    await page.locator('.rl__navbtn').nth(1).click()
    await expect(active).toHaveAttribute('data-idx', '1')
    await expect(page.locator('.rl__navbtn').nth(1)).toBeDisabled() // роликов два
    await page.locator('.rl__navbtn').first().click()
    await expect(active).toHaveAttribute('data-idx', '0')
  })
})
