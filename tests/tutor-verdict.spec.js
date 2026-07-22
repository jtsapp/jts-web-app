import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'

// Карточка итога сценария (TutorVoiceChatPage → CallStage, ветка `if (verdict)`).
// До звонка её не доехать без живой LiveKit-комнаты, поэтому проверяем контракт
// вёрстки: та же разметка + настоящий tutor.css. Регрессия, которую тест ловит —
// фиксированная высота .t-voice__card: длинный разбор выдавливал «Готово» за
// нижний край карточки, а медальон — на аватар тьютора над ней.

const CSS = readFileSync(join(__dirname, '../src/tutor.css'), 'utf-8')

const TIPS = [
  'Next time, prepare 2–3 specific details about your future employer or role — mention a real person’s name or a specific project you want to join, not just ‘Chevron’; it makes you sound credible.',
  'Practice answering the hard follow-up questions without pausing — when asked ‘Why US not Kazakhstan?’, have your answer ready and deliver it in one smooth sentence, not fragments.',
  'Use stronger comparative language: instead of ‘more opportunities’, say ‘Harvard’s research labs will give me hands-on experience I can’t get at home’ — be concrete, not vague.',
]

const SUMMARY =
  'Мирас demonstrated adequate ties to Kazakhstan (family, job prospect at Chevron) and no apparent immigration intent. His answers addressed the core questions but lacked specificity and confidence; he relied on general statements rather than concrete examples or details that would have strengthened his case.'

const renderVerdict = async (page, { passed = true } = {}) => {
  await page.setContent(`
    <div class="t-app"><div class="t-body"><main class="t-main"><div class="t-content t-content--flow"><div class="t-voice">
      <div class="t-status__head">
        <img class="t-status__avatar" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
        <div class="t-status__meta"><span class="t-status__name">Декстер</span><span class="t-status__role">Тьютор</span></div>
      </div>
      <div class="t-voice__card t-verdict ${passed ? 'is-pass' : 'is-fail'}" role="status">
        <span class="t-verdict__badge"><svg width="44" height="44" viewBox="0 0 24 24"></svg></span>
        <h2 class="t-verdict__title">${passed ? 'Задача пройдена' : 'Задача не пройдена'}</h2>
        <p class="t-verdict__summary">${SUMMARY}</p>
        <div class="t-verdict__advice">
          <span class="t-verdict__eyebrow">Что улучшить</span>
          <ul class="t-verdict__tips">${TIPS.map((tip) => `<li>${tip}</li>`).join('')}</ul>
        </div>
        <button class="t-pill t-pill--primary t-verdict__done" type="button">Готово</button>
      </div>
    </div></div></main></div></div>
  `)
  // styles.css в приложении сбрасывает поля body; здесь его не подключаем,
  // поэтому дефолтные 8px убираем вручную — иначе они читаются как переполнение.
  await page.addStyleTag({ content: `body { margin: 0 }\n${CSS}` })
  await expect(page.locator('.t-verdict')).toBeVisible()
}

const box = async (page, selector) => {
  const b = await page.locator(selector).boundingBox()
  expect(b, `нет геометрии у ${selector}`).not.toBeNull()
  return b
}

test.describe('Итог сценария — карточка вердикта', () => {
  // Появление медальона (scale + fade) иначе попадает в замер геометрии и цвета.
  // Заодно это прогон ветки prefers-reduced-motion.
  test.use({ reducedMotion: 'reduce' })

  test('карточка растёт под содержимое: «Готово» внутри неё', async ({ page }) => {
    await renderVerdict(page)
    const card = await box(page, '.t-verdict')
    const done = await box(page, '.t-verdict__done')
    expect(done.y + done.height).toBeLessThanOrEqual(card.y + card.height)
    expect(done.y).toBeGreaterThanOrEqual(card.y)
  })

  test('медальон не наезжает на аватар тьютора', async ({ page }) => {
    await renderVerdict(page)
    const head = await box(page, '.t-status__head')
    const badge = await box(page, '.t-verdict__badge')
    expect(badge.y).toBeGreaterThanOrEqual(head.y + head.height)
  })

  test('карточка не шире вьюпорта и не даёт горизонтальный скролл', async ({ page }) => {
    await renderVerdict(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('исход читается по медальону: успех зелёный, провал красный', async ({ page }) => {
    await renderVerdict(page, { passed: false })
    await expect(page.locator('.t-verdict__badge')).toHaveCSS('color', 'rgb(220, 38, 38)')
    await renderVerdict(page, { passed: true })
    await expect(page.locator('.t-verdict__badge')).toHaveCSS('color', 'rgb(22, 163, 74)')
    // Подпись к советам нейтральна в обоих исходах — цвет несёт только медальон.
    await expect(page.locator('.t-verdict__eyebrow')).toHaveCSS('color', 'rgb(111, 106, 128)')
  })
})
