import { test, expect } from '@playwright/test'

// Раздел «Грамматика» в Практике: каталог (уровни/поиск/секции), урок
// (Теория → Примеры → Практика) и движок упражнений.
//
// Контент и логика перенесены из грамматика_практика.html
// (public/practice/grammar/*.json, см. scripts/extract-grammar.js), поэтому
// правильные ответы берём из тех же данных — тест ломается, если порт движка
// разойдётся с источником.

const openCatalog = async (page) => {
  await page.goto('/?screen=practice')
  await page.locator('.pp-chip', { hasText: 'Грамматика' }).click()
  await expect(page.locator('.gr-catalog .gr-gcard').first()).toBeVisible()
}

const openUnit1 = async (page) => {
  await openCatalog(page)
  await page.locator('.gr-catalog .gr-gcard').first().click()
  await expect(page.locator('.gr-block').first()).toBeVisible()
}

const a1Activities = (page) =>
  page.evaluate(async () => {
    const d = await (await fetch('/practice/grammar/a1.json')).json()
    return d.units['1'].activities
  })

// Отвечает верно на текущее задание (ответ берём из данных источника).
async function answerCorrectly(page, a) {
  if (a.type === 'categorize') {
    for (const item of a.items) {
      await page.locator('.gr-cat-item', { hasText: new RegExp(`^${item.t}$`) }).click()
      await page
        .locator('.gr-bucket', { has: page.locator(`.gr-bucket__h:text-is("${a.buckets[item.b]}")`) })
        .click()
    }
  } else if (a.type === 'truefalse') {
    for (let k = 0; k < a.items.length; k++) {
      await page.locator('.gr-tf-row').nth(k).locator('button').nth(a.items[k].ok ? 0 : 1).click()
    }
  } else if (a.type === 'gap' || a.type === 'transform' || a.type === 'dictation') {
    await page.locator('.gr-gap-input').fill(a.answer)
    await page.locator('.gr-check').click()
  } else if (a.type === 'mc') {
    await page.locator('.gr-opt').nth(a.answer).click()
    await page.locator('.gr-check').click()
  } else if (a.type === 'error') {
    await page.locator('.gr-eword').nth(a.wrong).click()
    await page.locator('.gr-check').click()
  } else if (a.type === 'order') {
    for (const w of a.answer) {
      await page.locator('.gr-bank .gr-word', { hasText: new RegExp(`^${w}$`) }).first().click()
    }
    await page.locator('.gr-check').click()
  } else if (a.type === 'dialogue') {
    // Живой чат: варианты появляются после того, как бот «допечатал». На каждом
    // шаге дожидаемся вариантов и выбираем верную реплику (o.ok из данных).
    const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, '').trim()
    const okTexts = new Set(
      a.steps.flatMap((st) => st.options.filter((o) => o.ok).map((o) => stripHtml(o.t))),
    )
    for (let guard = 0; guard < a.steps.length + 3; guard++) {
      if (await page.locator('.gr-fb.show').isVisible()) break
      await page
        .locator('.gr-dlg-opts .gr-opt')
        .first()
        .waitFor({ state: 'visible', timeout: 6000 })
        .catch(() => {})
      const opts = page.locator('.gr-dlg-opts .gr-opt')
      const n = await opts.count()
      if (n === 0) break
      let clicked = false
      for (let si = 0; si < n; si++) {
        if (okTexts.has((await opts.nth(si).textContent()).trim())) {
          await opts.nth(si).click()
          clicked = true
          break
        }
      }
      if (!clicked) await opts.first().click()
      // ждём реакцию: следующие варианты или итоговый фидбек
      await page
        .locator('.gr-dlg-opts .gr-opt, .gr-fb.show')
        .first()
        .waitFor({ timeout: 6000 })
        .catch(() => {})
    }
  } else {
    throw new Error(`answerCorrectly: тип ${a.type} не поддержан`)
  }
  await expect(page.locator('.gr-fb')).toBeVisible()
}

// Проходит задания до индекса target, отвечая верно на предыдущие.
async function advanceTo(page, acts, target) {
  for (let i = 0; i < target; i++) {
    const cur = parseInt(await page.locator('.gr-act__count').textContent()) - 1
    if (cur >= target) return
    await answerCorrectly(page, acts[cur])
    await page.locator('.gr-next').click()
  }
  await expect(page.locator('.gr-act__count')).toHaveText(`${target + 1} / ${acts.length}`)
}

