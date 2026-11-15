import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'
import { openSection } from './helpers/nav.js'

// Birge (спека 2026-11-11 §7, §10). Бэкенда раздела на стенде может ещё не быть — отвечаем за него через page.route по
// контракту §5.3. Адреса — регэкспом: у ленты есть query (?topic=&cursor=), а глоб без «**» на конце запрос с
// параметрами молча пропускает на настоящий dev-server (CLAUDE.md, «Моки POST-ручек»). Маршруты ставим ПОСЛЕ
// loginAsStudent: его общий перехват бэкенда отвечает {} на всё, а в Playwright выигрывает последний.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const LIST = /\/mobile\/birge\/posts(\?[^/]*)?$/
const THREAD = /\/mobile\/birge\/posts\/\d+$/
const MEDIA = /\/mobile\/birge\/media$/
// Настоящая картинка 1×1: фото проходит настоящее пережатие браузера (createImageBitmap → canvas → JPEG).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const author = (id, name, level) => ({ id, name, level, avatarUrl: null })
const card = (over = {}) => ({
  id: 101,
  parentId: null,
  author: author(42, 'Аружан К.', 'A2'),
  topic: 'GRAMMAR',
  text: 'Present Perfect vs Past Simple — кто может объяснить на пальцах?',
  continuations: [],
  media: [],
  createdAt: '2026-11-11T09:40:00+05:00',
  likes: 12,
  liked: false,
  comments: 2,
  status: 'published',
  hiddenReason: null,
  mine: false,
  canReport: true,
  ...over,
})
const decision = (over) => ({ post: null, risk: 5, reasons: [], hits: [], removedMediaIds: [], feedbackId: null, ...over })

/** Лента и фото; publish(body) → { status?, reply } — ответ публикации. Возвращает тела отправленных публикаций. */
async function mockBirge(page, { publish = () => ({ reply: decision({ decision: 'published' }) }), list = json({ items: [card()], nextCursor: null }) } = {}) {
  const sent = []
  await page.route(LIST, (route) => {
    const req = route.request()
    if (req.method() !== 'POST') return route.fulfill(list)
    const body = req.postDataJSON()
    sent.push(body)
    const { status = 200, reply } = publish(body)
    return route.fulfill(json(reply, status))
  })
  await page.route(MEDIA, (route) => route.fulfill(json({ id: 7, width: 1, height: 1 })))
  return sent
}

