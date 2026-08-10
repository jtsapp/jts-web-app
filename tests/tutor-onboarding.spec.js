import { test, expect } from '@playwright/test'

// Онбординг тьютора на мобиле — регрессии на баги с реального телефона:
// маскоты вылезали из панели на кнопки выбора языка, карусель тьюторов не
// свайпалась (скроллился весь .t-content, ибо секция и сетка росли по
// контенту до ~950px), варианты профессии уезжали за левый край экрана.

test.describe('онбординг тьютора — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  test('язык: в панели карусель тьюторов, опции не перекрыты', async ({ page }) => {
    await page.goto('/?screen=tutor-lang')
    await expect(page.locator('.t-card__carousel')).toBeVisible()
    // Layout под параллельным прогоном стабилизируется не сразу.
    await page.waitForTimeout(400)
    // Статичная композиция маскотов скрыта (раньше вылезала на кнопки выбора).
    await expect(page.locator('.t-card__mascot')).toBeHidden()
    const panel = await page.locator('.t-card__panel').boundingBox()
    const carousel = await page.locator('.t-card__carousel').boundingBox()
    expect(carousel.y).toBeGreaterThanOrEqual(panel.y - 3)
    expect(carousel.y + carousel.height).toBeLessThanOrEqual(panel.y + panel.height + 3)
    // Опции языка выше панели и ничем не перекрыты.
    const lastOption = await page.locator('.t-lang__option').last().boundingBox()
    expect(lastOption.y + lastOption.height).toBeLessThanOrEqual(panel.y + 3)
  })

  // Раньше тест проверял свайп-грид .t-choose__grid со нативным scroll-snap.
  // Его заменила coverflow-карусель (TutorCarousel.jsx): слоты позиционированы
  // абсолютно и двигаются transform'ом из JS, нативного скролла у неё нет, а
  // десктопный грид на мобиле спрятан (tutor.css, @media max-width:760px).
  // Поэтому проверяем сам .t-car: грид скрыт, страница не ездит по горизонтали,
  // кнопки в экране, а drag дальше порога 40px переключает тьютора.
  test('выбор тьютора: карусель свайпается со снапом внутри экрана', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-choose')
    const car = page.locator('.t-car')
    await expect(car).toBeVisible()
    await expect(page.locator('.t-choose__grid')).toBeHidden()

    // Сцена шире вьюпорта на ±16px (соседи выглядывают за края), но это
    // обрезается — горизонтального скролла у страницы быть не должно.
    const doc = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    }))
    expect(doc.sw).toBeLessThanOrEqual(doc.iw)

    // Обе кнопки целиком в экране (инцидент: уезжали под адресную строку).
    for (const sel of ['.t-car__listen', '.t-car__choose']) {
      const box = await page.locator(sel).boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    }

    const name = () => page.locator('.t-car__name').innerText()
    const first = await name()

    // Drag влево на 120px — заметно больше порога 40px в onEnd. steps обязательны:
    // без промежуточных mousemove обработчик не накопит смещение.
    const stage = await page.locator('.t-car__stage').boundingBox()
    const y = stage.y + stage.height / 2
    await page.mouse.move(stage.x + stage.width * 0.7, y)
    await page.mouse.down()
    await page.mouse.move(stage.x + stage.width * 0.7 - 120, y, { steps: 10 })
    await page.mouse.up()

    // 340ms — transition слота, плюс столько же на тихий возврат индекса в
    // среднюю копию списка (бесконечный цикл в TutorCarousel).
    await page.waitForTimeout(800)
    expect(await name()).not.toBe(first)
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

  test('welcome: плашка с тьюторами — свайп-карусель', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    const car = page.locator('.t-card__carousel')
    await expect(car).toBeVisible()
    await expect(car.locator('.t-card__slide')).toHaveCount(3)
    const size = await car.evaluate((el) => ({ cw: el.clientWidth, sw: el.scrollWidth }))
    expect(size.sw).toBeGreaterThan(size.cw)
    await car.evaluate((el) => el.scrollBy({ left: 250, behavior: 'smooth' }))
    await page.waitForTimeout(700)
    expect(await car.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
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
  })
})

// Визитка тьютора («Послушать голос X») — одна и та же фраза у всех и на много
// нажатий, поэтому она лежит готовым файлом в public/tutor/voice, а не
// синтезируется каждый раз. Вьюпорт тут ни при чём, поэтому свой describe без
// мобильного skip.
test.describe('выбор тьютора — образец голоса', () => {
  test('играет готовый файл, а не живой синтез', async ({ page }) => {
    await page.goto('/?screen=tutor-choose')
    // Два макета: на мобиле карусель (.t-car__listen), на десктопе грид
    // карточек (.t-tcard__listen). Второй скрыт под 760px, первый — над.
    const listen = page.locator('.t-car__listen:visible, .t-tcard__listen:visible').first()
    await expect(listen).toBeVisible()

    const requests = []
    page.on('request', (r) => {
      const u = r.url()
      if (u.includes('/api/tutor-tts') || u.includes('/tutor/voice/')) requests.push(u)
    })

    // play() в headless может отклониться политикой автоплея — нам важен сам
    // факт похода за файлом, а не то, доиграл ли он до конца.
    await listen.click()
    await page.waitForTimeout(1200)

    // Как только кнопка снова начнёт дёргать /api/tutor-tts, за каждое нажатие
    // опять пойдут деньги провайдеру и сетевая задержка на первом же экране
    // знакомства — тест сторожит именно это.
    expect(requests.some((u) => u.includes('/tutor/voice/'))).toBe(true)
    expect(requests.some((u) => u.includes('/api/tutor-tts'))).toBe(false)
  })
})
