import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'

// Отчёт после разговора (TutorCallReportPage). С живыми данными до него не
// доехать без БД и записи агента, поэтому проверяем контракт вёрстки: та же
// разметка + настоящий tutor.css. Ловим две вещи, которые ломаются молча:
// плитки должны стоять сеткой 2×2 (скругления у .t-stat прибиты к
// :first-child/:last-child внутри .t-result2__stats — чужого контейнера), а
// длинное слово с кнопкой «В словарь» не должно распирать экран на 390px.

const CSS = readFileSync(join(__dirname, '../src/tutor.css'), 'utf-8')

const WORDS = [
  { term: 'to contemplate', tr: 'обдумывать, размышлять', ex: 'Did you contemplate the offer before saying yes?' },
  { term: 'a turning point', tr: 'переломный момент', ex: 'That was a turning point in my career.' },
]

const renderReport = async (page) => {
  await page.setContent(`
    <div class="t-app"><div class="t-body"><main class="t-main"><div class="t-content t-content--flow">
      <div class="t-report">
        <div class="t-report__head">
          <img class="t-report__avatar" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
          <div class="t-report__headtext"><b>Итоги разговора</b><span>Вот что я заметил в нашем разговоре</span></div>
        </div>
        <div class="t-report__stats">
          <div class="t-stat"><b>20:15</b><span>длительность</span></div>
          <div class="t-stat"><b>57</b><span>слов</span></div>
          <div class="t-stat"><b>8</b><span>предложений</span></div>
          <div class="t-stat"><b>48</b><span>уникальных слов</span></div>
        </div>
        <section class="t-report__card">
          <h2 class="t-report__cardtitle">О чём говорили</h2>
          <p class="t-report__text">Обсудили новый проект и сомнения, стоит ли вкладывать в него силы.</p>
          <div class="t-report__topics"><span class="t-chip t-report__topic">career doubts</span><span class="t-chip t-report__topic">new project</span></div>
          <button class="t-report__link" type="button">Показать расшифровку</button>
        </section>
        <section class="t-report__card">
          <h2 class="t-report__cardtitle">Новые слова от тьютора</h2>
          <ul class="t-report__words">
            ${WORDS.map(
              (w) => `<li class="t-report__word">
                <div class="t-report__wordtext"><b>${w.term}</b><span>${w.tr}</span><i>«${w.ex}»</i></div>
                <button class="t-report__add" type="button">В словарь</button>
              </li>`,
            ).join('')}
          </ul>
          <button class="t-report__link" type="button">Добавить все</button>
        </section>
      </div>
    </div></main></div></div>
  `)
  // styles.css здесь не подключаем — дефолтные поля body читались бы как
  // переполнение (см. тот же приём в tutor-verdict.spec.js).
  await page.addStyleTag({ content: `body { margin: 0 }\n${CSS}` })
  await expect(page.locator('.t-report')).toBeVisible()
}

const box = async (page, selector, nth = 0) => {
  const b = await page.locator(selector).nth(nth).boundingBox()
  expect(b, `нет геометрии у ${selector}[${nth}]`).not.toBeNull()
  return b
}

test.describe('Отчёт после разговора', () => {
  test('плитки стоят сеткой 2×2', async ({ page }) => {
    await renderReport(page)
    const first = await box(page, '.t-report__stats .t-stat', 0)
    const second = await box(page, '.t-report__stats .t-stat', 1)
    const third = await box(page, '.t-report__stats .t-stat', 2)

    // Первые две — в одной строке, третья — уже под ними.
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1)
    expect(third.y).toBeGreaterThan(first.y + first.height - 1)
    expect(Math.abs(first.width - second.width)).toBeLessThanOrEqual(1)

    // Скругление не должно потеряться вместе с чужим контейнером.
    const radius = await page
      .locator('.t-report__stats .t-stat')
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius)
    expect(radius).toBe('16px')
  })

  test('ничего не вылезает за правый край', async ({ page, viewport }) => {
    await renderReport(page)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1)

    for (const selector of ['.t-report__stats', '.t-report__card', '.t-report__word']) {
      const b = await box(page, selector)
      expect(b.x).toBeGreaterThanOrEqual(-1)
      expect(b.x + b.width).toBeLessThanOrEqual(viewport.width + 1)
    }
  })

  test('на узком экране слово и кнопка встают в столбик', async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) > 760, 'проверка мобильного правила')
    await renderReport(page)
    const text = await box(page, '.t-report__wordtext')
    const button = await box(page, '.t-report__add')
    expect(button.y).toBeGreaterThan(text.y + text.height - 1)
  })

  test('на десктопе кнопка остаётся справа от слова', async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) <= 760, 'проверка десктопного правила')
    await renderReport(page)
    const text = await box(page, '.t-report__wordtext')
    const button = await box(page, '.t-report__add')
    expect(button.x).toBeGreaterThan(text.x + text.width - 1)
  })
})
