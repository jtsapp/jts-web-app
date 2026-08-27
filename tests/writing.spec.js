import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildGenre, shuffle } from '../src/practice/writing/engine.js'

// Раздел «Письмо» (?screen=writing): каталог уровней → жанры → тренажёр из
// 6 шагов → Блокнот → разбор. Тесты гостевые (без токена) — квоты гостей не
// касаются (usePracticeEntitlement), а «Проверить» уходит в офлайн-проверку
// по правилам без единого сетевого запроса (checkApi.runCheck).
//
// Ожидания заданий НЕ захардкожены: движок жанра детерминирован (seeded),
// поэтому спека собирает жанр тем же buildGenre из тех же JSON и берёт
// правильный порядок слов/верный вариант регистра из него — тест переживает
// правки контента, но упадёт, если сломается сам посев.

const DATA = path.join(__dirname, '..', 'public', 'practice', 'writing')
const a1 = JSON.parse(readFileSync(path.join(DATA, 'a1.json'), 'utf8'))
const meta = JSON.parse(readFileSync(path.join(DATA, 'meta.json'), 'utf8'))
const genre = buildGenre(a1.seeds.find((s) => s.id === 'a1-form'), a1.bank, meta)

const GENRE_TITLE = 'About me: a form'
const SENT = 'My favourite subject is English.'
const wo = genre.tasks.find((t) => t.type === 'word-order')
const woIdx = wo.items.findIndex((it) => it.words.join(' ') === SENT)
const woItem = wo.items[woIdx]
// Порядок фишек в банке — тот же сид, что в WordOrderItem (task.id + item.id).
const woBank = woItem ? shuffle(woItem.words, wo.id + woItem.id) : []

const rg = genre.tasks.find((t) => t.type === 'register')
const rgItem = rg.items[0]
const rgWrong = rgItem.answer === 'a' ? rgItem.b : rgItem.a

// Реальные строки i18n (src/i18n.jsx, ключи writing.fb.*) — контракт
// «ответ не показывается»: только правило и ещё одна попытка.
const TRY_NOTE = 'Попробуй ещё раз — ответа здесь нет. Правило выше говорит, что нужно поменять.'
const LAST_NOTE = 'Этот пункт пока не решён. Открой упражнение позже и попробуй снова.'