test.describe('Грамматика — каталог', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 760, 'каталог проверяем на десктопе')

  test('уровни A1–C2, секции с диапазоном юнитов и карточки', async ({ page }) => {
    await openCatalog(page)

    await expect(page.locator('.gr-levelchip')).toHaveCount(6)
    await expect(page.locator('.gr-levelchip.on')).toHaveText('Уровень A1')

    // Первая секция курса A1 — Present, юниты 1-9 (данные источника).
    const firstSection = page.locator('.gr-catalog .pp-sec').first()
    await expect(firstSection.locator('h2')).toContainText('Present')
    await expect(firstSection.locator('.gr-unitpill')).toHaveText('Unit 1-9')

    // Карточка: тема на обложке + «Unit N» + описание из данных.
    // Обложка курса: номер, лого, название темы и секция; в теле — Unit N и время.
    const card = page.locator('.gr-catalog .gr-gcard').first()
    await expect(card.locator('.gr-cov-no')).toHaveText('01')
    await expect(card.locator('.gr-cov-ttl')).toHaveText('am / is / are')
    await expect(card.locator('.gr-cov-tag')).toHaveText('Present')
    await expect(card.locator('.gr-cov-wm')).toHaveText('Just to Study')
    await expect(card.locator('.gr-unit-no')).toHaveText('Unit 1')
    await expect(card.locator('.gr-gcard__t')).toContainText('m')
    await expect(card.locator('.gr-gcard__desc')).not.toBeEmpty()
  })

  test('поиск фильтрует юниты, переключение уровня меняет секции', async ({ page }) => {
    await openCatalog(page)
    const all = await page.locator('.gr-catalog .gr-gcard').count()

    await page.locator('.gr-search input').fill('continuous')
    await expect.poll(() => page.locator('.gr-catalog .gr-gcard').count()).toBeLessThan(all)
    await expect(page.locator('.gr-catalog .gr-gcard').first()).toBeVisible()

    await page.locator('.gr-search input').fill('')
    await page.locator('.gr-levelchip', { hasText: 'Уровень A2' }).click()
    await expect(page.locator('.gr-levelchip.on')).toHaveText('Уровень A2')
    await expect(page.locator('.gr-catalog .pp-sec h2').first()).toContainText('Present tenses')
  })

  test('C2 в дизайне есть, но курса в источнике нет — показываем «скоро»', async ({ page }) => {
    await openCatalog(page)
    await page.locator('.gr-levelchip', { hasText: 'Уровень C2' }).click()
    await expect(page.locator('.gr-empty')).toContainText('скоро')
  })

  test('рейл «Грамматика» в общем виде ведёт в каталог', async ({ page }) => {
    await page.goto('/?screen=practice')
    const rail = page.locator('.pp-sec', { has: page.locator('h2:text("Грамматика")') })
    await expect(rail.locator('.gr-levelpill')).toContainText('Уровень')
    await rail.locator('.pp-all').click()
    await expect(page.locator('.gr-catalog .gr-levels')).toBeVisible()
  })
})

test.describe('Грамматика — урок', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 760, 'урок проверяем на десктопе')

  test('теория листается каруселью, перевод показан по языку интерфейса', async ({ page }) => {
    await openUnit1(page)

    await expect(page.locator('.gr-lesson__crumb b')).toHaveText('Unit 1')
    await expect(page.locator('.gr-tab.on')).toHaveText('Теория')
    await expect(page.locator('.gr-lhero__badge')).toHaveText('UNIT 1')

    // Первый блок теории из источника + подсветка .g-hl реально стилизована.
    await expect(page.locator('.gr-block__h').first()).toHaveText('Meet the verb “be”')
    await expect(page.locator('.gr-rich .g-hl').first()).toHaveCSS(
      'background-color',
      'rgb(235, 222, 255)',
    )
    // Русская панель перевода (LESSON_TR из источника).
    await expect(page.locator('.gr-tr-flag').first()).toHaveText('РУС')

    const dots = await page.locator('.gr-dot').count()
    expect(dots).toBeGreaterThan(1)

    // «Дальше» листает слайд; шапка юнита только на первом.
    await page.locator('.gr-slide-nav .gr-btn--primary').click()
    await expect(page.locator('.gr-dot').nth(1)).toHaveClass(/on/)
    await expect(page.locator('.gr-lhero')).toHaveCount(0)
  })

  test('вкладка «Примеры» показывает модельные предложения без коллизий стилей', async ({ page }) => {
    await openUnit1(page)
    await page.locator('.gr-tab', { hasText: 'Примеры' }).click()

    const chat = page.locator('.gr-examples .g-chat').first()
    await expect(chat).toBeVisible()
    // Регрессия: класс .chat сайта (tutor.css) растягивал блок примеров.
    expect((await chat.boundingBox()).height).toBeLessThan(200)
    await expect(page.locator('.gr-examples .g-msg').first()).toHaveCSS(
      'background-color',
      'rgb(135, 75, 248)',
    )
  })
})

