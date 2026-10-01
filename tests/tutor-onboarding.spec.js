import { test, expect } from '@playwright/test'
import { FRESH_PROFILE } from './tour-helper.js'

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

  // Приветствие и выбор тьютора — один экран, но на телефоне (макет «Web
  // Адаптивка», кадры 4338:1182 и 4338:1568) это два шага: баннер, а по его
  // кнопке — карусель. Карусель шире экрана (соседи выглядывают из-за краёв),
  // поэтому главная регрессия — горизонтальный скролл страницы и съехавшая
  // лента; вторая — что выбор из карусели уходит дальше по онбордингу.
  test('выбор тьютора: карусель в экране, листается, выбор ведёт дальше', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-welcome')
    await expect(page.locator('.t-pick__row')).toBeHidden()
    await page.locator('.t-pick__start').click()

    const name = page.locator('.t-car__info.is-current .t-car__name')
    const center = page.locator('.t-car__slot.is-center')
    const choose = page.locator('.t-car__choose')
    // Открывается на Декстере (центр кадра), слева Луна, справа Спарк.
    await expect(name).toHaveText('Декстер')
    await expect(page.locator('.t-pick__hero')).toHaveCount(0)
    await page.waitForTimeout(400)

    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(sw).toBeLessThanOrEqual(viewport.width)
    for (const loc of [
      center,
      name,
      page.locator('.t-car__info.is-current .t-car__chips'),
      page.locator('.t-car__info.is-current .t-car__desc'),
      page.locator('.t-car__listen'),
      choose,
    ]) {
      const box = await loc.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    }
    // Центральный аватар — ровно посередине экрана.
    const c0 = await center.boundingBox()
    expect(Math.abs(c0.x + c0.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1)
    await expect(choose).toBeInViewport()
    await expect(choose).toHaveText('Выбрать Декстера')

    // Тап по соседу. Сосед частично за краем, и тап даёт ему фокус — лента
    // не должна съехать вслед за фокусом (overflow: clip у сцены).
    await page.locator('.t-car__slot.is-center + .t-car__slot').click()
    await expect(name).toHaveText('Спарк')
    await page.waitForTimeout(500)
    const c1 = await center.boundingBox()
    expect(Math.abs(c1.x + c1.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1)

    // Свайп вправо — назад к Декстеру; короткий сдвиг не листает.
    const drag = async (from, to) => {
      const y = c1.y + c1.height / 2
      await page.mouse.move(from, y)
      await page.mouse.down()
      await page.mouse.move(to, y, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(450)
    }
    await drag(120, 300)
    await expect(name).toHaveText('Декстер')
    await drag(200, 220)
    await expect(name).toHaveText('Декстер')
    await drag(300, 120)
    await expect(name).toHaveText('Спарк')

    // Выбор: дальше язык, затем загрузка с выбранным тьютором.
    await choose.click()
    await page.locator('.t-lang__option', { hasText: 'Русский' }).click()
    await expect(page.locator('.t-status__name')).toHaveText('Спарк')
  })

  // «Назад» с карусели возвращает к баннеру, а не уводит с экрана.
  test('выбор тьютора: «Назад» с карусели — к баннеру', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    await page.locator('.t-pick__start').click()
    await expect(page.locator('.t-car')).toBeVisible()
    await page.locator('.mtop .t-back').click()
    await expect(page.locator('.t-pick__title')).toBeVisible()
    await expect(page.locator('.t-car')).toHaveCount(0)
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
    await page.goto('/?screen=tutor-profession')
    // «Пропустить вопрос» ведёт через экран анализа на дашборд с туром.
    await page.locator('button', { hasText: 'Пропустить' }).first().click()
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

      const isLast = (await page.locator('.t-tour__count').textContent()).startsWith('2/')
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
// (ряд фигурок); на телефоне выбор в карусели — её поток проверен выше.
test.describe('выбор тьютора — поток', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 560, 'на телефоне вместо ряда карусель')

  test('без выделения кнопка никуда не ведёт, с выделением — на язык, затем загрузка', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    const start = page.locator('.t-pick__start')
    await start.click()
    await expect(page.locator('.t-pick')).toBeVisible()

    await page.locator('.t-pick__card', { hasText: 'Спарк' }).click()
    await start.click()
    await expect(page.locator('.t-lang__option').first()).toBeVisible()

    await page.locator('.t-lang__option', { hasText: 'Русский' }).click()
    await expect(page.locator('.t-status__name')).toHaveText('Спарк')
  })
})
