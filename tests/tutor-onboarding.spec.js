import { test, expect } from '@playwright/test'
import { FRESH_PROFILE, signIn } from './tour-helper.js'

// Здесь проверяется в том числе сам тур дашборда — значит, профиль чистый:
// прогон целиком идёт с погашенными турами (storageState в playwright.config.js).
test.use(FRESH_PROFILE)

// Онбординг тьютора на мобиле — регрессии на баги с реального телефона:
// маскоты вылезали из панели на кнопки выбора языка, карусель тьюторов не
// свайпалась (скроллился весь .t-content, ибо секция и сетка росли по
// контенту до ~950px), варианты профессии уезжали за левый край экрана.

test.describe('онбординг тьютора — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  // Макет «Web Адаптивка» (кадр 4338:1515) вернул на телефон группу маскотов
  // вместо карусели тьюторов. Регрессия прежняя: группа не должна вылезать из
  // панели на кнопки выбора языка — её держит overflow панели.
  test('язык: в панели группа маскотов, опции не перекрыты', async ({ page }) => {
    await page.goto('/?screen=tutor-lang')
    await expect(page.locator('.t-card__mascot')).toBeVisible()
    await expect(page.locator('.t-card__carousel')).toBeHidden()
    // Layout под параллельным прогоном стабилизируется не сразу.
    await page.waitForTimeout(400)
    const panel = await page.locator('.t-card__panel').boundingBox()
    await expect(page.locator('.t-card__panel')).toHaveCSS('overflow', 'hidden')
    const mascot = await page.locator('.t-card__mascot').boundingBox()
    expect(mascot.y).toBeGreaterThanOrEqual(panel.y - 3)
    expect(mascot.y + mascot.height).toBeLessThanOrEqual(panel.y + panel.height + 3)
    // Опции языка — под панелью (как в кадре) и ничем не перекрыты.
    const firstOption = await page.locator('.t-lang__option').first().boundingBox()
    expect(firstOption.y).toBeGreaterThanOrEqual(panel.y + panel.height - 3)
  })

  // Приветствие и выбор тьютора — один экран и на телефоне (кадр «Mobile»
  // 6132:5848, 27.10.2026): баннер, под ним сетка карточек 2×2. Регрессии —
  // горизонтальный скролл страницы и карточки за краем экрана; у выделенного под
  // сеткой описание и «Послушать голос» (их раньше давала карусель), а выбор
  // уходит дальше по онбордингу.
  test('выбор тьютора: сетка в экране, выделенный с описанием, выбор ведёт дальше', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-welcome')
    await expect(page.locator('.t-pick__row')).toBeVisible()
    await expect(page.locator('.t-car')).toHaveCount(0)
    await page.waitForTimeout(400)

    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(sw).toBeLessThanOrEqual(viewport.width)
    for (const card of await page.locator('.t-pick__card').all()) {
      const box = await card.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    }
    // Пока никого не выделили, описания нет; у карточки — подпись под именем.
    await expect(page.locator('.t-pick__about')).toHaveCount(0)
    await expect(page.locator('.t-pick__card', { hasText: 'Декстер' }).locator('.t-pick__tag')).toHaveText(
      'Путеводитель и тьютор',
    )

    await page.locator('.t-pick__card', { hasText: 'Декстер' }).click()
    await expect(page.locator('.t-pick__card.is-picked .t-pick__check')).toBeVisible()
    await expect(page.locator('.t-pick__desc')).toContainText('Декстер')
    await expect(page.locator('.t-pick__listen')).toHaveText('Послушать голос Декстера')

    await page.locator('.t-pick__card', { hasText: 'Спарк' }).first().click()
    await expect(page.locator('.t-pick__listen')).toHaveText('Послушать голос Спарка')

    // Выбор: дальше язык, затем загрузка с выбранным тьютором.
    await page.locator('.t-pick__start').click()
    await page.locator('.t-lang__option', { hasText: 'Русский' }).click()
    await expect(page.locator('.t-status__name')).toHaveText('Спарк')
  })

  test('профессия: поле и варианты во всю ширину, ввод работает', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-profession')
    const opts = page.locator('.t-prof__opt')
    await expect(opts.first()).toBeVisible()
    for (const box of await Promise.all([
      page.locator('.t-prof__input').boundingBox(),
      opts.first().boundingBox(),
      opts.last().boundingBox(),
    ])) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    }
    await page.locator('.t-prof__input input').fill('Инженер-программист')
    await expect(page.locator('.t-prof__input input')).toHaveValue('Инженер-программист')
    await opts.nth(1).click()
    await expect(opts.nth(1)).toHaveClass(/is-picked/)
  })
})

