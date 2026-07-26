import { test, expect } from '@playwright/test'

// Словарь после перевода с iframe-прототипа на нативный экран.
// Прогон беззвучный: TTS и WebAudio заглушены, звук в настройках выключен —
// иначе локальный запуск тестов орёт на всю комнату.

const silence = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('jts_vocab2', JSON.stringify({ sound: false }))
    try {
      window.speechSynthesis.speak = () => {}
      window.speechSynthesis.cancel = () => {}
      window.speechSynthesis.getVoices = () => []
    } catch (e) {
      /* нет Web Speech API — и не надо */
    }
    const Silent = function () {
      return {
        state: 'running', currentTime: 0, destination: {}, resume() {},
        createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: {}, type: '' }),
        createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }),
      }
    }
    window.AudioContext = Silent
    window.webkitAudioContext = Silent
  })
}

const openVocab = async (page) => {
  await silence(page)
  await page.goto('/?screen=vocab')
  await expect(page.locator('.v-setup-title')).toBeVisible()
}

// Детерминированный Math.random (mulberry32): подбор заданий в engine.js
// случайный, а тестам нужно стабильно дожидаться конкретной механики.
const SEED_FN = (s) => {
  let t = s >>> 0
  Math.random = () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const seedRandom = (page, seed = 42) => page.addInitScript(SEED_FN, seed)

// Решает один шаг текущего задания сессии — общий для потоковых тестов.
const solveOneTask = (page) =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const qa = (s) => [...document.querySelectorAll(s)]
    if (q('.v-match-wrap')) {
      const l = qa('.v-mcol:first-child .v-mcard:not(.v-ok)')[0]
      if (l) { l.click(); const r = q(`.v-mcol:last-child .v-mcard[data-id="${l.dataset.id}"]`); if (r) r.click() }
      return
    }
    if (q('.v-mem-grid')) {
      const closed = qa('.v-mem:not(.v-done)').filter((m) => !m.classList.contains('v-flip'))
      const a = closed[0]
      if (a) { a.click(); const b = closed.find((m) => m !== a && m.dataset.id === a.dataset.id); if (b) b.click() }
      return
    }
    if (q('.v-drag-imgs')) {
      const c = q('.v-wchip:not(.v-used)')
      if (c) { c.click(); const t = q(`.v-dropimg[data-id="${c.dataset.id}"]`); if (t) t.click() }
      return
    }
    if (q('.v-trace-grid')) { const t = q('.v-tnode.v-next'); if (t) t.click(); return }
    if (q('.v-tiles')) { const t = q('.v-tile:not(.v-used)'); if (t) { t.click(); return } }
    if (q('.v-pbank')) { const t = q('.v-ptile:not(.v-used)'); if (t) { t.click(); return } }
    const check = q('.v-sess-foot .v-btn:not([disabled]), .v-know-row .v-btn:not([disabled])')
    if (check) { check.click(); return }
    if (q('.v-pron-card')) { const s = qa('.v-pron-actions .v-chip').pop(); if (s) { s.click(); return } }
    if (q('.v-swipe-card')) { const y = q('.v-bucket.v-yes'); if (y) { y.click(); return } }
    const opt = q('.v-choice:not([disabled]), .v-imgtile:not([disabled])')
    if (opt) opt.click()
  })

// Старт 5-минутной сессии, все слова «не знаю» — этап 2 начинается сразу.
const startLearnPhase = async (page) => {
  await page.locator('.v-time-cell:has(b:text-is("5"))').click()
  await page.locator('.v-ob-foot .v-btn').click()
  await expect(page.locator('.v-ovw-row').first()).toBeVisible()
  await page.locator('.v-ovw-cta .v-btn').click()
  await expect(page.locator('.v-ff-word')).toBeVisible()
  for (let i = 0; i < 6; i++) {
    await page.locator('.v-btn.v-dont').click()
    await page.waitForTimeout(120)
  }
  await expect(page.locator('.v-stage .v-q-ask')).toBeVisible()
}

