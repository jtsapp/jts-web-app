import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Раздел «Слушай и выбирай» (?screen=listenchoose). Тесты гостевые (без токена):
// раздел бесплатный, прогресс живёт в localStorage, данные и картинки — статика.
//
// Записи подменяются короткой тихой дорожкой: настоящий плеер при этом проходит
// весь путь «нажал Play → дослушал → выбрал» за полсекунды, а не за 3–15 секунд
// живой озвучки на каждое задание. Сама озвучка проверена отдельно (data.test.js
// — файл на диске у каждого из 150 заданий).
//
// Ожидания не захардкожены: спека читает тот же questions.json, что и
// приложение, а верное фото берёт из сохранённого набора устройства.

const ROOT = path.join(__dirname, '..')
const DATA = JSON.parse(readFileSync(path.join(ROOT, 'public', 'practice', 'listenchoose', 'questions.json'), 'utf8'))
const BY_ID = Object.fromEntries(DATA.questions.map((q) => [q.id, q]))
// Строки прототипа — там, где порт их не менял. Четыре ключа порт ПЕРЕВЁЛ (в
// прототипе они остались английскими), поэтому их ждём уже переведёнными.
const RU = {
  ...JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'listenchoose-i18n-source.json'), 'utf8')).ru,
  show: 'Показать текст',
  hide: 'Скрыть текст',
}

// MPEG-1 Layer III, 44.1 кГц, 128 кбит/с, моно: кадр 417 байт (~26 мс) —
// заголовок и нули, декодер читает их как тишину. 20 кадров ≈ 0.52 с; порог
// «дослушал» (длительность − 0.32 с) набирается за 0.2 с настоящего времени.
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}
const SILENCE = silentMp3()
const AUDIO = '**/practice/listenchoose/audio/*.mp3'

test.beforeEach(async ({ page }) => {
  await page.route(AUDIO, (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: SILENCE }))
})

const open = async (page, query = '') => {
  await page.goto(`/?screen=listenchoose${query}`)
  // Диплинк применяется эффектом ПОСЛЕ гидратации и ответа бэкенда — ждём саму
  // карточку упражнения: она появляется, когда загружены данные.
  await expect(page.locator('.lc-head h1')).toContainText('Слушай и выбирай', { timeout: 30000 })
  await expect(page.locator('.lc-bench')).toBeVisible({ timeout: 30000 })
}

const device = (page) =>
  page.evaluate(() => {
    const dev = JSON.parse(localStorage.getItem('jts_listenchoose_run'))
    return { level: dev.level, counts: dev.counts, rate: dev.rate, run: dev.runs[dev.level] }
  })

// Текущее задание: верное фото и порядок показа — из сохранённого набора.
const current = async (page) => {
  const { run } = await device(page)
  const q = BY_ID[run.queue[run.index]]
  return { q, order: run.rounds[q.id].order, index: run.index, total: run.queue.length }
}

const opt = (page, i) => page.locator(`.lc-opt[data-option="${i}"]`)
const wrongOf = (q, k = 0) => [0, 1, 2, 3].filter((i) => i !== q.answer)[k]

// Дослушать запись до конца: картинки должны загрузиться, Play — доиграть.
const listen = async (page) => {
  await expect(page.locator('.lc-opt.is-loaded')).toHaveCount(4)
  await page.locator('#lc-play').click()
  await expect(page.locator('.lc-gate')).toContainText(RU.ready)
}

// Прослушать заново после ошибки (Replay) — и снова дождаться «можно выбирать».
const relisten = async (page) => {
  await page.getByRole('button', { name: 'Replay' }).click()
  await expect(page.locator('.lc-gate')).toContainText(RU.ready)
}

// Один шаг набора: 'first' — верно с первой, 'second' — ошибка и верно со
// второй, 'miss' — две ошибки. Возвращает разобранное задание.
async function solve(page, how) {
  const { q } = await current(page)
  await listen(page)
  if (how === 'first') {
    await opt(page, q.answer).click()
  } else if (how === 'second') {
    await opt(page, wrongOf(q, 0)).click()
    await relisten(page)
    await opt(page, q.answer).click()
  } else {
    await opt(page, wrongOf(q, 0)).click()
    await relisten(page)
    await opt(page, wrongOf(q, 1)).click()
  }
  await expect(page.locator('.lc-feedback__actions .lc-primary')).toBeVisible()
  return q
}

const next = (page) => page.locator('.lc-feedback__actions .lc-primary').click()

// Набор из 5 заданий вместо 10: тест на весь набор укладывается в полминуты.
async function fiveSet(page) {
  await page.locator('#lc-count').selectOption('5')
  await page.locator('.lc-setup .lc-primary').click()
  await expect(page.locator('.lc-round strong')).toHaveText('1 / 5')
}

