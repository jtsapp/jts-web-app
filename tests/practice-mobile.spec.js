import { test, expect } from '@playwright/test'
import { mockGates } from './helpers/login.js'

// Мобильная адаптация Практики (вьюпорт 390×844, см. playwright.config.js):
//   — страница не шире экрана, вкладки навыков на узком планшете — лентой в строку с прокруткой вбок;
//   — переключатель уровня во всю ширину, выбран уровень ученика;
//   — карточки тренажёров на телефоне — в две колонки (редизайн 29.10.2026, баннеров и лент в обзоре нет);
//   — рилсы переключаются вертикальным тач-свайпом.
// Данные и авторизация замоканы.

const CLIPS = [
  { id: 1, title: 'Reel A', mediaUrl: '/practice/reel-a.mp4', thumbnailUrl: '', views: 100 },
  { id: 2, title: 'Reel B', mediaUrl: '/practice/reel-b.mp4', thumbnailUrl: '', views: 200 },
]
const BOOKS = [
  { id: 1, title: 'Alice in Wonderland', author: 'Lewis Carroll', level: 'A2', coverImageUrl: '' },
]

async function mockPracticeApi(page) {
  const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  // Замки develop с 29.10.2026 (документы платформы, разделы тарифа) — иначе вместо Практики их экран.
  await mockGates(page)
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
  await page.route('**/mobile/balance/info', (route) => route.fulfill(json({ coins: 0, streak: 0 })))
}

async function openPractice(page) {
  await mockPracticeApi(page)
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
  await page.goto('/?screen=practice')
  await expect(page.locator('.pk')).toBeVisible({ timeout: 15000 })
}

test.describe('Практика — мобильная адаптация', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  test('страница не шире экрана; навыки на узком планшете — лентой в строку', async ({ page }) => {
    await openPractice(page)

    // Нет горизонтального скролла всей страницы.
    const overflow = () => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
    expect(await overflow()).toBeLessThanOrEqual(1)

    // С редизайна 29.10.2026 сетки 2×2 у вкладок нет: на ширине меньше 1200px все пять идут одной лентой
    // с прокруткой вбок (styles.css), на телефоне — тоже строкой (src/mobile/practice.css). Листается лента,
    // а не страница.
    await page.setViewportSize({ width: 640, height: 900 })
    const cards = page.locator('.pk-skill')
    await expect(cards).toHaveCount(5)
    const boxes = await Promise.all([0, 1, 2, 3, 4].map((i) => cards.nth(i).boundingBox()))
    for (const b of boxes) expect(Math.abs(b.y - boxes[0].y)).toBeLessThan(1)
    const scrollable = await page.locator('.pk-skills').evaluate((el) => el.scrollWidth > el.clientWidth)
    expect(scrollable).toBeTruthy()
    expect(await overflow()).toBeLessThanOrEqual(1)
  })

  test('переключатель уровня во всю ширину, выбран уровень ученика', async ({ page }) => {
    await openPractice(page)
    const vp = page.viewportSize()
    const box = await page.locator('.pk-levels').boundingBox()
    expect(box.width).toBeGreaterThan(vp.width - 34)
    await expect(page.locator('.pk-levels__btn[aria-checked="true"]')).toHaveText('A2')
  })

  // Баннеров и лент в обзоре с редизайна 29.10.2026 нет: тренажёры — карточки сеткой в две колонки.
  test('карточки тренажёров — в две колонки', async ({ page }) => {
    await openPractice(page)
    const [a, b, c] = await Promise.all(
      ['#sec-listenchoose', '#sec-listen', '#sec-cartoons'].map((sel) => page.locator(sel).boundingBox()),
    )
    expect(Math.abs(a.y - b.y)).toBeLessThan(1)
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.width)
    expect(c.y).toBeGreaterThanOrEqual(a.y + a.height)
    expect(Math.abs(c.x - a.x)).toBeLessThan(1)
  })

  test('рилсы: полноэкранная TikTok-лента со snap-скроллом, без стрелок', async ({ page }) => {
    await openPractice(page)
    // Ролики — в списке раздела: карточка «Мемы и рилсы» в обзоре — вход в каталог.
    await page.locator('#sec-memes').click()
    await page.locator('.pk-meme').first().click()

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

test.describe('Письмо — мобильная адаптация', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  // Раздел гостевой (без токена и моков): каталог, тренажёр и Блокнот живут
  // на статических JSON из public/practice/writing.
  const noOverflow = async (page) => {
    const overflow = await page.evaluate(
      () => document.scrollingElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  }

  const openWriting = async (page) => {
    await page.goto('/?screen=writing')
    await expect(page.locator('.wr-hero h1')).toHaveText(
      'Учимся писать по-английски — по шагам',
      { timeout: 15000 },
    )
  }

  test('каталог уровней не шире экрана', async ({ page }) => {
    await openWriting(page)
    await expect(page.locator('.wr-lvcard')).toHaveCount(6)
    await noOverflow(page)
  })

  test('шаг 4 тренажёра (6 упражнений) не шире экрана', async ({ page }) => {
    await openWriting(page)
    await page.locator('.wr-lvcard').first().click()
    await expect(page.locator('.wr-gncard')).toHaveCount(30, { timeout: 15000 })
    await page.locator('.wr-gncard', { hasText: 'About me: a form' }).click()
    await page.locator('.wr-stepchip', { hasText: 'Уровень предложения' }).click()
    await expect(page.locator('#task-t1')).toBeVisible()
    await noOverflow(page)
  })

  test('Блокнот не шире экрана', async ({ page }) => {
    await openWriting(page)
    await page.getByRole('button', { name: 'Открыть Блокнот' }).click()
    await expect(page.locator('.wr-editor')).toBeVisible()
    await noOverflow(page)
  })
})

test.describe('Практика — десктоп не пострадал', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 760, 'только широкий вьюпорт')

  // Пятая вкладка — «Грамматика» (28.10.2026); в ряд все пять — от 1200px, проект desktop — 1440.
  test('навыки — пять в ряд, карточки тренажёров — рядом в строку', async ({ page }) => {
    await openPractice(page)
    const cards = page.locator('.pk-skill')
    await expect(cards).toHaveCount(5)
    const boxes = await Promise.all([0, 1, 2, 3, 4].map((i) => cards.nth(i).boundingBox()))
    for (const b of boxes) expect(Math.abs(b.y - boxes[0].y)).toBeLessThan(1)
    const first = await page.locator('#sec-listenchoose').boundingBox()
    const second = await page.locator('#sec-listen').boundingBox()
    expect(Math.abs(first.y - second.y)).toBeLessThan(1)
  })

  test('рилсы: кнопки вверх/вниз остались и листают ленту', async ({ page }) => {
    await openPractice(page)
    // Ролики — в списке раздела: карточка «Мемы и рилсы» в обзоре — вход в каталог.
    await page.locator('#sec-memes').click()
    await page.locator('.pk-meme').first().click()

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