const exact = (w) => new RegExp('^' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')

const openLevels = async (page) => {
  await page.goto('/?screen=writing')
  // Диплинк применяется эффектом после гидратации — ждём заголовок каталога.
  await expect(page.locator('.wr-hero h1')).toHaveText('Учимся писать по-английски — по шагам', {
    timeout: 15000,
  })
}

const openTrainer = async (page) => {
  await openLevels(page)
  await page.locator('.wr-lvcard').first().click()
  await expect(page.locator('.wr-gncard')).toHaveCount(30, { timeout: 15000 })
  await page.locator('.wr-gncard', { hasText: GENRE_TITLE }).click()
  await expect(page.locator('.wr-stepchip')).toHaveCount(6)
}

const openStep4 = async (page) => {
  await openTrainer(page)
  await page.locator('.wr-stepchip', { hasText: 'Уровень предложения' }).click()
  await expect(page.locator('#task-t1')).toBeVisible()
}

test.describe('Письмо — каталог, тренажёр, Блокнот, разбор', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 760, 'только широкий вьюпорт')

  test('каталог: уровни → жанры → тренажёр из 6 шагов', async ({ page }) => {
    await openLevels(page)
    await expect(page.locator('.wr-lvcard')).toHaveCount(6)
    await expect(page.locator('.wr-lvcard .wr-lvcard__tag')).toHaveText([
      'A1', 'A2', 'A2+', 'B1', 'B2', 'C1',
    ])
    await expect(page.getByRole('button', { name: 'Открыть Блокнот' })).toBeVisible()

    await page.locator('.wr-lvcard').first().click()
    await expect(page.locator('.wr-gncard')).toHaveCount(30, { timeout: 15000 })
    await expect(page.locator('.wr-gncard').first()).toContainText(GENRE_TITLE)

    await page.locator('.wr-gncard').first().click()
    const chips = page.locator('.wr-stepchip')
    await expect(chips).toHaveCount(6)
    await expect(chips).toContainText([
      'Зачем это нужно', 'Лексика и фразы', 'Связки', 'Уровень предложения', 'План', 'Свой текст',
    ])
    // Шаг 1 открыт по умолчанию, футер зовёт дальше.
    await expect(page.getByText('Зачем тебе этот жанр')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Дальше →' })).toBeVisible()
  })

  test('word-order: сид банка стабилен, «Верно.» за верный порядок, ответ не раскрывается', async ({ page }) => {
    expect(woIdx).toBeGreaterThanOrEqual(0) // предложение-эталон есть в подборке жанра
    await openStep4(page)
    await expect(page.locator('[id^="task-t"]')).toHaveCount(6)
    const card = page.locator('#task-t1')
    await expect(card.locator('h3')).toHaveText('Собери предложение')

    const item = card.locator('.wr-item').nth(woIdx)
    await item.scrollIntoViewIfNeeded()
    // Детерминированный порядок фишек: совпадает с расчётом движка (seeded).
    await expect(item.locator('.wr-chipbank .wr-chip')).toHaveText(woBank)

    // Неверный порядок (последнее слово вперёд): фидбэк с правилом и нотой
    // «попробуй ещё раз», но БЕЗ текста правильного ответа.
    const wrongOrder = [woItem.words[woItem.words.length - 1], ...woItem.words.slice(0, -1)]
    for (const w of wrongOrder) {
      await item.locator('.wr-chipbank .wr-chip').filter({ hasText: exact(w) }).click()
    }
    const fb = item.locator('.wr-fb')
    await expect(fb).toContainText('Не совсем.')
    await expect(fb).toContainText(woItem.why)
    await expect(fb).toContainText(TRY_NOTE)
    await expect(fb).not.toContainText(SENT)
    // Ретрай вернул фишки в банк — строка сборки снова пустая.
    await expect(item.locator('.wr-ph')).toBeVisible()

    // Верный порядок: авто-судейство, «Верно.» + правило.
    for (const w of woItem.words) {
      await item.locator('.wr-chipbank .wr-chip').filter({ hasText: exact(w) }).click()
    }
    await expect(item.locator('.wr-fb--ok')).toContainText('Верно.')
    await expect(item.locator('.wr-fb--ok')).toContainText(woItem.why)
  })

  test('register: три неверных клика — две ноты «попробуй ещё» и финальная «пока не решён»', async ({ page }) => {
    await openStep4(page)
    const card = page.locator('#task-t6')
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('h3')).toHaveText('Кому ты это пишешь?')

    const item = card.locator('.wr-item').first()
    await expect(item.locator('.wr-opt')).toHaveCount(2)
    const wrongBtn = item.locator('.wr-opt').filter({ hasText: exact(rgWrong) })

    // 1-я и 2-я неверные попытки — «Не совсем.» + правило + «попробуй ещё раз».
    await wrongBtn.click()
    const fb = item.locator('.wr-fb')
    await expect(fb).toContainText('Не совсем.')
    await expect(fb).toContainText(rgItem.why)
    await expect(fb).toContainText(TRY_NOTE)
    await wrongBtn.click()
    await expect(fb).toContainText(TRY_NOTE)

    // 3-я — пункт закрывается неверным: нота «пока не решён», варианты гаснут.
    await wrongBtn.click()
    await expect(fb).toContainText(LAST_NOTE)
    await expect(item.locator('.wr-opt').first()).toBeDisabled()
    await expect(item.locator('.wr-opt').nth(1)).toBeDisabled()
  })

  test('Блокнот: черновик переживает перезагрузку (автосейв в localStorage)', async ({ page }) => {
    const TEXT = 'My name is Aizere and I live in Almaty city'
    await openTrainer(page)
    await page.locator('.wr-stepchip', { hasText: 'Свой текст' }).click()
    await page.getByRole('button', { name: 'Писать в Блокноте' }).click()

    const editor = page.locator('.wr-editor')
    await expect(editor).toBeVisible()
    await editor.click()
    await editor.pressSequentially(TEXT)
    // Автосейв тикает раз в 3 секунды — «Сохранено в …» и есть сигнал персиста.
    await expect(page.locator('.wr-savedline')).toBeVisible({ timeout: 6000 })

    // Перезагрузка сбрасывает view-машину на каталог — идём тем же путём назад.
    await page.reload()
    await expect(page.locator('.wr-hero h1')).toHaveText('Учимся писать по-английски — по шагам', {
      timeout: 15000,
    })
    await page.locator('.wr-lvcard').first().click()
    await expect(page.locator('.wr-gncard')).toHaveCount(30, { timeout: 15000 })
    await page.locator('.wr-gncard', { hasText: GENRE_TITLE }).click()
    await page.locator('.wr-stepchip', { hasText: 'Свой текст' }).click()
    await page.getByRole('button', { name: 'Писать в Блокноте' }).click()
    await expect(page.locator('.wr-editor')).toContainText(TEXT)
  })

  test('гость: «Проверить» — офлайн-разбор без сети, подсветка открывает модалку', async ({ page }) => {
    await openLevels(page)
    await page.getByRole('button', { name: 'Открыть Блокнот' }).click()
    const editor = page.locator('.wr-editor')
    await expect(editor).toBeVisible()

    // «very like» гарантирует хотя бы одну правку (L1_RULES в localCheck.js).
    await editor.click()
    await editor.pressSequentially('I very like my city and I want to tell you about my life here.')

    // Гостевая проверка обязана быть локальной: на /api/writing/check ни запроса.
    const apiCalls = []
    page.on('request', (r) => {
      if (r.url().includes('/api/writing/check')) apiCalls.push(r.url())
    })
    await page.getByRole('button', { name: 'Проверить' }).click()

    await expect(page.locator('.wr-res-head h2')).toHaveText('Разбор твоей работы')
    await expect(page.locator('.wr-res-head .wr-pill')).toHaveText('офлайн-проверка по правилам')
    await expect(page.locator('.wr-res-ringwrap')).toHaveCount(4)
    await expect(page.getByText('Три шага к следующему уровню')).toBeVisible()
    const corr = page.locator('.wr-res-item').first()
    await expect(corr).toContainText('very like')
    await expect(corr).toContainText('really like')
    expect(apiCalls).toEqual([])

    // Пометка в тексте → модалка «было/стало» → закрытие крестиком.
    await page.locator('.wr-hl').first().click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('было:')
    await expect(modal).toContainText('very like')
    await expect(modal).toContainText('стало:')
    await expect(modal).toContainText('really like')
    await modal.locator('.wr-modal__x').click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