test.describe('экран', () => {
  test('открывается по диплинку: шапка, сложность, набор, плеер и четыре фото', async ({ page }) => {
    await open(page)
    await expect(page.locator('.lc-seg button[aria-pressed="true"]')).toHaveText('Easy')
    await expect(page.locator('#lc-count')).toHaveValue('10')
    await expect(page.locator('.lc-round strong')).toHaveText('1 / 10')
    await expect(page.locator('.lc-instruction h2')).toHaveText('Listen and choose the correct picture')
    await expect(page.locator('.lc-opt')).toHaveCount(4)
    await expect(page.locator('.lc-opt.is-loaded')).toHaveCount(4)
    // Запись загрузилась: время и длительность (0.52 с тихой дорожки → 0:00).
    await expect(page.locator('.lc-track__top')).toContainText('0:00 / 0:00')
    await expect(page.locator('#lc-play')).toBeEnabled()
  })

  test('выбор закрыт, пока запись не дослушана', async ({ page }) => {
    await open(page)
    await expect(page.locator('.lc-opt.is-loaded')).toHaveCount(4)
    await expect(page.locator('.lc-gate')).toContainText(RU.locked)
    for (let i = 0; i < 4; i++) await expect(opt(page, i)).toHaveAttribute('aria-disabled', 'true')
    const { q } = await current(page)
    await opt(page, q.answer).click({ force: true })
    // Клик по закрытой картинке ничего не решает и возвращает фокус на Play.
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'idle')
    await expect(page.locator('#lc-play')).toBeFocused()
    await listen(page)
    for (let i = 0; i < 4; i++) await expect(opt(page, i)).toHaveAttribute('aria-disabled', 'false')
  })

  test('ошибка загрузки списка — сообщение вместо белого листа', async ({ page }) => {
    await page.route('**/practice/listenchoose/questions.json', (route) => route.abort())
    await page.goto('/?screen=listenchoose')
    await expect(page.locator('.lc-notice--err')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('.lc-bench')).toHaveCount(0)
  })
})

test.describe('раунд', () => {
  test('верно с первой попытки: зелёная рамка, ключевая деталь, фокус на «Дальше»', async ({ page }) => {
    await open(page)
    const q = await solve(page, 'first')
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'correct')
    await expect(opt(page, q.answer)).toHaveClass(/is-correct/)
    await expect(page.locator('.lc-feedback')).toContainText(q.key)
    await expect(page.locator('.lc-feedback__actions .lc-primary')).toBeFocused()
    await expect(page.locator('.lc-score')).toContainText('1')
    await next(page)
    await expect(page.locator('.lc-round strong')).toHaveText('2 / 10')
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'idle')
  })

  test('ошибка: ответ скрыт, запись надо слушать заново, потом вторая попытка', async ({ page }) => {
    await open(page)
    const { q } = await current(page)
    await listen(page)
    const wrong = wrongOf(q, 0)
    await opt(page, wrong).click()
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'retry')
    await expect(page.locator('.lc-step')).toContainText('2 / 2')
    await expect(opt(page, wrong)).toHaveClass(/is-wrong/)
    // Верный ответ НЕ раскрыт, выбирать нельзя, пока не послушал снова.
    await expect(page.locator('.lc-opt.is-correct, .lc-opt.is-revealed')).toHaveCount(0)
    await expect(page.locator('.lc-gate')).toContainText(RU.retryGate)
    await expect(opt(page, q.answer)).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByRole('button', { name: 'Replay' })).toBeFocused()
    await relisten(page)
    // Ошибочная картинка так и остаётся закрытой.
    await expect(opt(page, wrong)).toHaveAttribute('aria-disabled', 'true')
    await opt(page, q.answer).click()
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'correct')
    await expect(page.locator('.lc-feedback')).toContainText(RU.secondGood)
  })

  test('две ошибки: верная картинка обведена, текст записи открывается', async ({ page }) => {
    await open(page)
    const q = await solve(page, 'miss')
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'failed')
    await expect(opt(page, q.answer)).toHaveClass(/is-revealed/)
    await expect(page.locator('.lc-transcript')).toHaveCount(0)
    await page.getByRole('button', { name: RU.show }).click()
    await expect(page.locator('.lc-transcript')).toContainText(q.text)
    await expect(page.locator('.lc-transcript')).toContainText(q.key)
    await page.getByRole('button', { name: RU.hide }).click()
    await expect(page.locator('.lc-transcript')).toHaveCount(0)
  })

  test('клавиатура: цифры работают и после клика по Play, R — по физической клавише, Enter — дальше', async ({ page }) => {
    await open(page)
    const { q, order } = await current(page)
    // Фокус остаётся на кнопке Play, и справка обещает, что 1–4 всё равно выбирают.
    await listen(page)
    await expect(page.locator('#lc-play')).toBeFocused()
    await page.keyboard.press(String(order.findIndex((oi) => oi !== q.answer) + 1))
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'retry')
    // R — «сначала»: по физической клавише (code), а не по букве раскладки.
    await page.keyboard.press('KeyR')
    await expect(page.locator('.lc-gate')).toContainText(RU.ready)
    await page.keyboard.press(String(order.indexOf(q.answer) + 1))
    await expect(page.locator('.lc-feedback')).toHaveAttribute('data-state', 'correct')
    // Фокус перешёл на «Дальше»: Enter нажимает его.
    await page.keyboard.press('Enter')
    await expect(page.locator('.lc-round strong')).toHaveText('2 / 10')
  })
})

