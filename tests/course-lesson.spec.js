import { test, expect } from '@playwright/test'

// Урок уровня A2/B1 в новом пошаговом плеере (макет Figma «Обучение»).
// Контент готовит scripts/build-course-steps.js из перенесённого курса, поэтому
// тест проверяет обе стороны: что шаги собрались и что плеер их отыгрывает —
// оболочку, оценивание с сердцами и монетами, карточки слов, аудио и финиш.
//
// Диплинк ?screen=kingdom-interior&level=B1 нужен потому, что через карту в это
// королевство не попасть, пока уровень пользователя ниже.
const LEVELS = ['B1', 'A2']

async function openLesson(page, level) {
  await page.goto(`/?screen=kingdom-interior&level=${level}&unlock=1`)
  const node = page.locator('.kt-step:not([disabled])').first()
  await expect(node).toBeVisible({ timeout: 20000 })
  await node.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 20000 })
}

// Правильные ответы урока: берём их из тех же данных, что и плеер. Отвечать
// наугад нельзя — три ошибки съедают сердца, урок обрывается экраном провала,
// и до аудио-шагов с финишем тест просто не доходит.
// Ключ — текст вопроса: искать ответ по общему списку нельзя, отвлекающие
// варианты в словарных шагах берутся из соседних слов и сами являются
// правильными ответами других шагов.
async function answerKey(page, level, n = 1) {
  return page.evaluate(
    ([lvl, num]) =>
      fetch(`/course/${lvl}/steps-${num}.json`)
        .then((r) => r.json())
        .then((d) => {
          const map = {}
          for (const s of d.steps) if (s.answer) map[(s.prompt || '').trim()] = s.answer
          return map
        }),
    [level.toLowerCase(), n],
  )
}

// Шлюзы кнопки: у части шагов CTA намеренно бледная, пока не ответишь — так в
// макете. Плеер держит её через canCheck (CourseStepPlayer.jsx:303-307):
// `pick` ждёт хотя бы одну отмеченную карточку, `rows` — заполненную КАЖДУЮ
// строку. Обход этого не знал и упирался в disabled-кнопку на первом же шаге
// урока B1 (там шаг 0 — pick) и на шаге 19 урока A2 (rows), считая, что урок
// кончился. Продукт исправен; чинить надо обход.
async function satisfyGate(page, answers = {}) {
  const picks = page.locator('.cp-pick')
  if (await picks.count()) {
    await picks.first().click()
    return
  }
  const rows = page.locator('.cp-rows__row')
  const n = await rows.count()
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i)
    const q = ((await row.locator('.cp-rows__q').textContent().catch(() => '')) || '').trim()
    const opts = row.locator('.cp-rows__opt')
    const texts = await opts.allTextContents()
    const want = answers[q]
    const j = want ? texts.findIndex((t) => t.trim() === want) : -1
    await opts.nth(j >= 0 ? j : 0).click()
  }
}

// Проходит урок до конца, отвечая верно. maxSteps — предохранитель от зацикливания.
async function playThrough(page, answers, maxSteps = 80) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.locator('.le-over').count()) return true
    if (await page.locator('.cp-fb').count()) {
      await page.locator('.cp-cta:not([disabled])').click()
    } else if (await page.locator('.cp-choice:not([disabled])').count()) {
      await pickCorrect(page, answers)
      await page.locator('.cp-cta:not([disabled])').click()
    } else if (await page.locator('.cp-write').count()) {
      await page.locator('.cp-write').fill('I like coffee')
      await page.locator('.cp-cta:not([disabled])').click()
    } else {
      // Шаг может держать кнопку до ответа — снимаем шлюз, а уже потом решаем,
      // что урок встал.
      await satisfyGate(page, answers)
      const cta = page.locator('.cp-cta:not([disabled])')
      if (!(await cta.count())) return false
      await cta.click()
    }
    await page.waitForTimeout(120)
  }
  return (await page.locator('.le-over').count()) > 0
}

// Кликает правильный вариант текущего вопроса.
async function pickCorrect(page, answers) {
  const prompt = ((await page.locator('.cp-step__prompt').textContent().catch(() => '')) || '').trim()
  const want = answers[prompt]
  const texts = await page.locator('.cp-choice').allTextContents()
  const i = want ? texts.findIndex((t) => t.trim() === want) : -1
  await page.locator('.cp-choice').nth(i >= 0 ? i : 0).click()
}

