import { test, expect } from '@playwright/test'

// Стадия Vocabulary уровня A0: презентация слов.
//
// Раньше словарь приезжал одной html-простынёй и печатался заметкой: перевод
// виден сразу, карточку не перевернуть, слово не забрать себе — вместо
// презентации получался список. Тест держит обещанное поведение: картинка,
// переворот на перевод и «+» в личный словарь.
async function bootVocab(page) {
  await page.route('**/api/auth/me', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel: 'A1' } }) }),
  )
  await page.route('**/mobile/lesson-modules', (r) => r.fulfill({ contentType: 'application/json', body: '[]' }))
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
  await page.goto('/?screen=kingdom&unlock=1')
  await page.locator('.lp-node', { hasText: 'Уровень A0' }).first().click()
  // Узел тропы — урок целиком (стадии склеены в одну очередь экранов), поэтому
  // до карточек словаря доходим разминкой, а не отдельным узлом стадии.
  const lesson = page.locator('.kt-step:not([disabled])').first()
  await expect(lesson).toBeVisible({ timeout: 15000 })
  await lesson.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })
  for (let i = 0; i < 10 && !(await page.locator('.cp-word').count()); i++) {
    const cta = page.locator('.cp-cta')
    if (await cta.isDisabled().catch(() => true)) await page.locator('.cp-choice, .cp-pick').first().click()
    await cta.click()
    await page.waitForTimeout(150)
  }
  await expect(page.locator('.cp-word').first()).toBeVisible({ timeout: 15000 })
}

test.describe('A0: карточки словаря', () => {
  test('слово с картинкой, переворот на перевод', async ({ page }) => {
    await bootVocab(page)

    const cards = page.locator('.cp-word')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(1)

    // Картинка своя, из репозитория: чужой хост все эти месяцы отдавал 404.
    // Лежит она рядом с курсом — в файле курса картинок слов нет вовсе, и
    // карточка берёт снимок из прошлой выгрузки (img-index.json уровня).
    const img = cards.first().locator('img')
    await expect(img).toHaveAttribute('src', /^\/course\/a0\/img\/.+\.(webp|jpg)$/)
    // Ленивая загрузка: на стадии их два десятка, и на слабом канале грузить
    // все сразу незачем.
    await expect(img).toHaveAttribute('loading', 'lazy')

    // Лицо карточки — картинка, перевод закрыт до клика.
    const back = cards.first().locator('.cp-word__back')
    await expect(back).toBeHidden()
    await cards.first().locator('.cp-word__flip').click()
    await expect(back).toBeVisible()
  })

  test('«+» кладёт слово в личный словарь и превращается в галочку', async ({ page }) => {
    let sent = null
    await page.route('**/api/profile/vocab', async (r) => {
      sent = JSON.parse(r.request().postData() || '{}')
      await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ configured: true, ok: true }) })
    })
    await bootVocab(page)

    // Кнопка на обороте карточки: «В словарь» → «В словаре» (класс
    // cp-word__save; раньше это был значок «+» с классом cp-word__add).
    const card = page.locator('.cp-word').first()
    await card.locator('.cp-word__flip').click()
    const add = card.locator('.cp-word__save')
    await expect(add).toHaveText('В словарь')
    await add.click()
    await expect(add).toHaveText('В словаре')
    await expect(add).toBeDisabled()

    expect(sent?.items?.[0]?.word, 'слово не ушло в словарь').toBeTruthy()
    // Подсказкой в словаре едет перевод — иначе слово там будет без значения.
    expect(sent.items[0].hint).toBeTruthy()
  })

  test('осечка сети возвращает «+»: галочка не врёт про несохранённое слово', async ({ page }) => {
    await page.route('**/api/profile/vocab', (r) =>
      r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ configured: false, error: 'DATABASE_URL is not set.' }) }),
    )
    await bootVocab(page)

    const card = page.locator('.cp-word').first()
    await card.locator('.cp-word__flip').click()
    const add = card.locator('.cp-word__save')
    await add.click()
    await expect(add).toHaveText('В словарь')
    await expect(add).toBeEnabled()
  })
})
