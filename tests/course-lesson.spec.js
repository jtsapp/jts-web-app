import { test, expect } from '@playwright/test'
import { unlockStep } from './helpers/course-steps.js'

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
    } else if (await page.locator('.cp-cta[disabled]').count()) {
      // Экран без правильного ответа, но кнопка ждёт действия: разминка
      // «отметь, что про тебя», разбор по колонкам, соединение пар. Без этой
      // ветки проход упирался в первый же такой экран и возвращал false —
      // у B1 это вообще первый экран урока.
      await unlockStep(page)
      const cta = page.locator('.cp-cta:not([disabled])')
      if (!(await cta.count())) return false
      await cta.click()
    } else {
      const cta = page.locator('.cp-cta:not([disabled])')
      if (!(await cta.count())) return false
      await cta.click()
    }
    await page.waitForTimeout(120)
  }
  return (await page.locator('.le-over').count()) > 0
}

// Кликает правильный вариант текущего вопроса.
//
// Вопрос есть не на каждом экране: у заданий на слух крупной строки нет, там
// вопрос звучит. Читать его надо с коротким ожиданием — textContent() без
// таймаута ждёт элемент 30 секунд, и проход урока упирался в них по три раза,
// выедая весь бюджет теста.
async function pickCorrect(page, answers) {
  const prompt = ((await page.locator('.cp-step__prompt').textContent({ timeout: 500 }).catch(() => '')) || '').trim()
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
      // Название теста приходит из самого курса и у уровней разное:
      // «Unit Test · Unit 1» у B1, «Unit 1 Review Test» у A2.
      await expect(unit1.last()).toHaveAttribute('aria-label', /Unit .*Test/i)
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
      test.setTimeout(60000)
      await openLesson(page, level)
      // Стадия словаря идёт после разминки: у B1 это второй экран, у A2 —
      // четвёртый (обложка, разминка, соединение, слова). Экраны с отметкой
      // держат кнопку, пока ничего не выбрано, — их проходит unlockStep.
      for (let i = 0; i < 8 && !(await page.locator('.cp-word').count()); i++) {
        await unlockStep(page)
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
      for (let i = 0; i < 6 && !(await page.locator('.cp-choice').count()); i++) {
        await unlockStep(page)
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

    // Запись урока живёт не в разметке: плеер держит её объектом Audio и
    // подменяет один и тот же на всю стадию (см. getStageAudio). Поэтому
    // проверяем не тег <audio> на странице, а сам запрос за файлом — он и
    // должен уходить в public/course/<level>/audio.
    test('аудио шага слушания отдаётся из public/course', async ({ page }) => {
      // Экранов в уроке под полсотни, и запись стоит не в первом десятке.
      test.setTimeout(180000)
      const heard = []
      page.on('request', (r) => {
        if (r.url().includes(`/course/${level.toLowerCase()}/audio/`)) heard.push(r.url())
      })
      await openLesson(page, level)
      const answers = await answerKey(page, level)
      // У A2 записи стоят в стадии слушания — это девятый десяток экранов,
      // а каждый оценённый экран съедает два шага цикла (ответ и «дальше»).
      let found = false
      for (let i = 0; i < 200 && !found; i++) {
        if (await page.locator('.cp-audio__play').count()) { found = true; break }
        if (await page.locator('.cp-fb').count()) await page.locator('.cp-cta:not([disabled])').click()
        else if (await page.locator('.cp-choice:not([disabled])').count()) {
          await pickCorrect(page, answers)
          await page.locator('.cp-cta:not([disabled])').click()
        } else {
          await unlockStep(page)
          const cta = page.locator('.cp-cta:not([disabled])')
          if (!(await cta.count())) break
          await cta.click()
        }
        await page.waitForTimeout(120)
      }
      expect(found, 'в уроке не нашлось экрана с записью').toBeTruthy()

      // Запрос за файлом уходит уже на создании Audio, до всякого клика,
      // поэтому слушаем сеть с самого начала, а кнопку жмём только если
      // записи ещё не просили.
      if (!heard.length) await page.locator('.cp-audio__play').first().click()
      await expect.poll(() => heard.length, { timeout: 15000 }).toBeGreaterThan(0)
      const status = await page.evaluate((u) => fetch(u, { method: 'HEAD' }).then((r) => r.status), heard[0])
      expect(status).toBe(200)
    })

    test('пройденный урок засчитывается в тропе', async ({ page }) => {
      test.setTimeout(240000)
      await openLesson(page, level)
      const answers = await answerKey(page, level)
      expect(await playThrough(page, answers, 200)).toBeTruthy()
      await expect(page.locator('.le-over')).toBeVisible({ timeout: 15000 })
      const done = await page.evaluate((lvl) => localStorage.getItem(`jts-${lvl}-done`), level.toLowerCase())
      expect(JSON.parse(done || '[]')).toContain('L1')
    })
  })
}