test.describe('набор и итог', () => {
  test('весь набор: итог с тремя счётчиками и «Повторить ошибки»', async ({ page }) => {
    test.setTimeout(90000)
    await open(page)
    await fiveSet(page)
    const ids = []
    for (const how of ['first', 'second', 'miss', 'first', 'first']) {
      ids.push((await solve(page, how)).id)
      await next(page)
    }
    await expect(page.locator('.lc-result')).toBeVisible()
    await expect(page.locator('.lc-result__circle')).toHaveText('4/5')
    const counts = page.locator('.lc-stats strong')
    await expect(counts).toHaveText(['3', '1', '1'])
    // Разбор: пять заданий с текстами.
    await page.getByRole('button', { name: RU.review }).click()
    await expect(page.locator('.lc-review li')).toHaveCount(5)
    await expect(page.locator('.lc-review li').first()).toContainText(BY_ID[ids[0]].text)
    // «Повторить ошибки» берёт вторую попытку и промах — два задания.
    await page.getByRole('button', { name: RU.repeat }).click()
    await expect(page.locator('.lc-round strong')).toHaveText('1 / 2')
    const { run } = await device(page)
    expect([...run.queue].sort()).toEqual([ids[1], ids[2]].sort())
  })

  test('«Новый набор» после итога открывает свежий набор', async ({ page }) => {
    test.setTimeout(90000)
    await open(page)
    await fiveSet(page)
    for (let i = 0; i < 5; i++) {
      await solve(page, 'first')
      await next(page)
    }
    await expect(page.locator('.lc-result__circle')).toHaveText('5/5')
    await expect(page.getByRole('button', { name: RU.repeat })).toHaveCount(0)
    await page.getByRole('button', { name: RU.newSet }).click()
    await expect(page.locator('.lc-round strong')).toHaveText('1 / 5')
    await expect(page.locator('.lc-result')).toHaveCount(0)
  })

  test('сложности хранят наборы отдельно, недоигранный набор переживает перезагрузку', async ({ page }) => {
    await open(page)
    await solve(page, 'first')
    await next(page)
    await expect(page.locator('.lc-round strong')).toHaveText('2 / 10')
    await page.locator('.lc-seg button', { hasText: 'Hard' }).click()
    await expect(page.locator('.lc-round strong')).toHaveText('1 / 10')
    await expect(page.locator('.lc-seg button[aria-pressed="true"]')).toHaveText('Hard')
    expect((await device(page)).level).toBe('hard')
    await page.locator('.lc-seg button', { hasText: 'Easy' }).click()
    await expect(page.locator('.lc-round strong')).toHaveText('2 / 10')
    // Перезагрузка: тот же набор с того же места.
    const before = (await device(page)).run.queue
    await page.goto('/?screen=listenchoose')
    await expect(page.locator('.lc-bench')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('.lc-round strong')).toHaveText('2 / 10')
    expect((await device(page)).run.queue).toEqual(before)
  })

  test('диплинк ?difficulty=hard открывает сложную ленту и не рисует лишний лёгкий набор', async ({ page }) => {
    await open(page, '&difficulty=hard')
    await expect(page.locator('.lc-seg button[aria-pressed="true"]')).toHaveText('Hard')
    const { q } = await current(page)
    expect(q.level).toBe('hard')
    // Набор нарисован один — для запрошенной сложности, а не для запомненной.
    const runs = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('jts_listenchoose_run')).runs))
    expect(runs).toEqual(['hard'])
  })

  test('размер набора: своё число, неверное число закрывает «Новый набор»', async ({ page }) => {
    await open(page)
    await page.locator('#lc-count').selectOption('custom')
    const input = page.locator('#lc-custom')
    await input.fill('7')
    await expect(page.locator('.lc-note')).toContainText(`${RU.countPending} 7`)
    await input.fill('99')
    await expect(page.locator('.lc-note')).toContainText(RU.countInvalid)
    await expect(page.locator('.lc-setup .lc-primary')).toBeDisabled()
    await input.fill('7')
    await page.locator('.lc-setup .lc-primary').click()
    await expect(page.locator('.lc-round strong')).toHaveText('1 / 7')
    expect((await device(page)).counts.easy).toBe(7)
  })

  test('темп доезжает до самой записи и не теряется на следующем задании', async ({ page }) => {
    // Загрузка записи возвращает playbackRate к умолчательному, и выбранный темп
    // терялся на каждом задании, хотя список его показывал. Пишем, с каким темпом
    // браузер РЕАЛЬНО запускает каждую запись.
    await page.addInitScript(() => {
      window.__lcRates = []
      const play = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function (...args) {
        window.__lcRates.push(this.playbackRate)
        return play.apply(this, args)
      }
    })
    await open(page)
    await page.locator('.lc-speed select').selectOption('1.25')
    await solve(page, 'first')
    await next(page)
    await solve(page, 'first')
    const rates = await page.evaluate(() => window.__lcRates)
    expect(rates.length).toBeGreaterThanOrEqual(2)
    for (const r of rates) expect(r).toBe(1.25)
  })

  test('темп запоминается на устройстве', async ({ page }) => {
    await open(page)
    await page.locator('.lc-speed select').selectOption('1.25')
    expect((await device(page)).rate).toBe(1.25)
    await page.goto('/?screen=listenchoose')
    await expect(page.locator('.lc-bench')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('.lc-speed select')).toHaveValue('1.25')
  })
})