test('написал + фото → «Опубликовано», пост сверху ленты', async ({ page }) => {
  await loginAsStudent(page)
  const sent = await mockBirge(page, {
    publish: (body) => ({
      reply: decision({
        decision: 'published',
        post: card({
          id: 202,
          author: author(7, 'Айгерім', 'A1'),
          topic: body.topic,
          text: body.text,
          media: [{ id: 7, url: `data:image/png;base64,${PNG.toString('base64')}`, width: 1, height: 1 }],
          likes: 0,
          comments: 0,
          mine: true,
          canReport: false,
        }),
      }),
    }),
  })
  await page.goto('/?screen=birge')
  const box = page.getByPlaceholder('Что нового?')
  await box.fill('Какие сериалы посоветуете для уровня A2? 🎧')
  await page.locator('.brg-composer input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.locator('.brg-mitem:not(.is-loading)')).toHaveCount(1)
  await page.getByRole('button', { name: 'Опубликовать' }).click()
  await expect(page.locator('.brg-res')).toContainText('Опубликовано')
  await expect(page.locator('.brg-step', { hasText: 'Проверка фото' })).toBeVisible()
  await expect(box).toHaveValue('')
  expect(sent[0]).toEqual({ topic: 'QUESTION', text: 'Какие сериалы посоветуете для уровня A2? 🎧', mediaIds: [7] })
  await expect(page.locator('.brg-feed .brg-post').first()).toContainText('Какие сериалы посоветуете')
})

test('мат не публикуется: причина, подсветка «х@й», текст остаётся в поле', async ({ page }) => {
  await loginAsStudent(page)
  await mockBirge(page, {
    publish: () => ({ reply: decision({ decision: 'rejected', risk: 96, reasons: [{ code: 'PROFANITY', score: 96 }], hits: ['х@й'] }) }),
  })
  await page.goto('/?screen=birge')
  const box = page.getByPlaceholder('Что нового?')
  await box.fill('Да х@й поймёшь эти артикли')
  await page.getByRole('button', { name: 'Опубликовать' }).click()
  await expect(page.locator('.brg-res--bad')).toContainText('Нецензурная лексика')
  await expect(page.locator('.brg-res mark')).toHaveText('х@й')
  await expect(box).toHaveValue('Да х@й поймёшь эти артикли')
})

test('отзыв о платформе уходит в Feedback: поле очищено, ссылка ведёт в обращение', async ({ page }) => {
  await loginAsStudent(page)
  await mockBirge(page, {
    publish: () => ({ reply: decision({ decision: 'feedback', risk: 78, reasons: [{ code: 'PLATFORM_COMPLAINT', score: 78 }], feedbackId: 55 }) }),
  })
  await page.route('**/cabinet/feedback/mine', (route) =>
    route.fulfill(
      json([{ id: 55, feedbackType: 'PLATFORM', category: 'Birge · отзыв о платформе', status: 'Новая', createdAt: '2026-11-11T10:00:00', body: 'Это развод, верните деньги' }]),
    ),
  )
  await page.goto('/?screen=birge')
  const box = page.getByPlaceholder('Что нового?')
  await box.fill('Это развод, верните деньги')
  await page.getByRole('button', { name: 'Опубликовать' }).click()
  await expect(page.locator('.brg-res')).toContainText('Ваш отзыв не потерян')
  await expect(box).toHaveValue('')
  await page.getByRole('button', { name: 'Открыть обращение' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Feedback' })).toBeVisible()
  await expect(page.getByText('Переписка · №55')).toBeVisible()
})

test('429 — «Слишком часто», текст остаётся', async ({ page }) => {
  await loginAsStudent(page)
  await mockBirge(page, {
    publish: () => ({ status: 429, reply: { error: 'RATE_LIMIT', retryAfterSec: 1200, message: 'Слишком часто' } }),
  })
  await page.goto('/?screen=birge')
  const box = page.getByPlaceholder('Что нового?')
  await box.fill('Ещё один пост')
  await page.getByRole('button', { name: 'Опубликовать' }).click()
  await expect(page.locator('.brg-res--bad')).toContainText('Слишком часто — попробуйте через 20 мин')
  await expect(box).toHaveValue('Ещё один пост')
})

test('бэкенд без раздела (404) — «Раздел скоро откроется», а не ошибка', async ({ page }) => {
  await loginAsStudent(page)
  await mockBirge(page, { list: json({ messages: ['Not Found'] }, 404) })
  await page.goto('/?screen=birge')
  await expect(page.getByText('Раздел скоро откроется')).toBeVisible()
  await expect(page.getByPlaceholder('Что нового?')).toHaveCount(0)
})

test('?screen=birge&post=101 открывает ветку; «← Все ветки» — в ленту, ?post= уходит', async ({ page }) => {
  await loginAsStudent(page)
  await mockBirge(page)
  await page.route(THREAD, (route) =>
    route.fulfill(
      json({
        thread: card(),
        comments: [card({ id: 102, parentId: 101, author: author(43, 'Тимур Б.', 'B1'), topic: null, text: 'Past Simple — когда есть конкретное время.', comments: 0 })],
      }),
    ),
  )
  await page.goto('/?screen=birge&post=101')
  await expect(page.getByText('Past Simple — когда есть конкретное время.')).toBeVisible()
  await expect(page.getByPlaceholder('Ответить…')).toBeVisible()
  await page.getByRole('button', { name: '← Все ветки' }).click()
  await expect(page.getByPlaceholder('Что нового?')).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.has('post')).toBe(false)
})

test('пункт меню «Not Just English» с меткой new открывает ленту', async ({ page }) => {
  await loginAsStudent(page)
  await mockBirge(page)
  await page.goto('/?screen=home')
  // Метка — у пункта сайдбара на компьютере; на телефоне сайдбар скрыт, плитку «Сервисов» проверяет ServicesPage.test.jsx.
  if ((page.viewportSize()?.width ?? 1440) > 560) {
    await expect(page.locator('.sb__item[data-nav="birge"] .sb__badge--new')).toHaveText('new')
  }
  await openSection(page, 'Not Just English')
  await expect(page.getByRole('heading', { level: 1, name: 'Not Just English' })).toBeVisible()
  await expect(page.getByText('Сообщество студентов Just to Study')).toBeVisible()
})