// Тур по дашборду: раньше поповер ехал вместе со скроллом (обёртка .scr-in с
// transform ломала position: fixed), ложился на подсвеченный элемент и резался
// краем экрана, а страница свободно скроллилась под туром.
test.describe('онбординг-тур по дашборду', () => {
  test('поповер в экране, не накрывает подсветку, скролл заперт', async ({ page, viewport }) => {
    await signIn(page)
    await page.goto('/?screen=tutor-profession')
    // «Пропустить вопрос» ведёт через экран анализа на дашборд с туром.
    await page.locator('button', { hasText: 'Пропустить' }).first().click()
    // Тур вида «Главной» начинается приветствием — шаги после «Показать».
    await page.locator('.t-tour__intro-go').click({ timeout: 20000 })
    await page.waitForSelector('.t-tour__pop', { timeout: 20000 })

    for (let step = 0; ; step++) {
      await page.waitForTimeout(600) // дожидаемся transition поповера
      const { pop, hole, overlap } = await page.evaluate(() => {
        const pop = document.querySelector('.t-tour__pop').getBoundingClientRect()
        const hole = document.querySelector('.t-tour__hole')?.getBoundingClientRect()
        const overlap =
          hole &&
          !(pop.right < hole.left || pop.left > hole.right || pop.bottom < hole.top || pop.top > hole.bottom)
        return { pop: { t: pop.top, b: pop.bottom, l: pop.left, r: pop.right }, hole: Boolean(hole), overlap }
      })
      expect(pop.t, `шаг ${step + 1}: поповер вылез за верх`).toBeGreaterThanOrEqual(0)
      expect(pop.b, `шаг ${step + 1}: поповер вылез за низ`).toBeLessThanOrEqual(viewport.height + 1)
      expect(pop.l).toBeGreaterThanOrEqual(0)
      expect(pop.r).toBeLessThanOrEqual(viewport.width + 1)
      expect(hole, `шаг ${step + 1}: нет прожектора`).toBe(true)
      expect(overlap, `шаг ${step + 1}: поповер накрывает подсвеченный элемент`).toBe(false)

      // Кнопка «ОК/Готово» реально видима: портал в body лишал её переменных
      // темы — фон становился прозрачным, белый текст «исчезал» на белом.
      const okBg = await page
        .locator('.t-tour__ok')
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(okBg, `шаг ${step + 1}: у кнопки прозрачный фон`).not.toBe('rgba(0, 0, 0, 0)')

      // Скролл страницы под туром заперт.
      const y0 = await page.evaluate(() => scrollY)
      await page.mouse.move(195, 420)
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(250)
      expect(await page.evaluate(() => scrollY)).toBe(y0)

      const isLast = (await page.locator('.t-tour__acts.is-last').count()) > 0
      await page.locator('.t-tour__ok').click()
      if (isLast) break
    }

    // Тур закрыт, скролл разлочен.
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')

    // Тур одноразовый. Смена тьютора («Управление тьютором» → «Сменить») гоняет
    // ту же онбординг-цепочку, на конце которой он включается, — раньше он
    // выходил заново после каждого выбора, потому что отметку никто не писал.
    await page.goto('/?screen=tutor-profession')
    await page.locator('button', { hasText: 'Пропустить' }).first().click()
    await page.waitForSelector('.t-dash', { timeout: 20000 })
    await page.waitForTimeout(600)
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
  })
})

// Поток нового экрана: выделил тьютора → «Начать обучение» → выбор языка →
// загрузка с этим тьютором. Раньше кнопки «Выбрать» стояли на каждой карточке;
// теперь кнопка одна, в баннере, и работает только с выделенным. Это десктоп
// (ряд фигурок); на телефоне та же сетка — с 27.10.2026 и там без карусели.
test.describe('выбор тьютора — поток', () => {

  test('без выделения кнопка никуда не ведёт, с выделением — на язык, затем загрузка', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    const start = page.locator('.t-pick__start')
    await start.click()
    await expect(page.locator('.t-pick')).toBeVisible()

    await page.locator('.t-pick__card', { hasText: 'Спарк' }).first().click()
    await start.click()
    await expect(page.locator('.t-lang__option').first()).toBeVisible()

    await page.locator('.t-lang__option', { hasText: 'Русский' }).click()
    await expect(page.locator('.t-status__name')).toHaveText('Спарк')
  })
})

// Онбординг укорочен 18.10.2026: после подстройки — только интересы, и сразу
// разговор. Теста разговорного и вопроса «кем работаешь» в первом проходе нет.
test.describe('онбординг тьютора — интересы и сразу разговор', () => {

  // Старт с выбора тьютора, а не диплинком на язык: выбор помечает онбординг
  // пройденным, и только тогда «Назад» из звонка ведёт на дашборд.
  test('выбор → язык → подстройка → интересы → звонок; «Назад» — на дашборд', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    const start = page.locator('.t-pick__start')
    await start.click()
    await page.locator('.t-pick__card', { hasText: 'Спарк' }).first().click()
    await start.click()
    await page.locator('.t-lang__option', { hasText: 'Русский' }).click()

    // Подстройка сама уходит дальше — на интересы, а не на предложение теста.
    await expect(page.locator('.t-interests__chips')).toBeVisible({ timeout: 20000 })
    await expect(page).toHaveURL(/screen=tutor-interests/)

    await page.locator('.t-topic').first().click()
    await page.locator('button', { hasText: 'Продолжить' }).click()
    await expect(page).toHaveURL(/screen=tutor-voice-chat/)
    await expect(page.locator('.t-micperm')).toBeVisible()

    // Опрос позади: «Назад» не возвращает в интересы. Кнопку накрывает окно
    // запроса микрофона, поэтому нажатие — событием.
    await page.locator('.t-back:visible').first().dispatchEvent('click')
    await expect(page).toHaveURL(/screen=tutor-dashboard/)
    await expect(page.locator('.t-dash__orb')).toBeVisible()
  })
})
