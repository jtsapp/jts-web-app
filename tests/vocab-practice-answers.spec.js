import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Жалоба: «Словарь» засчитывает правильные ответы как ошибки.
//
// Проверка проходит практику так, как её прошёл бы ученик, который ЗНАЕТ все
// слова урока: на каждом экране отвечает верно по данным самого урока — и
// ждёт ноль ошибок в итоге. Данные — настоящие уроки каталога (A0 №2 и №5,
// B2 №1, без картинок), выгруженные с files-dev: именно на них всплыло, что
// карточка-«заголовок» вроде «Children / child» спрашивалась целиком в
// предложении, где пропущено одно слово, а у B2 перевода нет вовсе.

const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, 'helpers', 'vocab-catalog.json'), 'utf8'))

const INDEX = {
  levels: [
    { id: 'A0', name: 'Beginner', ready: 1, cards: 21 },
    { id: 'B2', name: 'Upper-Intermediate', ready: 1, cards: 13 },
  ],
  fields: [],
  fieldCats: ['all'],
}

// JWT с ролью — подпись на клиенте никто не проверяет, важен только payload.
const jwt = () =>
  ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '1' })).toString('base64url'), 'sig'].join('.')

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

async function boot(page, { level = 'B2', saved = [] } = {}) {
  await page.addInitScript((token) => {
    localStorage.setItem('jts_access_token', token)
    // Синтез заглушён, но «английский голос» есть: если Soniox не ответит,
    // диктант дочитает speechSynthesis, и тест всё равно услышит слово.
    // Присваиванием свойство окна в Chromium не подменить — только defineProperty.
    window.__spoken = []
    const voice = { name: 'Samantha', lang: 'en-US', localService: true, default: true }
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {},
        getVoices: () => [voice],
        speak: (u) => window.__spoken.push(u.text),
        onvoiceschanged: null,
      },
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: function (text) {
        this.text = text
      },
    })
    // С 23.09.2026 слово первым читает Soniox: запись — это адрес /api/tts с
    // текстом в параметре t, по нему тест и слышит слово. play() не ждёт сети:
    // «зазвучало» и «кончилось» приходят сразу, как у настоящей короткой записи.
    const realPlay = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const src = String(this.src || '')
      if (!src.includes('/api/tts?')) return realPlay.call(this)
      window.__spoken.push(new URL(src).searchParams.get('t'))
      setTimeout(() => {
        this.dispatchEvent(new Event('playing'))
        this.dispatchEvent(new Event('ended'))
      }, 0)
      return Promise.resolve()
    }
  }, jwt())
  // Настоящий Soniox тестам не нужен: он платный и с общим лимитом в минуту.
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' }))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { userId: 1, name: 'Test', role: 'USER', languageLevel: level } })),
  )
  await page.route('**/api/practice/entitlement**', (r) => r.fulfill(json({ allowed: true, limit: null })))
  await page.route('**/api/profile/activity', (r) => r.fulfill(json({})))
  await page.route('**/mobile/vocab-catalog', (r) => r.fulfill(json(INDEX)))
  await page.route('**/mobile/vocab-catalog/scopes/*', (r) => {
    const id = decodeURIComponent(r.request().url().split('/').pop())
    return r.fulfill(json(CATALOG[id] || { units: [], lessons: {} }))
  })
  await page.route('**/mobile/lesson-vocab/saved', (r) => r.fulfill(json({ words: saved })))
}

// ——— «Знающий ученик» ———

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const blanked = (s) => String(s || '').replace(/_{3,}/g, '________')

/** Всё, что ученик знает о словах урока: и о карточках, и об их атомах.
 *  Подписи у карточки и её атома бывают разными («Это…» и «это…», «Сто» и
 *  «100») — знающий ученик узнаёт любую. */
function knowledge(items) {
  const byWord = new Map()
  const bySentence = new Map()
  for (const it of items) {
    const k = norm(it.en)
    if (!byWord.has(k)) byWord.set(k, { en: it.en, meanings: new Set(), ru: it.ru || '' })
    const meaning = it.ru || it.def || it.mean || ''
    if (meaning) byWord.get(k).meanings.add(norm(meaning))
    // Пропуск заполняется словом, под которое предложение написано. Атомы
    // идут первыми: пример карточки-«заголовка» — это предложение её
    // первого атома, и ждёт оно слово атома, а не весь заголовок.
    const ex = it.ctx || it.example
    if (ex && !bySentence.has(norm(blanked(ex)))) bySentence.set(norm(blanked(ex)), it.en)
  }
  return { byWord, bySentence }
}