test.describe('Грамматика — движок упражнений', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 760, 'движок проверяем на десктопе')

  test('categorize: верная раскладка засчитывается', async ({ page }) => {
    await openUnit1(page)
    await page.locator('.gr-tab', { hasText: 'Практика' }).click()
    await expect(page.locator('.gr-act')).toBeVisible()

    const acts = await a1Activities(page)
    const a = acts[0]
    expect(a.type).toBe('categorize')

    await expect(page.locator('.gr-act__count')).toHaveText('1 / ' + acts.length)
    await expect(page.locator('.gr-check')).toBeDisabled()

    for (const item of a.items) {
      await page.locator('.gr-cat-item', { hasText: new RegExp(`^${item.t}$`) }).click()
      await page
        .locator('.gr-bucket', { has: page.locator(`.gr-bucket__h:text-is("${a.buckets[item.b]}")`) })
        .click()
    }

    await expect(page.locator('.gr-fb')).toHaveClass(/ok/)
    await expect(page.locator('.gr-chip-in.no')).toHaveCount(0)
  })

  test('дизайн практики: прогресс в %, скрытые бейджи, награда +10 и «Молодец!» на верном ответе', async ({
    page,
  }) => {
    await openUnit1(page)
    await page.locator('.gr-tab', { hasText: 'Практика' }).click()
    await expect(page.locator('.gr-act')).toBeVisible()

    // По дизайну: прогресс показывает проценты, бейджи типа/этапа/счётчика скрыты.
    await expect(page.locator('.gr-lprog__pct')).toBeVisible()
    await expect(page.locator('.gr-lprog__pct')).toHaveText(/^\d+%$/)
    await expect(page.locator('.gr-act__top')).toBeHidden()

    // Верный ответ → зелёный фидбек «Молодец!» + монетная награда +10.
    const acts = await a1Activities(page)
    await answerCorrectly(page, acts[0])
    await expect(page.locator('.gr-fb')).toHaveClass(/ok/)
    await expect(page.locator('.gr-fb__text b')).toHaveText('Молодец!')
    await expect(page.locator('.gr-reward')).toContainText('+10')
  })

  test('gap: неверный ответ показывает правильный, альтернативная форма засчитывается', async ({
    page,
  }) => {
    await openUnit1(page)
    await page.locator('.gr-tab', { hasText: 'Практика' }).click()
    await expect(page.locator('.gr-act')).toBeVisible()

    const acts = await a1Activities(page)
    const target = acts.findIndex((a) => a.type === 'gap')
    expect(target).toBeGreaterThan(-1)

    await advanceTo(page, acts, target)

    // Неверный ответ: поле краснеет и показывает правильный вариант.
    await page.locator('.gr-gap-input').fill('zzzz')
    await page.locator('.gr-check').click()
    await expect(page.locator('.gr-gap-input')).toHaveClass(/wrong/)
    await expect(page.locator('.gr-gap-input')).toHaveValue(acts[target].answer)
    await expect(page.locator('.gr-fb')).toHaveClass(/no/)

    // Альтернативная форма из данных источника принимается как верная.
    const alt = acts.findIndex(
      (a, i) => i > target && a.type === 'gap' && a.alts && a.alts.length > 0,
    )
    test.skip(alt === -1, 'в юните нет второго gap с alts')
    await page.locator('.gr-next').click()
    await advanceTo(page, acts, alt)
    await page.locator('.gr-gap-input').fill(acts[alt].alts[0])
    await page.locator('.gr-check').click()
    await expect(page.locator('.gr-fb')).toHaveClass(/ok/)
  })

  test('финальный экран: {title}/{c}/{n} подставлены, показаны заработанные монеты', async ({
    page,
  }) => {
    await openUnit1(page)
    await page.locator('.gr-tab', { hasText: 'Практика' }).click()
    await expect(page.locator('.gr-act')).toBeVisible()

    const acts = await a1Activities(page)
    for (let i = 0; i < acts.length; i++) {
      await answerCorrectly(page, acts[i])
      await page.locator('.gr-next').click()
    }

    const cele = page.locator('.gr-celebrate')
    await expect(cele).toBeVisible()
    // Регрессия на сломанную regex в fmt(): плейсхолдеры должны быть подставлены.
    await expect(cele).not.toContainText('{')
    await expect(cele.locator('.gr-score')).toHaveText(`✓ ${acts.length} / ${acts.length} верно`)
    await expect(cele.locator('.gr-earned')).toContainText(`+${acts.length * 10}`)
  })

  test('пройденный урок отмечается бейджем «Пройдено» в каталоге', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('jts_grammar_done'))
    await openUnit1(page)
    await page.locator('.gr-tab', { hasText: 'Практика' }).click()
    await expect(page.locator('.gr-act')).toBeVisible()

    const acts = await a1Activities(page)
    for (let i = 0; i < acts.length; i++) {
      await answerCorrectly(page, acts[i])
      await page.locator('.gr-next').click()
    }
    await expect(page.locator('.gr-celebrate')).toBeVisible()

    // «Назад к грамматике» → каталог; первая карточка (Unit 1) помечена «Пройдено».
    await page.locator('.gr-celebrate .gr-btn--soft').click()
    const firstCard = page.locator('.gr-catalog .gr-gcard').first()
    await expect(firstCard).toHaveClass(/is-done/)
    await expect(firstCard.locator('.gr-gcard__done')).toHaveText(/Пройдено/)
  })
})
