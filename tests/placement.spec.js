import { test, expect } from '@playwright/test'

// Тест на определение уровня — раннер школы из public/practice/placement/,
// встроенный в приложение как есть (см. PlacementTestPage.jsx). Здесь
// проверяется то, что ломается при переносе бандла: отдаётся ли сам файл,
// доезжают ли рядом лежащие аудио и клипы, стартует ли движок без ошибок и
// доходит ли результат до родительской страницы через мост.

const RUNNER = '/practice/placement/index.html'

test.describe('placement — раннер и мост', () => {
  test('раннер стартует без ошибок и предлагает выбрать язык', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

    await page.goto(RUNNER)

    await expect(page.locator('body')).toContainText('Выберите язык')
    for (const label of ['Русский', 'Қазақша', 'English']) {
      await expect(page.locator('button', { hasText: label }).first()).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  // Банк лежит рядом с файлом и адресуется относительными путями: при переносе
  // бандла это первое, что отваливается.
  test('банк заданий доезжает вместе с аудио и клипами', async ({ page }) => {
    const ok = async (url) => (await page.request.get(url)).status()

    expect(await ok('/practice/placement/jts-bank/manifest.json')).toBe(200)
    expect(await ok('/practice/placement/jts-bank/soundcheck.mp3')).toBe(200)
    expect(await ok('/practice/placement/jts-bank/a0/w01.mp3')).toBe(200)
    expect(await ok('/practice/placement/jts-bank/b1/src-l-b1-01.mp3')).toBe(200)
    expect(await ok('/practice/placement/jts-bank/clips/clip1.mp4')).toBe(200)

    const manifest = await (await page.request.get('/practice/placement/jts-bank/manifest.json')).json()
    expect(manifest.words.length).toBeGreaterThan(0)
    // Пути в манифесте относительные — проверяем, что каждый реально отдаётся.
    for (const w of manifest.words.slice(0, 5)) {
      expect(await ok(`/practice/placement/jts-bank/${w.file}`), w.file).toBe(200)
    }
  })

  test('движок доводит результат до родительской страницы', async ({ page }) => {
    // Кадр вставляем на страницу приложения, а не в about:blank: относительный
    // путь раннера резолвится только от его origin.
    await page.goto('/')
    await page.evaluate((src) => {
      window.__msgs = []
      addEventListener('message', (e) => {
        if (e.data && e.data.source === 'jts-placement') window.__msgs.push(e.data)
      })
      const f = document.createElement('iframe')
      f.id = 'f'
      f.src = src
      f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999'
      document.body.appendChild(f)
    }, RUNNER)
    const frame = page.frameLocator('#f')
    await expect(frame.locator('body')).toContainText('Выберите язык')

    // Мост объявлен до движка и не зависит от того, докуда дошёл студент.
    const inner = page.frames().find((f) => f.url().includes('placement'))
    expect(await inner.evaluate(() => typeof window.JTS_BRIDGE?.send)).toBe('function')

    await inner.evaluate(() =>
      window.JTS_BRIDGE.send('placement:done', { level: 'B1', theta: -0.2, se: 0.41, flags: [] }),
    )
    await expect.poll(() => page.evaluate(() => window.__msgs.length)).toBe(1)
    expect(await page.evaluate(() => window.__msgs[0].result.level)).toBe('B1')
    expect(await page.evaluate(() => window.__msgs[0].type)).toBe('placement:done')
  })

  test('открытый напрямую раннер работает и никуда не шлёт', async ({ page }) => {
    await page.goto(RUNNER)
    // Без встраивания postMessage некому принимать — мост обязан промолчать,
    // а не свалиться и не увести тест в ошибку.
    const sent = await page.evaluate(() => {
      window.JTS_BRIDGE.send('placement:done', { level: 'A1' })
      return 'ok'
    })
    expect(sent).toBe('ok')
    await expect(page.locator('body')).toContainText('Выберите язык')
  })
})
