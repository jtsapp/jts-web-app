import { test, expect } from '@playwright/test'
import path from 'node:path'

// Раздел «Караоке» в Практике. Бэкенд подставной: проверяем то, что зависит от
// клиента — раздел появляется только с контентом, разметка доспрашивается
// отдельным запросом (в каталоге её нет), битый трек не роняет экран.
//
// Контракт: docs/superpowers/specs/2026-09-03-karaoke-api-contract.md

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Тихая фонограмма нужной длины: записи из курса короче секунды, и песня
// кончалась раньше, чем тест успевал нажать паузу.
function silentWav(sec, rate = 8000) {
  const n = rate * sec
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  return buf
}

const TRACK = {
  id: 1,
  slug: 'rainy-monday',
  title: 'Rainy Monday',
  artist: 'JTS Originals',
  level: 'A2',
  bpm: 92,
  durationSec: 20,
  tags: ['past-simple', 'weather'],
  coverUrl: 'https://files.example/cover.webp',
  audioUrl: 'https://files.example/rainy.mp3',
  lineCount: 2,
  description: { ru: 'Про дождливый понедельник', en: '', kk: '' },
}

const LYRICS = {
  version: 1,
  duration: 20,
  vocab: [
    { w: 'umbrella', ru: 'зонт', line: 1 },
    { w: 'bus', ru: 'автобус', line: 2 },
  ],
  lines: [
    // ru у строк плеер больше не показывает, но в старых разметках он лежит.
    { id: 1, start: 1, end: 4, text: 'I woke up on a rainy Monday', ru: 'Я проснулся дождливым понедельником' },
    { id: 2, start: 5, end: 8, text: 'And the bus was late again', ru: 'И автобус снова опоздал' },
  ],
}

async function signIn(page, tracks, lyrics = LYRICS) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/karaoke', (r) => r.fulfill(json(tracks)))
  // Карточка каталога разметку не несёт — она приезжает только по одному треку.
  await page.route('**/mobile/karaoke/1', (r) => r.fulfill(json({ ...TRACK, lyrics })))
}

test.beforeEach(async ({ page }) => {
  // Каталог кэшируется в localStorage (stale-while-revalidate), а тесты
  // подменяют ответ — чужой кэш от соседнего теста показал бы прошлый каталог.
  // Тумблер туров переживает уборку: он общий на прогон (playwright.config.js),
  // а без него авто-тур «Практики» перехватывает клики по карточкам.
  await page.addInitScript(() => {
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
  })
})

test('раздел появляется только вместе с контентом', async ({ page }) => {
  await signIn(page, [])
  await page.goto('/?screen=practice')
  await expect(page.locator('#sec-karaoke')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Караоке', exact: true })).toHaveCount(0)
})

test('трек из каталога открывает сцену сразу, без карточки режимов', async ({ page }) => {
  await signIn(page, [TRACK])
  await page.goto('/?screen=practice')

  const section = page.locator('#sec-karaoke')
  await expect(section).toBeVisible()
  await expect(section.getByText('Rainy Monday')).toBeVisible()
  await expect(section.getByText('JTS Originals')).toBeVisible()

  await section.getByText('Rainy Monday').click()

  // По макету «Караоке» (24.09.2026) карточки трека с выбором режима нет:
  // клик по песне — сразу сцена, первая строка уже в центре.
  const stage = page.locator('.kk-play')
  await expect(stage).toBeVisible()
  await expect(stage.locator('.kk-top__title')).toHaveText('Rainy Monday')
  await expect(stage.locator('.kk-lyr__cur')).toContainText('rainy Monday')
  // Разогрев убран: режим один — спеть целиком. Словарь в разметке (он тут
  // есть) кнопку не возвращает.
  await expect(page.getByText('Разогрев')).toHaveCount(0)
  // Обещание про микрофон обязано быть на экране до запроса разрешения.
  await expect(stage.locator('.kk-stage__note')).toContainText('никуда не сохраняется')
  // Минуса у трека нет — нет и тумблера.
  await expect(stage.locator('.kk-top__minus')).toHaveCount(0)
})

test('битая разметка не роняет экран', async ({ page }) => {
  // Пересекающиеся строки — фатальная ошибка по контракту §3.
  await signIn(page, [TRACK], {
    duration: 20,
    lines: [
      { id: 1, start: 1, end: 6, text: 'one' },
      { id: 2, start: 4, end: 8, text: 'two' },
    ],
  })
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()

  await expect(page.locator('.kk-play__msg')).toContainText('битая разметка')
  // Выйти со сломанного трека можно — сцена не запирает студента.
  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page.locator('.kk-play')).toHaveCount(0)
  await expect(page.locator('#sec-karaoke')).toBeVisible()
})