test.describe('запись и окна', () => {
  test('запись не загрузилась: сообщение и «Try again», потом играет', async ({ page }) => {
    await page.route(AUDIO, (route) => route.abort())
    await open(page)
    await expect(page.locator('.lc-error')).toBeVisible()
    await expect(page.locator('#lc-play')).toBeDisabled()
    // Сеть вернулась.
    await page.unroute(AUDIO)
    await page.route(AUDIO, (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: SILENCE }))
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('.lc-error')).toHaveCount(0)
    await listen(page)
  })

  test('справка открывается и закрывается по Esc', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: RU.help }).click()
    const dialog = page.locator('dialog.lc-dialog[open]')
    await expect(dialog).toContainText(RU.helpBody)
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog.lc-dialog[open]')).toHaveCount(0)
  })

  test('увеличение картинки: окно, перелистывание по кругу', async ({ page }) => {
    await open(page)
    await expect(page.locator('.lc-opt.is-loaded')).toHaveCount(4)
    await page.locator('.lc-zoom').first().click({ force: true })
    const dialog = page.locator('dialog.lc-dialog--zoom[open]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('1 / 4')
    await dialog.getByRole('button', { name: 'Previous picture' }).click()
    await expect(dialog).toContainText('4 / 4')
    await dialog.getByRole('button', { name: 'Next picture' }).click()
    await expect(dialog).toContainText('1 / 4')
    await dialog.getByRole('button', { name: RU.close }).click()
    await expect(page.locator('dialog.lc-dialog--zoom[open]')).toHaveCount(0)
  })
})

test.describe('раскладка', () => {
  test('телефон: фото 2×2, подпись на Play скрыта', async ({ page, viewport }) => {
    test.skip(viewport.width > 560, 'раскладка телефона')
    await open(page)
    const boxes = await page.locator('.lc-opt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
    expect(boxes[1].y).toBeCloseTo(boxes[0].y, 0)
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y + 20)
    expect(boxes[2].x).toBeCloseTo(boxes[0].x, 0)
    await expect(page.locator('.lc-play span')).toBeHidden()
    // Страница не ползёт вбок.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('десктоп: четыре фото в ряд, подсказка про клавиши видна', async ({ page, viewport }) => {
    test.skip(viewport.width <= 900, 'раскладка десктопа')
    await open(page)
    const boxes = await page.locator('.lc-opt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
    for (const b of boxes) expect(b.y).toBeCloseTo(boxes[0].y, 0)
    await expect(page.locator('.lc-keys')).toBeVisible()
  })
})

test.describe('хаб Практики', () => {
  test('баннер во вкладке «Аудирование» ведёт в раздел', async ({ page }) => {
    await page.goto('/?screen=practice')
    const banner = page.locator('#sec-listenchoose')
    await expect(banner).toBeVisible({ timeout: 30000 })
    await expect(banner).toContainText('Услышь детали')
    await banner.locator('.pk-banner__cta').click()
    await expect(page.locator('.lc-head h1')).toContainText('Слушай и выбирай')
  })
})
