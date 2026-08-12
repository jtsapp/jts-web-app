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
  // Второй узел тропы — Vocabulary, карточки идут его первым экраном.
  const vocab = page.locator('.kt-step:not([disabled])').nth(1)
  await expect(vocab).toBeVisible({ timeout: 15000 })
  await vocab.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })
}

test.describe('A0: карточки словаря', () => {
  test('слово с картинкой, переворот на перевод', async ({ page }) => {
    await bootVocab(page)

    const cards = page.locator('.cp-word')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(1)

    // Картинка своя, из репозитория: чужой хост все эти месяцы отдавал 404.
    const img = cards.first().locator('img')
    await expect(img).toHaveAttribute('src', /^\/learning\/img\/a0\/.+\.webp$/)
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

    const add = page.locator('.cp-word').first().locator('.cp-word__add')
    await expect(add).toHaveText('+')
    await add.click()
    await expect(add).toHaveText('✓')
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

    const add = page.locator('.cp-word').first().locator('.cp-word__add')
    await add.click()
    await expect(add).toHaveText('+')
    await expect(add).toBeEnabled()
  })
})
