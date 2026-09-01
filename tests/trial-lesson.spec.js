import { test, expect } from '@playwright/test'

// Пробный урок открывается по ссылке, у ученика нет ни аккаунта, ни токена —
// поэтому проверяем именно вход по ссылке: живая ведёт в урок, протухшая
// показывает понятный экран, а не пустую страницу.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const LINK_OK = {
  status: 'CREATED',
  studentName: 'Асель',
  teacherName: 'Айгуль',
  expiresAt: '2030-01-01T00:00:00',
}

test('живая ссылка открывает первый слайд урока с выбором стартовой точки', async ({ page }) => {
  await page.route('**/trial/link/live-token', (r) => r.fulfill(json(LINK_OK)))

  await page.goto('/trial/live-token')

  await expect(page.getByText('Just to Study!')).toBeVisible()
  await expect(page.getByText('Пробный урок английского · ≈ 15 минут')).toBeVisible()
  // Стартовую точку выбирает преподаватель — все три варианта на экране.
  await expect(page.getByRole('button', { name: /🌱 Beginner/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /📗 Elementary/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /🚀 Intermediate/ })).toBeVisible()
})

test('слайды доводят до проверки звука, не требуя входа', async ({ page }) => {
  await page.route('**/trial/link/live-token', (r) => r.fulfill(json(LINK_OK)))
  // Урок отмечает старт — эндпоинт публичный, ответ телу урока не важен.
  await page.route('**/trial/link/live-token/start', (r) => r.fulfill(json(LINK_OK)))

  await page.goto('/trial/live-token')
  await page.getByRole('button', { name: 'Начать урок 🚀' }).click()
  await expect(page.getByText('Introduction')).toBeVisible()
  await page.getByRole('button', { name: 'Дальше →' }).click()
  await expect(page.getByText('Начнём диагностику вашего английского')).toBeVisible()
  await page.getByRole('button', { name: 'Поехали →' }).click()
  await expect(page.getByText('Проверим звук')).toBeVisible()
})

test('протухшая ссылка объясняет, что делать, а не падает', async ({ page }) => {
  await page.route('**/trial/link/dead-token', (r) =>
    r.fulfill(json({ message: 'Ссылка на пробный урок больше не действует' }, 403)),
  )

  await page.goto('/trial/dead-token')

  await expect(page.getByText('Урок недоступен')).toBeVisible()
  await expect(page.getByText(/недействительна или истекла/)).toBeVisible()
  await expect(page.getByText(/попросите преподавателя/i)).toBeVisible()
})

test('режим преподавателя показывает ключи, обычный ученик — нет', async ({ page }) => {
  await page.route('**/trial/link/*', (r) => r.fulfill(json(LINK_OK)))
  await page.route('**/trial/link/*/start', (r) => r.fulfill(json(LINK_OK)))

  const openLesson = async (url) => {
    await page.goto(url)
    await page.getByRole('button', { name: 'Начать урок 🚀' }).click()
    await page.getByRole('button', { name: 'Дальше →' }).click()
    await page.getByRole('button', { name: 'Поехали →' }).click()
    await page.getByRole('button', { name: 'Видео и звук работают' }).click()
    await expect(page.getByText('Разминка')).toBeVisible()
  }

  await openLesson('/trial/teacher-token?teacher=1')
  await expect(page.getByText(/^Ключ:/)).toBeVisible()

  await openLesson('/trial/student-token')
  await expect(page.getByText(/^Ключ:/)).toHaveCount(0)
})

test('раздел до конца: ответы уходят в движок и урок идёт к следующему блоку', async ({ page }) => {
  test.setTimeout(60_000)
  await page.route('**/trial/link/*', (r) => r.fulfill(json(LINK_OK)))
  await page.route('**/trial/link/*/start', (r) => r.fulfill(json(LINK_OK)))

  await page.goto('/trial/flow-token')
  await page.getByRole('button', { name: 'Начать урок 🚀' }).click()
  await page.getByRole('button', { name: 'Дальше →' }).click()
  await page.getByRole('button', { name: 'Поехали →' }).click()
  await page.getByRole('button', { name: 'Видео и звук работают' }).click()

  // Разминка: отвечаем на каждый вопрос первым вариантом и идём дальше.
  // Кнопка «Готово» на последнем экране — единственное место, где ответы
  // раздела сдаются в движок, поэтому важно дойти именно до неё.
  await expect(page.getByText('Разминка')).toBeVisible()
  for (let i = 0; i < 20; i++) {
    await page.locator('.plc-opt').first().click()
    // Наличие кнопки проверяем через count(): isEnabled() на отсутствующем
    // элементе ждёт его появления весь таймаут теста, а «Далее» на последнем
    // экране раздела не существует по замыслу.
    const next = page.getByRole('button', { name: 'Далее' })
    if ((await next.count()) > 0 && (await next.isEnabled())) {
      await next.click()
      continue
    }
    await page.getByRole('button', { name: 'Готово' }).click()
    break
  }

  // Следующий блок сценария — словарь (или A0-мост, если разминка провалена:
  // первый вариант ответа верен не всегда, и обе ветки здесь легальны).
  await expect(page.getByText(/Словарь|самого простого/)).toBeVisible()
})
