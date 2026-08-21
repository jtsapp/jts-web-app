import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { nativeLessonSteps } from '../src/learning/nativeSteps.js'

const escapeRe = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const exactly = (v) => new RegExp(`^\\s*${escapeRe(v)}\\s*$`)

// Узел тропы — урок целиком: стадии склеены в одну очередь экранов, поэтому и
// ожидаемые шаги считаем по всему уроку (см. nativeLessonSteps).
function vocabSteps() {
  const level = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/learning/a0.json'), 'utf8'))
  return nativeLessonSteps(level, 'Coffee — yes. Mondays — no.')
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

/** Разблокирует «Проверить/Продолжить» на экране без известного ответа. */
async function unlockStep(page) {
  if (!(await page.locator('.cp-cta[disabled]').count())) return
  const tries = ['.cp-pick', '.cp-check__row', '.cp-choice', '.cp-rows__opt', '.cp-chip', '.cp-match__item']
  for (const sel of tries) {
    const el = page.locator(sel).first()
    if (await el.count()) {
      await el.click({ timeout: 2000 }).catch(() => {})
      if (!(await page.locator('.cp-cta[disabled]').count())) return
    }
  }
  const input = page.locator('.cp-gap__in, .cp-write, .cp-group__in').first()
  if (await input.count()) await input.fill('test').catch(() => {})
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

    // Собираем, чем озвучена карточка каждого слова.
    const cards = page.locator('.cp-word')
    const byWord = {}
    for (let i = 0; i < (await cards.count()); i++) {
      const w = (await cards.nth(i).locator('.cp-word__label').textContent())?.trim()
      await cards.nth(i).locator('.cp-word__flip').click()
      const played = await page.evaluate(() => window.__played)
      byWord[w] = played[played.length - 1]
    }

    // Доходим до задания «Listen. Choose the word you hear.», отвечая верно:
    // наугад урок не доживает (три промаха — экран итогов), а вслепую жать
    // «Продолжить» нельзя — на соединении пар кнопка заблокирована, пока не
    // соединены все пары.
    const steps = vocabSteps()
    const target = steps.findIndex((s) => s.type === 'choice' && s.say)
    expect(target, 'в узле словаря A0 нет задания со словом на слух').toBeGreaterThan(-1)

    // Идём НЕ с нуля: bootVocab останавливается НА экране карточек, а не после
    // него, — значит плеер уже стоит на шаге `cards`, и отсчёт с нуля сдвигал
    // ответы на чужие шаги. Плюс ветки match/answer жали кнопку дважды за
    // итерацию (свой клик и общий в конце), пролистывая по два шага разом.
    const start = steps.findIndex((s) => s.type === 'cards')
    expect(start, 'в узле словаря A0 нет экрана карточек').toBeGreaterThan(-1)

    for (let i = start; i < target; i++) {
      const step = steps[i]
      if (step.type === 'match') {
        for (const [k, pair] of step.pairs.entries()) {
          await page.locator('.cp-match__item').nth(k).click()
          await page.locator('.cp-match__bank .cp-chip', { hasText: exactly(pair.right) }).first().click()
        }
      } else if (step.answer) {
        await page.locator('.cp-choice', { hasText: exactly(step.answer) }).first().click()
      } else {
        await unlockStep(page)
      }
      // У оценённых шагов кнопка работает в два такта: первый клик проверяет и
      // показывает плашку результата, второй листает дальше. Один клик на шаг
      // оставлял плеер на плашке, а счётчик уходил вперёд — дальше цикл отвечал
      // за чужой шаг и упирался в уже связанные пары.
      await page.locator('.cp-cta:not([disabled])').click()
      await page.waitForTimeout(120)
      if (await page.locator('.cp-fb').count()) {
        await page.locator('.cp-cta:not([disabled])').click()
        await page.waitForTimeout(120)
      }
    }

    await page.evaluate(() => (window.__played = []))
    await page.locator('.cp-step .cp-audio__play').click()
    const played = await page.evaluate(() => window.__played)
    expect(played, 'кнопка озвучки ничего не проиграла').toHaveLength(1)
    // Файл обязан быть тем же, что звучал на карточке этого слова: одно
    // слово — одна запись.
    expect(played[0]).toBe(byWord[steps[target].say])
  })
})