test.describe('Словарь — нативный экран', () => {
  test('никакого iframe: экран собран в React', async ({ page }) => {
    await openVocab(page)
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.locator('.vc')).toBeVisible()
  })

  test('настройка: уровни, режимы, акцент и время из данных прототипа', async ({ page }) => {
    await openVocab(page)
    await expect(page.locator('.v-lvl-cell')).toHaveCount(5)
    await expect(page.locator('.v-lvl-cell').first()).toContainText('A1')
    await expect(page.locator('.v-time-cell')).toHaveCount(3)
    // Кнопка показывает размер выборки уровня — A1 Essentials = 900 слов.
    await expect(page.locator('.v-ob-foot .v-btn')).toContainText('900')

    await page.locator('.v-lvl-cell', { hasText: 'B1' }).click()
    await expect(page.locator('.v-lvl-cell.v-sel')).toContainText('B1')
    await expect(page.locator('.v-ob-foot .v-btn')).toContainText('1500')
  })

  test('обзор: счётчики, порционный список и живой поиск', async ({ page }) => {
    await openVocab(page)
    await page.locator('.v-ob-foot .v-btn').click()

    // Размер выборки уровня — в счётчике-карте (900), а не в числе строк списка.
    await expect(page.locator('.v-ovw-stat.v-lvl .v-v')).toHaveText('900')
    await expect(page.locator('.v-ovw-stat.v-lvl .v-s')).toContainText('A1')

    // Список грузится порциями по 24: сразу первая страница + «Показать ещё»,
    // клик догружает следующую порцию (иначе рендер 900 строк тормозил старт).
    await expect.poll(() => page.locator('.v-ovw-row').count()).toBe(24)
    await expect(page.locator('.v-ovw-more')).toBeVisible()
    await page.locator('.v-ovw-more').click()
    await expect.poll(() => page.locator('.v-ovw-row').count()).toBe(48)

    // Живой поиск фильтрует список и сбрасывает страницу к первой.
    await page.locator('.v-ovw-search input').fill('water')
    await expect(page.locator('.v-ovw-row').first()).toContainText('water')
    await expect.poll(() => page.locator('.v-ovw-row').count()).toBeGreaterThan(0)
  })

  test('сбор карточек: переворот открывает значение и пример', async ({ page }) => {
    await openVocab(page)
    await page.locator('.v-time-cell:has(b:text-is("5"))').click() // короткая сессия
    await page.locator('.v-ob-foot .v-btn').click()
    await expect(page.locator('.v-ovw-row').first()).toBeVisible()
    await page.locator('.v-ovw-cta .v-btn').click()

    await expect(page.locator('.v-ff-word')).toBeVisible()
    await expect(page.locator('.v-sess-timer')).toHaveText('1 / 6')
    await page.locator('.v-flip').click()
    await expect(page.locator('.v-flip')).toHaveClass(/v-flipped/)
    await expect(page.locator('.v-fb-def2')).not.toBeEmpty()
    await expect(page.locator('.v-fb-ex2')).toBeVisible()
  })

  test('карточка сбора не схлопывается и её контент не наезжает', async ({ page }) => {
    // Регрессия: на скриншоте карта Шага 1 схлопывалась до ~90px, из-за чего
    // транскрипция и подсказка «Нажмите на карточку…» наезжали друг на друга.
    // Высота карты задаётся clamp(340px,56vh,540px) — не зависит от того, как
    // flex-цепочка родителя разрешит высоту, — поэтому ниже пола уйти нельзя.
    const reachCard = async () => {
      await page.locator('.v-time-cell:has(b:text-is("5"))').click()
      await page.locator('.v-ob-foot .v-btn').click()
      await expect(page.locator('.v-ovw-row').first()).toBeVisible()
      await page.locator('.v-ovw-cta .v-btn').click()
      await expect(page.locator('.v-ff-word')).toBeVisible()
    }
    const check = async (label) => {
      // Ждём конца анимации входа (v-pop scale .3s) — иначе замер попадает в
      // середину scale-трансформа. Мерим offsetHeight: это layout-высота,
      // независимая от transform, поэтому scale её не искажает.
      const m = await page
        .locator('.v-flip')
        .evaluate((el) => new Promise((r) => setTimeout(() => {
          const q = (s) => document.querySelector(s).getBoundingClientRect()
          r({ h: el.offsetHeight, ipa: q('.v-ff-ipa'), hint: q('.v-ff-hint') })
        }, 400)))
      expect(m.h, `${label}: карта не ниже пола 340px`).toBeGreaterThanOrEqual(340)
      expect(m.h, `${label}: карта не выше дизайн-потолка 540px`).toBeLessThanOrEqual(540)
      // Транскрипция (центр) и подсказка (низ) не пересекаются.
      expect(m.hint.top, `${label}: подсказка ниже транскрипции, без наезда`).toBeGreaterThan(m.ipa.bottom)
    }

    await openVocab(page)
    await reachCard()
    await check('десктоп')

    // Низкий вьюпорт (много вкладок в браузере) — карта всё равно держит пол.
    await page.setViewportSize({ width: 1280, height: 620 })
    await check('низкий вьюпорт')
  })

  test('memory: карточки пар не раздуваются за колонки сетки', async ({ page }) => {
    // Регрессия «экран приближается»: Safari выводил aspect-ratio грид-плитки
    // из растянутой высоты ряда — карточки 353×470 вместо 156×207 вылезали за
    // экран. Пропорция теперь задана паддинг-хаком (от ширины); тест держит
    // геометрию: карта = ширине колонки, сетка не шире сцены, страница без
    // горизонтального скролла. Ручная проверка движка Safari — на реальном
    // Safari 26 (Playwright WebKit баг не воспроизводит).
    test.slow()
    test.setTimeout(540_000) // до пяти коротких сессий, с запасом на параллельный прогон
    await seedRandom(page)
    await openVocab(page)

    // Групповая механика подмешивается случайно (~⅙ заданий). Охотимся за
    // memory короткими сессиями (до 40 заданий), пересеивая random перед
    // каждой: рестарт на том же потоке повторял бы «безпарную» траекторию.
    let found = false
    for (let attempt = 0; attempt < 5 && !found; attempt++) {
      await page.evaluate(SEED_FN, 1000 + attempt)
      await startLearnPhase(page)
      for (let i = 0; i < 40 && !found; i++) {
        if (await page.locator('.v-res-h').count()) break
        found = (await page.locator('.v-mem-grid').count()) > 0
        if (found) break
        await solveOneTask(page)
        await page.waitForTimeout(400)
        if (await page.locator('.v-feedback .v-btn').count()) {
          await page.locator('.v-feedback .v-btn').click()
          await page.waitForTimeout(300)
        }
      }
      if (!found) {
        // Сессия не подкинула memory — выходим крестиком (или из итогов) и заново.
        if (await page.locator('.v-res-h').count()) await page.locator('.v-res-foot .v-btn').click()
        else await page.locator('.v-sess-x').click()
        await expect(page.locator('.v-setup-title')).toBeVisible()
      }
    }
    expect(found, 'memory-задание должно встретиться за пять сессий').toBe(true)

    const m = await page.evaluate(() => {
      const r = (el) => el.getBoundingClientRect()
      const stage = r(document.querySelector('.v-stage'))
      const grid = r(document.querySelector('.v-mem-grid'))
      const card = r(document.querySelector('.v-mem'))
      return {
        iw: window.innerWidth,
        sw: document.documentElement.scrollWidth,
        stageRight: stage.right, grid: { w: grid.width, right: grid.right },
        card: { w: card.width, h: card.height },
      }
    })
    const track = (m.grid.w - 30) / 4 // 4 колонки, три зазора по 10px
    expect(Math.abs(m.card.w - track), 'карта занимает ровно свою колонку').toBeLessThanOrEqual(2)
    expect(Math.abs(m.card.h - (m.card.w * 4) / 3), 'карта держит пропорцию 3:4').toBeLessThanOrEqual(3)
    expect(m.grid.right, 'сетка не шире сцены').toBeLessThanOrEqual(m.stageRight + 1)
    expect(m.sw, 'страница без горизонтальной прокрутки').toBeLessThanOrEqual(m.iw + 1)
  })

  test('сессия: задания идут потоком, прогресс SRS сохраняется', async ({ page }) => {
    test.slow() // полная сессия из 6 слов — десятки заданий
    await openVocab(page)
    await startLearnPhase(page)
    await expect(page.locator('.v-round-name')).toContainText('0/6')

    // Проходим сессию до итогов, решая парные задания по data-id.
    const types = new Set()
    for (let i = 0; i < 160; i++) {
      if (await page.locator('.v-res-h').count()) break
      const kind = await page.evaluate(() => {
        const q = (s) => document.querySelector(s)
        if (q('.v-mem-grid')) return 'memory'
        if (q('.v-match-wrap')) return 'match'
        if (q('.v-drag-imgs')) return 'dragmatch'
        if (q('.v-ch-timer')) return 'challenge'
        if (q('.v-swipe-card')) return 'swipe'
        if (q('.v-tiles')) return 'construct'
        if (q('.v-pbank')) return 'scramble'
        if (q('.v-trace-grid')) return 'trace'
        if (q('.v-pron-card')) return 'pronounce'
        if (q('.v-imggrid')) return 'imagepick'
        if (q('.v-choice')) return 'pick'
        return null
      })
      if (kind) types.add(kind)
      await solveOneTask(page)
      await page.waitForTimeout(450)
      if (await page.locator('.v-feedback .v-btn').count()) {
        await page.locator('.v-feedback .v-btn').click()
        await page.waitForTimeout(350)
      }
    }

    // Дошли до итогов, и в них — те же 6 слов, что были в сессии.
    await expect(page.locator('.v-res-h')).toBeVisible()
    await expect(page.locator('.v-res-stat').first().locator('.v-v')).toHaveText('6')
    expect(types.size).toBeGreaterThan(2)

    // Прогресс лёг в localStorage под ключом прототипа — старые пользователи
    // не теряют накопленное при переезде с iframe.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('jts_vocab2') || '{}'))
    expect(Object.keys(saved.srs || {}).length).toBe(6)
    expect(saved.seenCount).toBe(6)
  })

  test('раскладка не разъезжается по ширине', async ({ page }) => {
    await openVocab(page)
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    expect(await fits()).toBe(true)
    await page.locator('.v-ob-foot .v-btn').click()
    await expect(page.locator('.v-ovw-row').first()).toBeVisible()
    expect(await fits()).toBe(true)
  })
})