test('в исполнении нет перевода — ни кнопки, ни строки', async ({ page }) => {
  // Перевод строк убран: в залитых разметках его нет, кнопка показывала
  // пустоту и только снимала 5% балла. Режим «без оценки» — чтобы дойти до экрана
  // исполнения без микрофона; вместо фонограммы — любой настоящий mp3.
  await signIn(page, [TRACK])
  await page.route('**/rainy.mp3', (r) =>
    r.fulfill({
      path: path.join(__dirname, '..', 'public', 'course', 'a0', 'audio', '08a84be563dc.mp3'),
      contentType: 'audio/mpeg',
    }))
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()
  // «Микрофон» выключен — петь без оценки, разрешение не спрашивается.
  await page.getByRole('switch', { name: 'Микрофон' }).click()
  await expect(page.locator('.kk-live')).toContainText('Без оценки')
  await page.getByRole('button', { name: 'Играть' }).click()

  await expect(page.locator('.kk-play')).toHaveAttribute('data-phase', 'run')
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
  await expect(page.getByRole('button', { name: /перевод/i })).toHaveCount(0)
  // Первая строка идёт с 1-й секунды — дождаться, пока в ней загорится слово.
  await expect(page.locator('.kk-lyr__cur .is-sung, .kk-lyr__cur .is-now').first()).toBeVisible()
  await expect(page.locator('.kk-lyr__cur')).toContainText('rainy Monday')
  await expect(page.getByText('Я проснулся дождливым понедельником')).toHaveCount(0)
})

test('пауза: окно с прогрессом, выход без результата возвращает в каталог', async ({ page }) => {
  await signIn(page, [TRACK])
  await page.route('**/rainy.mp3', (r) => r.fulfill({ contentType: 'audio/wav', body: silentWav(20) }))
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()
  await page.getByRole('switch', { name: 'Микрофон' }).click()
  await page.getByRole('button', { name: 'Играть' }).click()
  await expect(page.locator('.kk-play')).toHaveAttribute('data-phase', 'run')

  // «Выйти» посреди песни не бросает дубль молча — сначала пауза.
  await page.getByRole('button', { name: 'Выйти' }).click()
  const dialog = page.getByRole('dialog', { name: 'Пауза' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('из 2')
  await expect(dialog.getByRole('button', { name: 'Продолжить' })).toBeFocused()

  await dialog.getByRole('button', { name: 'Выйти без результата' }).click()
  await expect(page.locator('.kk-play')).toHaveCount(0)
  await expect(page.locator('#sec-karaoke')).toBeVisible()
})

test('режим без оценки не трогает микрофон и не спрашивает разрешения', async ({ page }) => {
  await signIn(page, [TRACK])
  await page.route('**/rainy.mp3', (r) => r.fulfill({ contentType: 'audio/wav', body: silentWav(20) }))
  // Если микрофон всё-таки запросят — тест должен упасть, а не зависнуть на
  // системном окне: подменяем getUserMedia на отказ и ловим его по подписи.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('no'))
  })
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()

  const free = page.getByRole('switch', { name: 'Без оценки' })
  await expect(free).toHaveAttribute('aria-checked', 'false')
  await free.click()
  // Тумблер микрофона гаснет следом: обещать запись там, где её нет, нельзя.
  const mic = page.getByRole('switch', { name: 'Микрофон' })
  await expect(mic).toHaveAttribute('aria-checked', 'false')
  await expect(mic).toBeDisabled()
  // И обещание про запись со сцены уходит — записывать нечего.
  await expect(page.locator('.kk-stage__note')).toHaveCount(0)

  await page.getByRole('button', { name: 'Играть' }).click()
  await expect(page.locator('.kk-play')).toHaveAttribute('data-phase', 'run')
  await expect(page.locator('.kk-live')).toContainText('Без оценки')
  await expect(page.getByText('Микрофон не разрешён')).toHaveCount(0)
})

test('скорость переключается ступенями и переживает смену фонограммы', async ({ page }) => {
  await signIn(page, [{ ...TRACK, instrumentalUrl: 'https://files.example/rainy-minus.mp3' }])
  await page.route(/rainy(-minus)?\.mp3/, (r) => r.fulfill({ contentType: 'audio/wav', body: silentWav(20) }))
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()

  const speed = page.locator('.kk-speed')
  await expect(speed).toHaveText('1×')
  await speed.click()
  await expect(speed).toHaveText('1,25×')
  await speed.click()
  await expect(speed).toHaveText('0,75×')

  const rate = () => page.locator('.kk-play audio').evaluate((a) => a.playbackRate)
  expect(await rate()).toBe(0.75)

  // Смена фонограммы грузит другой файл, а браузер сбрасывает playbackRate в
  // единицу на каждый новый src — скорость обязана вернуться сама.
  await page.getByRole('switch', { name: 'Минус' }).click()
  await expect(page.locator('.kk-play audio')).toHaveJSProperty('playbackRate', 0.75)
})

test('трек без разметки помечается недоступным, а не грузится вечно', async ({ page }) => {
  await signIn(page, [TRACK], null)
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()

  await expect(page.locator('.kk-play__msg')).toContainText('битая разметка')
})