const knows = (k, text) => k.meanings.has(norm(text))

function lessonKnowledge(level, no) {
  const lesson = CATALOG[level].lessons[String(no)]
  return knowledge([...lesson.atoms, ...lesson.cards])
}

async function wrongCount(page) {
  return Number((await page.locator('.vp-score .no').innerText()).replace(/\D+/g, '') || 0)
}

/** Индекс первой кнопки, текст которой ученик узнаёт как значение слова. */
async function findKnown(buttons, k) {
  const texts = await buttons.allInnerTexts()
  return texts.findIndex((text) => knows(k, text))
}

async function answerChoice(page, know, log) {
  const word = (await page.locator('.vp-wordbox .w').innerText()).trim()
  const k = know.byWord.get(norm(word))
  expect(k, `ученик не знает слова «${word}»`).toBeTruthy()
  const options = page.locator('.vp-opt')
  const at = await findKnown(options, k)
  expect(at, `нет верного варианта для «${word}»: ${(await options.allInnerTexts()).join(' | ')}`).toBeGreaterThanOrEqual(0)
  await options.nth(at).click()
  log.push(`choice ${word}`)
}

async function answerMatch(page, know, log) {
  const cols = page.locator('.vp-pairs > div')
  const lefts = cols.nth(0).locator('.vp-pair')
  const n = await lefts.count()
  for (let i = 0; i < n; i++) {
    const left = lefts.nth(i)
    const word = (await left.innerText()).trim()
    const k = know.byWord.get(norm(word))
    expect(k, `ученик не знает слова «${word}»`).toBeTruthy()
    await left.click()
    const rights = cols.nth(1).locator('.vp-pair:not([disabled])')
    const at = await findKnown(rights, k)
    expect(at, `нет пары для «${word}»: ${(await rights.allInnerTexts()).join(' | ')}`).toBeGreaterThanOrEqual(0)
    await rights.nth(at).click()
    await page.waitForTimeout(60)
  }
  log.push(`match ${n}`)
}

async function answerDictation(page, log) {
  await page.evaluate(() => { window.__spoken = [] })
  await page.locator('.vp-listen-big').click()
  await expect.poll(() => page.evaluate(() => window.__spoken.length), { timeout: 3000 }).toBeGreaterThan(0)
  const heard = await page.evaluate(() => window.__spoken[window.__spoken.length - 1])
  // Пишет услышанное так, как пишут руками: строчными и без знаков.
  await page.locator('input.vp-input').fill(heard.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim())
  await page.locator('.vp-foot .vp-btn').click()
  log.push(`dictation ${heard}`)
}

async function answerFill(page, know, log) {
  const sentence = (await page.locator('.vp-wordbox p').first().innerText()).trim()
  const answer = know.bySentence.get(norm(sentence))
  expect(answer, `ученик не узнал предложение «${sentence}»`).toBeTruthy()
  const letters = [...answer].filter((c) => /[\p{L}\p{N}]/u.test(c))
  // Первая буква открыта подсказкой — печатаем остальные подряд, как человек.
  const first = page.locator('input.vp-letter:not([disabled])').first()
  await first.click()
  await page.keyboard.type(letters.slice(1).join(''))
  const check = page.locator('.vp-foot .vp-btn')
  await expect(check, `«${answer}» набрано целиком, а «Проверить» недоступна (предложение: ${sentence})`).toBeEnabled()
  await check.click()
  log.push(`fill ${answer}`)
}

