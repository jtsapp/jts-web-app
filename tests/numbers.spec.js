import { test, expect } from '@playwright/test'

// Раздел «Числа» (?screen=numbers, Dexter's Number World). Тесты гостевые: прогресс
// гостя живёт в черновике хранилища на устройстве, данные и картинки — статика.
//
// Игра живёт в Shadow DOM — CSS-локаторы Playwright проходят в открытый shadow
// root сами. Звук /api/tts подменяется тихой дорожкой, а флаг __NUMBERS_FAST
// сжимает прыжки и анимации до миллисекунд — раунд из 18 заданий проходит за
// секунды. Верный остров тест берёт из data-answer сцены (как data-correct у
// Word Rush), ничего не захардкожено.

// MPEG-1 Layer III, 44.1 кГц, 128 кбит/с: кадр 417 байт — заголовок и нули, тишина.
function silentMp3(frames = 10) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}
const SILENCE = silentMp3()

test.beforeEach(async ({ page }) => {
  await page.route('**/api/tts?**', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: SILENCE }))
  await page.addInitScript(() => { window.__NUMBERS_FAST = true })
})

const open = async (page) => {
  await page.goto('/?screen=numbers')
  // Диплинк применяется эффектом после гидратации; карта рисуется, когда приехал data.json.
  await expect(page.locator('.nmb-host .card')).toHaveCount(16, { timeout: 30000 })
}

const results = (page) => page.locator('.res h1')
const ready = (page) => page.locator('#isles button.isl:not([disabled])')
// Номер текущего задания — камень пути с классом cur. Ответ соседних заданий
// может совпадать, поэтому «раунд ушёл дальше» меряем по камню, а не по ответу.
const current = (page) => page.locator('.stone.cur').getAttribute('data-st')

// Прыжок на верный остров и ожидание следующего задания (или итогов).
async function jump(page) {
  await expect(ready(page)).toHaveCount(3, { timeout: 15000 })
  const idx = await current(page)
  const ans = await page.locator('#scene').getAttribute('data-answer')
  await page.locator(`#isles button.isl[data-v="${ans.replace(/"/g, '\\"')}"]`).first().click()
  await expect(async () => {
    if (await results(page).isVisible()) return
    expect(await current(page)).not.toBe(idx)
    expect(await ready(page).count()).toBe(3)
  }).toPass({ timeout: 15000 })
}

async function playRound(page) {
  for (let n = 0; n < 40; n++) {
    if (await results(page).isVisible()) return
    await jump(page)
  }
  throw new Error('раунд не закончился за 40 прыжков')
}

test('карта: 16 разделов в трёх мирах, Listening Lab, счётчик уровней', async ({ page }) => {
  await open(page)
  await expect(page.locator('.nmb-host .lab-card')).toBeVisible()
  await expect(page.locator('#hdrProg')).toHaveText('0 / 17 levels')
  await expect(page.locator('.nmb-host .world h2')).toHaveText(['Meadow of First Numbers', 'Golden Canyon of Hundreds', 'Starlight Citadel of Billions'])
})

test('объяснение с переводом → раунд без ошибок → итоги, и после перезагрузки раунд засчитан', async ({ page }) => {
  await open(page)
  await page.locator('.card[data-id="teens"]').click()
  await expect(page.locator('.ls-head h1')).toHaveText('Teens vs Tens')
  // перевод — под английским, а не вместо него
  await page.locator('[data-tr="ru"]').click()
  await expect(page.locator('.ls-tr').first()).toContainText('Объяснение на русском')
  await expect(page.locator('.ls-lead')).toContainText('13–19 end in')

  await page.locator('#goBtn').click()
  await playRound(page)
  await expect(results(page)).toHaveText('Portal opened!')
  await expect(page.locator('.res-stats b').first()).toHaveText('100%')

  await page.reload()
  await expect(page.locator('.nmb-host .card')).toHaveCount(16, { timeout: 30000 })
  await page.locator('.card[data-id="teens"]').click()
  await expect(page.locator('.rnum[data-k="0"]')).toHaveClass(/\bok\b/)
  // язык перевода — настройка устройства, пережила перезагрузку
  await expect(page.locator('[data-tr="ru"]')).toHaveAttribute('aria-pressed', 'true')
})

test('босс: только звук, и пройденный раунд не «побеждает» босса целиком', async ({ page }) => {
  await open(page)
  await page.locator('.card[data-id="boss1"]').click()
  await page.locator('#goBtn').click()
  await expect(ready(page)).toHaveCount(3, { timeout: 15000 })
  // задание на слух без подсказки: слова на экране нет
  await expect(page.locator('#pill')).toContainText('Listen and jump')
  await playRound(page)
  await expect(results(page)).toHaveText('Boss round 1 cleared!')
})

test('длинные варианты помещаются в табличку и не налезают на соседей', async ({ page }) => {
  await open(page)
  await page.locator('.card[data-id="money"]').click()
  await page.locator('.rnum[data-k="2"]').click()   // «Apply the rules» — варианты словами
  await page.locator('#goBtn').click()
  for (let n = 0; n < 4; n++) {
    await expect(page.locator('#isles button.isl.wd:not([disabled])')).toHaveCount(3, { timeout: 15000 })
    const bad = await page.evaluate(() => {
      const sr = document.querySelector('.nmb-host').shadowRoot
      const tabs = [...sr.querySelectorAll('#isles button.isl.wd .tab')]
      const boxes = tabs.map((t) => t.getBoundingClientRect())
      return tabs.flatMap((t, i) => {
        const r = document.createRange()
        r.selectNodeContents(t)
        const txt = r.getBoundingClientRect()
        const out = []
        if (txt.left < boxes[i].left - 1 || txt.right > boxes[i].right + 1) out.push(`текст шире таблички: ${t.textContent}`)
        if (i < 2 && boxes[i].right > boxes[i + 1].left + 1) out.push(`налезает на соседа: ${t.textContent}`)
        return out
      })
    })
    expect(bad).toEqual([])
    await jump(page)
  }
})
