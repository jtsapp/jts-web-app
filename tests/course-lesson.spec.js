import { test, expect } from '@playwright/test'

// Урок перенесённого курса (public/course/<level>/) внутри «Обучения»: своя
// разметка, свой движок, свои стили — вместо нативного плеера заданий.
// Проверяем то, ради чего курс переносили целиком: тропа из юнитов с тестом,
// стадии урока, режим self без блоков 1-to-1/Group, работающая проверка
// ответов, аудио с нашего адреса и запись прогресса приложением.
//
// Диплинк ?screen=kingdom-interior&level=B1 нужен потому, что через карту в
// это королевство не попасть, пока уровень пользователя ниже.
const LEVELS = ['B1', 'A2']

async function openLesson(page, level) {
  await page.goto(`/?screen=kingdom-interior&level=${level}`)
  const node = page.locator('.kt-node:not(.is-locked) .kt-node__btn').first()
  await expect(node).toBeVisible({ timeout: 20000 })
  await node.click()
  await expect(page.locator('.jc .stage').first()).toBeVisible({ timeout: 20000 })
}

for (const level of LEVELS) {
  test.describe(`курс ${level}`, () => {
    test('тропа: 12 юнитов, в каждом три урока и тест', async ({ page }) => {
      await page.goto(`/?screen=kingdom-interior&level=${level}`)
      await expect(page.locator('.kt-unit').first()).toBeVisible({ timeout: 20000 })
      await expect(page.locator('.kt-unit')).toHaveCount(12)
      await expect(page.locator('.kt-node')).toHaveCount(48)
      const unit1 = page.locator('.kt-unit').first().locator('.kt-node__label')
      await expect(unit1.last()).toContainText('Unit Test')
    })

    test('урок: семь стадий, режим self, чужие режимы скрыты', async ({ page }) => {
      await openLesson(page, level)

      const stages = await page.locator('.jc .stage').evaluateAll((els) => els.map((e) => e.dataset.stage))
      expect(stages.length).toBe(7)
      expect(stages[0]).toBe('Warm-up')

      // Блоки 1-to-1 и Group остаются в разметке (мы её не режем), но ни один
      // из них не показан: за это отвечает data-mode="self" на контейнере.
      const byMode = await page.locator('.jc [data-only]').evaluateAll((els) => {
        const out = {}
        for (const el of els) {
          const key = el.dataset.only
          const vis = getComputedStyle(el).display !== 'none'
          out[key] = out[key] || { visible: 0, hidden: 0 }
          out[key][vis ? 'visible' : 'hidden']++
        }
        return out
      })
      expect(byMode.self.visible).toBeGreaterThan(0)
      expect(byMode.self.hidden).toBe(0)
      expect(byMode.solo?.visible || 0).toBe(0)
      expect(byMode.group?.visible || 0).toBe(0)
    })

    test('проверка ответов и словарь работают', async ({ page }) => {
      await openLesson(page, level)

      // Стадия Vocabulary: заполняем задание верными ответами из data-answer
      // и жмём «Check answers» — движок курса должен посчитать его целиком.
      const result = await page.evaluate(() => {
        const stage = [...document.querySelectorAll('.jc .stage')].find((s) => s.dataset.stage === 'Vocabulary')
        window.go([...document.querySelectorAll('.jc .stage')].indexOf(stage))
        const task = [...stage.querySelectorAll('.task')].find((t) => t.querySelector('select[data-answer]'))
        if (!task) return 'нет задания с выбором'
        for (const s of task.querySelectorAll('select[data-answer]')) {
          const want = s.dataset.answer
          const opt = [...s.options].find((o) => o.value === want || o.textContent.trim() === want)
          if (opt) {
            s.value = opt.value || opt.textContent
            s.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
        task.querySelector('.btn-primary')?.click()
        return (task.querySelector('.res')?.textContent || '').trim()
      })
      expect(result).toMatch(/All correct/i)

      // Словарь курса: карточка слова умеет сохранять слово.
      const saved = await page.evaluate(() => {
        document.querySelector('.jc .words .fc-add')?.click()
        return document.getElementById('dCount')?.textContent
      })
      expect(Number(saved)).toBeGreaterThan(0)
    })

    test('аудио урока отдаётся из public/course', async ({ page }) => {
      await openLesson(page, level)
      const src = await page.locator('.jc #audioHost audio').first().getAttribute('src')
      expect(src).toContain(`/course/${level.toLowerCase()}/audio/`)
      const status = await page.evaluate((u) => fetch(u, { method: 'HEAD' }).then((r) => r.status), src)
      expect(status).toBe(200)
    })

    test('«Завершить урок» записывает прогресс тропы', async ({ page }) => {
      await openLesson(page, level)
      await page.locator('.jc-bar__done').click()
      await expect(page.locator('.le-over')).toBeVisible({ timeout: 15000 })
      const done = await page.evaluate((lvl) => localStorage.getItem(`jts-${lvl}-done`), level.toLowerCase())
      expect(JSON.parse(done || '[]')).toContain('L1')
    })
  })
}