async function answerWrite(page, know, log) {
  const word = (await page.locator('.vp-wordbox .w').innerText()).trim()
  const k = know.byWord.get(norm(word))
  expect(k?.ru, `у «${word}» нет перевода — писать нечего`).toBeTruthy()
  // Из «родился / родилась» ученик пишет одно — первое.
  const variant = k.ru.split(/\s*[/;,]\s*/)[0]
  await page.locator('input.vp-input').fill(variant)
  await page.locator('.vp-foot .vp-btn').click()
  log.push(`write ${word} → ${variant}`)
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Проходит всю практику «знающим учеником» и возвращает журнал экранов. */
async function passPractice(page, know) {
  await page.locator('.vp-intro .vp-btn').click()
  const log = []
  for (let step = 0; step < 40; step++) {
    if (await page.locator('.vp-res-card').count()) break
    await expect(page.locator('.vp-foot .vp-btn')).toBeVisible()
    if (await page.locator('.vp-opts').count()) await answerChoice(page, know, log)
    else if (await page.locator('.vp-pairs').count()) await answerMatch(page, know, log)
    else if (await page.locator('.vp-listen-big').count()) await answerDictation(page, log)
    else if (await page.locator('.vp-letters').count()) await answerFill(page, know, log)
    else if (await page.locator('input.vp-input').count()) await answerWrite(page, know, log)
    else throw new Error(`неизвестный экран после: ${log.join(' | ')}`)
    // Счёт обновляется по «Продолжить» — проверяем его уже на следующем экране.
    await page.locator('.vp-foot .vp-btn').click()
    if (await page.locator('.vp-res-card').count()) break
    expect(await wrongCount(page), `ошибка засчитана на: ${log[log.length - 1]}`).toBe(0)
  }
  await expect(page.locator('.vp-res-card')).toBeVisible()
  await expect(page.locator('.vp-res-stats .no'), `итог после: ${log.join(' | ')}`).toHaveText(/^\D*0\D*$/)
  return log
}

// На телефоне кнопка практики — липкая внизу, на десктопе — в шапке.
const practiceButton = (page) => page.locator('.vp-practice-desk, .vp-sticky-cta .vp-btn').locator('visible=true').first()

async function openLesson(page, level, lessonNo) {
  await page.goto('/?screen=vocab')
  await page.locator(`.vp-lvl-card[data-lv="${level}"]`).click()
  const lesson = page.locator('.vp-lesson').filter({ hasText: CATALOG[level].lessons[String(lessonNo)].title })
  await lesson.click()
  await practiceButton(page).click()
}

test.describe('Словарь: верный ответ засчитывается верным', () => {
  test('A0 урок 5 — карточки-«заголовки» спрашиваются по одному слову', async ({ page }) => {
    await boot(page)
    await openLesson(page, 'A0', 5)
    const log = await passPractice(page, lessonKnowledge('A0', 5))
    // Экран «впиши пропущенное» действительно был — иначе тест ничего не доказал.
    expect(log.some((l) => l.startsWith('fill'))).toBe(true)
  })

  test('A0 урок 2 — фразы и слова без примера', async ({ page }) => {
    await boot(page)
    await openLesson(page, 'A0', 2)
    await passPractice(page, lessonKnowledge('A0', 2))
  })

  test('B2 урок 1 — перевода нет, значение даёт английское определение', async ({ page }) => {
    await boot(page)
    await openLesson(page, 'B2', 1)
    const log = await passPractice(page, lessonKnowledge('B2', 1))
    expect(log.some((l) => l.startsWith('write'))).toBe(false)
  })

  test('«Мой словарь» — перевод из нескольких вариантов принимает любой', async ({ page }) => {
    const saved = [
      { id: 1, word: 'family', translationRu: 'семья' },
      { id: 2, word: 'school', translationRu: 'школа' },
      { id: 3, word: 'water', translationRu: 'вода' },
      { id: 4, word: 'bread', translationRu: 'хлеб' },
      { id: 5, word: 'window', translationRu: 'окно' },
      { id: 6, word: 'green', translationRu: 'зелёный' },
      { id: 7, word: 'born', translationRu: 'родился / родилась' },
    ]
    await boot(page, { saved })
    await page.goto('/?screen=vocab')
    await page.locator('#vsec-mine .vp-sec-arrow').click()
    await practiceButton(page).click()
    const know = knowledge(saved.map((w) => ({ en: w.word, ru: w.translationRu })))
    const log = await passPractice(page, know)
    expect(log.some((l) => l.startsWith('write born'))).toBe(true)
  })
})
