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
  await expect(page.locator('.v-lvl-cell').first()).toBeVisible()
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
  page.evaluate(async () => {
    const q = (s) => document.querySelector(s)
    const qa = (s) => [...document.querySelectorAll(s)]
    if (q('.v-match-wrap')) {
      const l = qa('.v-mcol:first-child .v-mcard:not(.v-ok)')[0]
      if (l) { l.click(); const r = q(`.v-mcol:last-child .v-mcard[data-id="${l.dataset.id}"]`); if (r) r.click() }
      return
    }
    if (q('.v-mem-grid')) {
      const free = qa('.v-mem:not(.v-done)')
      const a = free[0]
      if (a) {
        a.click()
        // React 19 флашит клик-апдейты в микротаске: без паузы второй клик
        // ловит устаревший обработчик, где первая карточка ещё не выбрана.
        await Promise.resolve()
        const b = free.find((m) => m !== a && m.dataset.id === a.dataset.id)
        if (b) b.click()
      }
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
  test('сначала Oxford, словарь уроков — отдельный раздел', async ({ page }) => {
    await silence(page)
    await page.goto('/?screen=vocab')
    await expect(page.locator('.v-lvl-cell').first()).toBeVisible()
    await expect(page.locator('.v-lessons-link')).toBeVisible()
    await expect(page.locator('.v-lv-card')).toHaveCount(0)
    await page.locator('.v-lessons-link').click()
    await expect(page.locator('.v-setup-title')).toContainText(/Словарь уроков|Lesson vocabulary|Сабақ/)
  })

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

  test('тапы по интерфейсу беззвучны, фидбек-звуки живы', async ({ page }) => {
    // Щелчок sfx('tap') на каждое нажатие выпилен. Осталась озвучка слов и
    // звуки фидбека (reveal/good/bad) — у них есть тумблер в сессии. Звук в
    // настройках НЕ выключаем: считающая заглушка WebAudio меряет осцилляторы.
    await page.addInitScript(() => {
      window.__osc = 0
      const Counting = function () {
        return {
          state: 'running', currentTime: 0, destination: {}, resume() {},
          createOscillator: () => {
            window.__osc += 1
            return { connect() {}, start() {}, stop() {}, frequency: {}, type: '' }
          },
          createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }),
        }
      }
      window.AudioContext = Counting
      window.webkitAudioContext = Counting
      try {
        window.speechSynthesis.speak = () => {}
        window.speechSynthesis.cancel = () => {}
        window.speechSynthesis.getVoices = () => []
      } catch (e) {
        /* нет Web Speech API — и не надо */
      }
    })
    await page.goto('/?screen=vocab')
    await expect(page.locator('.v-setup-title')).toBeVisible()

    // Прокликиваем настройку и первую карточку сбора — тишина.
    await page.locator('.v-lvl-cell', { hasText: 'B1' }).click()
    await page.locator('.v-lvl-cell', { hasText: 'A1' }).click()
    await page.locator('.v-time-cell:has(b:text-is("5"))').click()
    await page.locator('.v-ob-foot .v-btn').click()
    await expect(page.locator('.v-ovw-row').first()).toBeVisible()
    await page.locator('.v-ovw-cta .v-btn').click()
    await expect(page.locator('.v-ff-word')).toBeVisible()
    await page.locator('.v-flip').click()
    await expect(page.locator('.v-flip')).toHaveClass(/v-flipped/)
    await page.locator('.v-btn.v-dont').click()
    await expect(page.locator('.v-sess-timer')).toHaveText('2 / 6')
    expect(await page.evaluate(() => window.__osc), 'тапы не запускают осцилляторы').toBe(0)

    // «Я знаю» играет reveal — заглушка рабочая, фидбек-звук не задет.
    await page.locator('.v-btn.v-green').click()
    await expect.poll(() => page.evaluate(() => window.__osc), { message: 'reveal слышен' }).toBeGreaterThan(0)
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

  test('memory: карточки открыты сразу, фидбек — цветом обводки, геометрия не плывёт', async ({ page }) => {
    // Пары «слово/перевод» без рубашек: слова видны сразу (никаких 💬 и
    // переворотов), размер карточки одинаков во всех состояниях, а фидбек —
    // только цветом обводки: v-sel — выбор, v-done — верно, v-no — промах.
    // Заодно держим геометрию времён регрессии «экран приближается» в Safari:
    // карта = ширине колонки, сетка не шире сцены, страница без
    // горизонтального скролла.
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
        if (await page.locator('.lt-res').count()) break
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
        if (await page.locator('.lt-res').count()) await page.locator('.lt-ghost').click()
        else await page.locator('.v-sess-x').click()
        await expect(page.locator('.v-setup-title')).toBeVisible()
      }
    }
    expect(found, 'memory-задание должно встретиться за пять сессий').toBe(true)

    // Доска: слова видны сразу, рубашек и flip-обвязки в DOM больше нет.
    const board = await page.evaluate(() => {
      const r = (el) => el.getBoundingClientRect()
      const stage = r(document.querySelector('.v-stage'))
      const gridEl = document.querySelector('.v-mem-grid')
      const grid = r(gridEl)
      return {
        iw: window.innerWidth,
        sw: document.documentElement.scrollWidth,
        stageRight: stage.right,
        grid: { w: grid.width, right: grid.right },
        cols: getComputedStyle(gridEl).gridTemplateColumns.split(' ').length,
        shirts: document.querySelectorAll('.v-mem-inner, .v-mem-back, .v-mem.v-flip').length,
        cards: [...document.querySelectorAll('.v-mem')].map((el) => ({
          txt: el.textContent.trim(),
          w: r(el).width,
          h: r(el).height,
        })),
      }
    })
    expect(board.shirts, 'рубашек и переворотов больше нет').toBe(0)
    expect(board.cards.length).toBeGreaterThanOrEqual(6)
    for (const c of board.cards) expect(c.txt, 'слово видно сразу').not.toBe('')

    // Открытым словам тесно в 4 колонках узкого экрана — там пары в 2 колонки.
    expect(board.cols, 'колонки по вьюпорту').toBe(page.viewportSize().width <= 640 ? 2 : 4)
    const track = (board.grid.w - (board.cols - 1) * 10) / board.cols // зазоры по 10px
    for (const c of board.cards) {
      expect(Math.abs(c.w - track), 'карта занимает ровно свою колонку').toBeLessThanOrEqual(2)
      expect(Math.abs(c.h - board.cards[0].h), 'все карточки одной высоты').toBeLessThanOrEqual(1)
    }
    expect(board.grid.right, 'сетка не шире сцены').toBeLessThanOrEqual(board.stageRight + 1)
    expect(board.sw, 'страница без горизонтальной прокрутки').toBeLessThanOrEqual(board.iw + 1)

    // Дальше читаем цвет обводки сразу после кликов. У рамки transition 150мс,
    // поэтому включаем reduced motion (vocab.css схлопывает переходы до .01мс)
    // и ждём два кадра — цвет гарантированно долетел до целевого.
    await page.emulateMedia({ reducedMotion: 'reduce' })

    // Промах: клики и чтение состояния в одном evaluate — классы React ставит
    // синхронно, а красная подсветка сама гаснет через 380 мс.
    const miss = await page.evaluate(async () => {
      const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const size = (el) => {
        const r = el.getBoundingClientRect()
        return { w: r.width, h: r.height }
      }
      const free = [...document.querySelectorAll('.v-mem:not(.v-done)')]
      const a = free[0]
      const b = free.find((x) => x.dataset.id !== a.dataset.id)
      const before = [size(a), size(b)]
      a.click()
      await settle() // React 19: клик-апдейты долетают до DOM в микротаске
      const selPicked = a.classList.contains('v-sel')
      const selColor = getComputedStyle(a).borderTopColor
      b.click()
      await settle()
      return {
        selPicked,
        selColor,
        red: [a, b].map((el) => el.classList.contains('v-no')),
        redColor: getComputedStyle(a).borderTopColor,
        after: [size(a), size(b)],
        before,
      }
    })
    expect(miss.selPicked, 'выбранная карточка помечена v-sel').toBe(true)
    expect(miss.selColor, 'обводка выбора — фиолетовая (--violet)').toBe('rgb(144, 71, 255)')
    expect(miss.red, 'обе карточки промаха — с красной обводкой').toEqual([true, true])
    expect(miss.redColor, 'обводка промаха — красная (--red)').toBe('rgb(229, 103, 95)')
    expect(miss.after, 'размеры карточек при промахе не изменились').toEqual(miss.before)
    await expect(page.locator('.v-mem.v-no'), 'красная подсветка гаснет сама').toHaveCount(0)

    // Верная пара: обе карточки — с зелёной обводкой, размеры прежние.
    const hit = await page.evaluate(async () => {
      const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const size = (el) => {
        const r = el.getBoundingClientRect()
        return { w: r.width, h: r.height }
      }
      const free = [...document.querySelectorAll('.v-mem:not(.v-done)')]
      const a = free[0]
      const b = free.find((x) => x !== a && x.dataset.id === a.dataset.id)
      const before = [size(a), size(b)]
      a.click()
      await settle() // иначе клик по паре попадает в устаревший обработчик
      b.click()
      await settle()
      return {
        green: [a, b].map((el) => el.classList.contains('v-done')),
        greenColor: getComputedStyle(a).borderTopColor,
        after: [size(a), size(b)],
        before,
      }
    })
    expect(hit.green, 'верная пара — с зелёной обводкой').toEqual([true, true])
    expect(hit.greenColor, 'обводка верной пары — зелёная (--green)').toBe('rgb(52, 168, 83)')
    expect(hit.after, 'размеры карточек при верной паре не изменились').toEqual(hit.before)
  })

  test('сессия: задания идут потоком, прогресс SRS сохраняется', async ({ page }) => {
    test.slow() // полная сессия из 6 слов — десятки заданий
    await openVocab(page)
    await startLearnPhase(page)
    await expect(page.locator('.v-round-name')).toContainText('0/6')

    // Проходим сессию до итогов, решая парные задания по data-id.
    const types = new Set()
    let challengeChecked = false
    for (let i = 0; i < 160; i++) {
      if (await page.locator('.lt-res').count()) break
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
      if (kind === 'challenge' && !challengeChecked) {
        challengeChecked = true
        // Регрессия: сессия ре-рендерится каждую секунду (общий таймер), и
        // финальный раунд перетасовывал пул на каждый тик — слово и варианты
        // подменялись через ~секунду. Вопрос обязан жить весь свой таймер
        // (6–7 с): за 2,5 с ни слово, ни варианты меняться не должны.
        const snap = () =>
          page.evaluate(() => ({
            word: document.querySelector('.v-stage .v-card').textContent,
            opts: [...document.querySelectorAll('.v-choice')].map((b) => b.textContent),
          }))
        const before = await snap()
        await page.waitForTimeout(2500)
        expect(await snap(), 'вопрос финального раунда не подменяется на тиках таймера').toEqual(before)
      }
      await solveOneTask(page)
      await page.waitForTimeout(450)
      if (await page.locator('.v-feedback .v-btn').count()) {
        await page.locator('.v-feedback .v-btn').click()
        await page.waitForTimeout(350)
      }
    }

    // Дошли до итогов — теперь это общий с аудированием экран (lt-res):
    // маскот, процент и счётчики верных/неверных вместо старого 🎉-экрана.
    await expect(page.locator('.lt-res')).toBeVisible()
    expect(challengeChecked, 'финальный раунд встретился и проверен').toBe(true)
    await expect(page.locator('.lt-res__pct')).toHaveText(/^\d+%$/)
    await expect(page.locator('.lt-res__stat')).toHaveCount(2)
    await expect(page.locator('.lt-res__num').nth(0)).toContainText(/\d/)
    await expect(page.locator('.lt-res__num').nth(1)).toContainText(/\d/)
    expect(types.size).toBeGreaterThan(2)

    // Прогресс лёг в localStorage под ключом прототипа — старые пользователи
    // не теряют накопленное при переезде с iframe.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('jts_vocab2') || '{}'))
    expect(Object.keys(saved.srs || {}).length).toBe(6)
    expect(saved.seenCount).toBe(6)

    // «Попробовать ещё раз» перезапускает тренировку: свежий набор карточек.
    await page.locator('.lt-primary').click()
    await expect(page.locator('.v-ff-word')).toBeVisible()
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