for (const level of LEVELS) {
  test.describe(`курс ${level}`, () => {
    test('тропа: 12 юнитов, в каждом три урока и тест', async ({ page }) => {
      await page.goto(`/?screen=kingdom-interior&level=${level}`)
      await expect(page.locator('.kt-unit').first()).toBeVisible({ timeout: 20000 })
      await expect(page.locator('.kt-unit')).toHaveCount(12)
      await expect(page.locator('.kt-step')).toHaveCount(48)
      // Юнит-тест — последний узел юнита: золотая печенька с кубком. Подписи у
      // узлов в новом макете нет, название живёт в aria-label.
      const unit1 = page.locator('.kt-unit').first().locator('.kt-step')
      await expect(unit1.last()).toHaveClass(/is-last/)
      await expect(unit1.last()).toHaveAttribute('aria-label', /Unit Test/)
    })

    test('оболочка урока: стадия и прогресс', async ({ page }) => {
      await openLesson(page, level)
      await expect(page.locator('.cp-bar__place b')).not.toBeEmpty()
      // Сердец у урока нет: ошибка стоит монет и процента в итогах, но не
      // выбрасывает из урока (см. комментарий в CourseStepPlayer).
      await expect(page.locator('.cp-hud__hearts')).toHaveCount(0)
      await expect(page.locator('.cp-hud__fill')).toHaveAttribute('style', /width/)
      await expect(page.locator('.cp-cta')).toBeVisible()
    })

    test('карточки слов показывают перевод по клику', async ({ page }) => {
      await openLesson(page, level)
      // Шаг со словами — первый или второй в уроке.
      for (let i = 0; i < 4 && !(await page.locator('.cp-word').count()); i++) {
        await satisfyGate(page)
        await page.locator('.cp-cta:not([disabled])').click()
        await page.waitForTimeout(150)
      }
      const cards = page.locator('.cp-word')
      expect(await cards.count()).toBeGreaterThan(4)
      await expect(cards.first().locator('.cp-word__back')).toBeHidden()
      await cards.first().click()
      await expect(cards.first().locator('.cp-word__back')).toBeVisible()
    })

    test('верный ответ даёт монеты, неверный подсвечивается красным', async ({ page }) => {
      await openLesson(page, level)
      // Доходим до первого оценённого шага.
      for (let i = 0; i < 8 && !(await page.locator('.cp-choice').count()); i++) {
        await satisfyGate(page)
        await page.locator('.cp-cta:not([disabled])').click()
        await page.waitForTimeout(150)
      }
      await expect(page.locator('.cp-choice').first()).toBeVisible()

      // Отвечаем первым вариантом: он может оказаться и верным, и неверным —
      // проверяем обе развилки плашки результата.
      const right = await page.locator('.cp-step__prompt').textContent()
      expect(right).toBeTruthy()
      await page.locator('.cp-choice').first().click()
      await page.locator('.cp-cta:not([disabled])').click()
      await expect(page.locator('.cp-fb')).toBeVisible()
      const cls = await page.locator('.cp-fb').getAttribute('class')
      if (cls.includes('is-no')) {
        // В макете правильный вариант после ошибки не раскрывается: красным
        // подсвечен только выбранный, остальные кнопки остаются белыми.
        await expect(page.locator('.cp-choice.is-wrong')).toHaveCount(1)
        await expect(page.locator('.cp-choice.is-right')).toHaveCount(0)
      } else {
        await expect(page.locator('.cp-fb__coin')).toHaveText('+10')
      }
    })

    // Дорожка урока: у B1 это отдельный шаг `listen`, у A2 такого шага в
    // steps-1.json нет вовсе — там плеер дорожки стоит над шагом `rows`.
    // Поэтому ищем сам плеер, а не тип шага.
    test('дорожка урока отдаётся из public/course', async ({ page }) => {
      // Слушаем ответы с самого начала: дорожку плеер заводит при показе шага
      // (getStageAudio), поэтому запрос успевает уйти ДО того, как тест до неё
      // доберётся, — ждать его после клика бесполезно.
      const audioResponses = []
      page.on('response', (r) => {
        if (/\/course\/(a2|b1)\/audio\//.test(r.url())) audioResponses.push(r)
      })

      await openLesson(page, level)
      const answers = await answerKey(page, level)
      let found = false
      for (let i = 0; i < 40 && !found; i++) {
        if (await page.locator('.cp-audio').count()) { found = true; break }
        if (await page.locator('.cp-fb').count()) await page.locator('.cp-cta:not([disabled])').click()
        else if (await page.locator('.cp-choice:not([disabled])').count()) {
          await pickCorrect(page, answers)
          await page.locator('.cp-cta:not([disabled])').click()
        } else {
          await satisfyGate(page, answers)
          const cta = page.locator('.cp-cta:not([disabled])')
          if (!(await cta.count())) break
          await cta.click()
        }
        await page.waitForTimeout(120)
      }
      expect(found).toBeTruthy()

      // Узла <audio> в разметке нет с коммита 6a9040d: дорожка живёт в
      // модульном new Audio() (getStageAudio), чтобы переживать смену шага.
      // Поэтому проверяем не атрибут, а сам запрос — это строже: доказывает,
      // что файл реально запрошен и отдан, а не просто прописан в разметке.
      await page.locator('.cp-audio__play').first().click()
      await expect
        .poll(() => audioResponses.length, { timeout: 10_000 })
        .toBeGreaterThan(0)

      const resp = audioResponses[0]
      expect(resp.url()).toContain(`/course/${level.toLowerCase()}/audio/`)
      // 206, а не 200: браузер тянет медиа диапазонным запросом (Range), и
      // сервер честно отвечает Partial Content. Оба статуса означают «файл на
      // месте и отдан» — 404/500 отсекаются так же надёжно.
      expect([200, 206]).toContain(resp.status())
    })

    test('пройденный урок засчитывается в тропе', async ({ page }) => {
      await openLesson(page, level)
      const answers = await answerKey(page, level)
      expect(await playThrough(page, answers)).toBeTruthy()
      await expect(page.locator('.le-over')).toBeVisible({ timeout: 15000 })
      const done = await page.evaluate((lvl) => localStorage.getItem(`jts-${lvl}-done`), level.toLowerCase())
      expect(JSON.parse(done || '[]')).toContain('L1')
    })
  })
}
