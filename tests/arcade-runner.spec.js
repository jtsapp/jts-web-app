import { test, expect } from '@playwright/test'

// «Word Rush» — вторая игра «Аркады» (?screen=arcade&game=runner). Тесты
// гостевые: игре не нужен сервер, слова — статика Словаря.
//
// Сцена — WebGL. Headless Chrome без видеокарты даёт WebGL только через
// SwiftShader, а с Chrome 137 его надо разрешать флагом явно — иначе игра
// честно показывает «браузер не тянет 3D» и тест проверял бы не то.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] } })
// По одному: 3D в SwiftShader рисует процессор, и три забега разом душат
// машину — кадры встают, ряд проезжает раньше, чем тест успевает повернуть.
test.describe.configure({ mode: 'serial' })

const stage = (page) => page.locator('.ar-run-stage')

async function openRunner(page) {
  await page.goto('/?screen=arcade&game=runner')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Word Rush', { timeout: 30000 })
  await expect(page.getByRole('button', { name: /Старт/ })).toBeVisible({ timeout: 30000 })
}

async function startAt(page, levelName) {
  await page.getByRole('button', { name: new RegExp(levelName) }).click()
  await page.getByRole('button', { name: /Старт/ }).click()
}

// Ждёт ряд ворот и возвращает номер верной дорожки. Запас щедрый: перед
// первым рядом грузится словарь уровня (C1 — 630 КБ), а dev-сервер под
// параллельными тестами отдаёт его, пока компилирует чужие экраны.
async function nextRow(page) {
  await expect(stage(page)).not.toHaveAttribute('data-options', '', { timeout: 30000 })
  return Number(await stage(page).getAttribute('data-correct'))
}

async function goToLane(page, lane) {
  const now = Number(await stage(page).getAttribute('data-lane'))
  const key = lane < now ? 'ArrowLeft' : 'ArrowRight'
  for (let i = 0; i < Math.abs(lane - now); i++) await page.keyboard.press(key)
  await expect(stage(page)).toHaveAttribute('data-lane', String(lane))
}

test('верные ворота дают очко, неверные — отнимают жизнь и показывают перевод', async ({ page }) => {
  test.setTimeout(90_000)
  await openRunner(page)
  await startAt(page, 'Лёгкий')
  await goToLane(page, await nextRow(page))
  await expect(stage(page)).toHaveAttribute('data-score', '1', { timeout: 15000 })
  await expect(stage(page)).toHaveAttribute('data-lives', '3')

  const correct = await nextRow(page)
  await goToLane(page, (correct + 1) % 3)
  await expect(stage(page)).toHaveAttribute('data-lives', '2', { timeout: 15000 })
  await expect(page.locator('.ar-run-toast')).toContainText('=')
})

test('три ошибки — конец забега и список ошибок в итогах', async ({ page }) => {
  test.setTimeout(90_000)
  await openRunner(page)
  await startAt(page, 'Очень сложный')
  for (let i = 0; i < 3; i++) {
    const correct = await nextRow(page)
    await goToLane(page, (correct + 1) % 3)
    await expect(stage(page)).toHaveAttribute('data-lives', String(2 - i), { timeout: 15000 })
  }
  await expect(page.getByRole('heading', { name: 'Забег окончен' })).toBeVisible()
  await expect(page.locator('.ar-run-mistakes li')).toHaveCount(3)
})

test('зал открывает обе игры и возвращает назад', async ({ page }) => {
  await page.goto('/?screen=arcade')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Аркада', { timeout: 30000 })
  await page.getByRole('button', { name: /Word Rush/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Word Rush')
  await page.getByRole('button', { name: /К играм/ }).first().click()
  await page.getByRole('button', { name: /Speak or Die/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Speak or Die')
})
