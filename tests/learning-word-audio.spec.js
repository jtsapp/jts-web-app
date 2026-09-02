import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { playSteps, unlockStep } from './helpers/course-steps.js'

// Ожидаемые шаги берём из того же файла, что играет плеер: урок A0 собран
// scripts/extract-selfstudy-course.js прямо из файла курса.
function vocabSteps() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/course/a0/steps-1.json'), 'utf8')).steps
}

// Озвучка слов A0.
//
// Инструкция стадии словаря обещает «Look and listen. Tap a picture to hear the
// word», но тап только переворачивал карточку — презентация слов была немой.
// А через несколько экранов то же слово спрашивают на слух, и там оно звучало
// синтезом браузера: голос зависит от системы, на Android для en-US его может
// не быть вовсе.
//
// Теперь слово — записанный файл, и на карточке, и в задании ОДИН И ТОТ ЖЕ:
// иначе задание проверяло бы не память, а способность узнать другой голос.
// Тест подменяет Audio и speechSynthesis и смотрит, что именно зазвучало.
async function bootVocab(page) {
  // Ловим и файлы, и синтез: молчание должно быть видно как молчание.
  await page.addInitScript(() => {
    window.__played = []
    window.__spoken = []
    const RealAudio = window.Audio
    window.Audio = function (src) {
      window.__played.push(src)
      const a = new RealAudio()
      a.play = () => Promise.resolve()
      return a
    }
    window.speechSynthesis = {
      cancel: () => {},
      speak: (u) => window.__spoken.push(u.text),
    }
    window.SpeechSynthesisUtterance = function (text) {
      this.text = text
    }
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel: 'A1' } }) }),
  )
  await page.route('**/mobile/lesson-modules', (r) => r.fulfill({ contentType: 'application/json', body: '[]' }))
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
  await page.goto('/?screen=kingdom&unlock=1')
  await page.locator('.lp-node', { hasText: 'Уровень A0' }).first().click()
  // Узел тропы — весь урок: стадии склеены в одну очередь, поэтому до карточек
  // словаря прощёлкиваем разминку.
  const lesson = page.locator('.kt-step:not([disabled])').first()
  await expect(lesson).toBeVisible({ timeout: 15000 })
  await lesson.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })
  for (let i = 0; i < 10 && !(await page.locator('.cp-word').count()); i++) {
    await unlockStep(page)
    await page.locator('.cp-cta:not([disabled])').click()
    await page.waitForTimeout(150)
  }
  await expect(page.locator('.cp-word').first()).toBeVisible({ timeout: 15000 })
}


test.describe('A0: слова звучат', () => {
  test('тап по карточке словаря проигрывает запись слова', async ({ page }) => {
    test.setTimeout(120000)
    await bootVocab(page)

    const card = page.locator('.cp-word').first()
    const word = (await card.locator('.cp-word__label').textContent())?.trim()
    expect(word, 'на карточке нет слова').toBeTruthy()

    await card.locator('.cp-word__flip').click()

    const played = await page.evaluate(() => window.__played)
    expect(played, 'тап по карточке ничего не проиграл').toHaveLength(1)
    expect(played[0]).toMatch(/^\/learning\/audio\/a0\/[0-9a-f]+\.mp3$/)

    // Карточка при этом переворачивается — послушать и увидеть перевод это
    // одно движение, как в исходном курсе.
    await expect(card.locator('.cp-word__back')).toBeVisible()
  })

  // Звук привязан к картинке, а не к карточке вообще: на обороте лежит
  // перевод, слово там уже прочитано глазами, и повтор звука при закрытии
  // читался как случайное срабатывание.
  test('тап по обороту карточки закрывает её молча', async ({ page }) => {
    test.setTimeout(120000)
    await bootVocab(page)
    // Счётчики обнуляем после прохода разминки: до карточек урок мог сам
    // проиграть дорожку стадии, и она бы попала в замер.
    await page.evaluate(() => {
      window.__played = []
      window.__spoken = []
    })

    const card = page.locator('.cp-word').first()
    await card.locator('.cp-word__flip').click()
    await expect(card.locator('.cp-word__back')).toBeVisible()
    expect(await page.evaluate(() => window.__played)).toHaveLength(1)

    // Второй тап — уже по обороту: там своя кнопка на всю карточку
    // (.cp-word__unflip), она и закрывает перевод.
    // force: строки перевода лежат поверх кнопки и перехватывают клик в центре
    // карточки (см. .cp-word__trs) — нам важно само поведение закрытия.
    await card.locator('.cp-word__unflip').click({ force: true })
    await expect(card.locator('.cp-word__back')).toBeHidden()
    expect(await page.evaluate(() => window.__played), 'закрытие карточки не должно звучать').toHaveLength(1)
    expect(await page.evaluate(() => window.__spoken), 'и синтез тоже не должен').toHaveLength(0)
  })

  test('запись действительно отдаётся, а не 404', async ({ page }) => {
    test.setTimeout(120000)
    await bootVocab(page)
    await page.locator('.cp-word').first().locator('.cp-word__flip').click()
    const src = (await page.evaluate(() => window.__played))[0]

    const res = await page.request.get(src)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('audio')
  })

  test('слово на слух играет тот же файл, что и карточка', async ({ page }) => {
    test.setTimeout(120000)
    await bootVocab(page)

    // Задание «на слух» спрашивает слово из СВОЕЙ стадии словаря, а стадий в
    // уроке несколько: карточки, на которых мы стоим после bootVocab, могут
    // быть не теми. Поэтому сначала доходим до последних карточек перед
    // заданием — с них и снимаем озвучку.
    const steps = vocabSteps()
    const target = steps.findIndex((s) => s.type === 'choice' && s.say)
    expect(target, 'в узле словаря A0 нет задания со словом на слух').toBeGreaterThan(-1)
    const at = steps.findIndex((s) => s.type === 'cards')
    const lastCards = steps.slice(0, target).reduce((last, s, i) => (s.type === 'cards' ? i : last), -1)
    expect(lastCards, 'перед заданием на слух нет стадии словаря').toBeGreaterThan(-1)
    // bootVocab уже стоит на первых карточках урока — идём с них, отвечая верно
    // (наугад урок не доживёт до задания, а вслепую жать «Продолжить» нельзя:
    // на соединении пар кнопка заблокирована, пока не соединены все пары).
    await playSteps(page, steps.slice(at), lastCards - at)

    // Собираем, чем озвучена карточка каждого слова.
    const cards = page.locator('.cp-word')
    const byWord = {}
    for (let i = 0; i < (await cards.count()); i++) {
      const w = (await cards.nth(i).locator('.cp-word__label').textContent())?.trim()
      await cards.nth(i).locator('.cp-word__flip').click()
      const played = await page.evaluate(() => window.__played)
      byWord[w] = played[played.length - 1]
    }

    await playSteps(page, steps.slice(lastCards), target - lastCards)

    await page.evaluate(() => (window.__played = []))
    await page.locator('.cp-step .cp-audio__play').click()
    const played = await page.evaluate(() => window.__played)
    expect(played, 'кнопка озвучки ничего не проиграла').toHaveLength(1)
    // Файл обязан быть тем же, что звучал на карточке этого слова: одно
    // слово — одна запись.
    expect(played[0]).toBe(byWord[steps[target].say])
  })
})
