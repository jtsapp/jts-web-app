import { expect } from '@playwright/test'

// Читалка комикса без бэкенда: каталог из одного комикса на три страницы и
// сами страницы картинками-заглушками. Общий файл для спек зума пальцами и
// мышью — у обеих одинаковый путь до открытой страницы.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const COMIC = { id: 1, slug: 'yellow', title: 'Yellow', author: 'Jay Martin', pageCount: 3 }
const PAGES = [1, 2, 3].map((n) => ({ n, url: `/__e2e/comic/${n}.svg`, w: 1249, h: 1920 }))

// Страница — полосы и крупная цифра: по скриншоту видно, что увеличилось.
const svg = (n) => `<svg xmlns="http://www.w3.org/2000/svg" width="1249" height="1920" viewBox="0 0 1249 1920">
  <rect width="1249" height="1920" fill="#fff"/>
  ${Array.from({ length: 12 }, (_, k) => `<rect x="40" y="${60 + k * 155}" width="1169" height="120" rx="18" fill="hsl(${k * 30 + n * 40} 70% 80%)"/>`).join('')}
  <text x="624" y="1060" font-size="520" text-anchor="middle" font-family="sans-serif" fill="#222">${n}</text>
</svg>`

export async function mockComics(page) {
  await page.addInitScript(() => {
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    localStorage.setItem('jts_access_token', 'test-token')
  })
  // Без телефона приложение с 07.10 уводит на экран «Укажите номер» вместо
  // Практики — профиль отдаём полным.
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route(/\/mobile\/(karaoke|media-clips|audiobooks|tales)/, (r) => r.fulfill(json([])))
  await page.route('**/mobile/comics', (r) => r.fulfill(json([COMIC])))
  await page.route('**/mobile/comics/1', (r) => r.fulfill(json({ ...COMIC, pages: PAGES })))
  await page.route('**/__e2e/comic/*.svg', (r) => {
    const n = Number(r.request().url().match(/(\d+)\.svg$/)[1])
    return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(n) })
  })
}

export async function openReader(page) {
  await page.goto('/?screen=practice')
  // Комиксы — во вкладке «Чтение», по умолчанию открыто «Аудирование».
  await page.locator('.pk-skills').getByRole('tab', { name: /Чтение/ }).click()
  await page.locator('#sec-comics').getByText('Yellow').first().click()
  const img = page.locator('.cr__img:not(.cr__img--off)')
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true)
  return img
}

// Масштаб из вычисленного transform (matrix(a, b, c, d, e, f) → a).
export const scaleOf = (img) =>
  img.evaluate((el) => {
    const m = getComputedStyle(el).transform
    return m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)[1])
  })

export const shiftOf = (img) =>
  img.evaluate((el) => {
    const m = getComputedStyle(el).transform
    if (m === 'none') return [0, 0]
    const v = m.match(/matrix\((.+)\)/)[1].split(',').map(Number)
    return [v[4], v[5]]
  })

export async function center(img) {
  const b = await img.boundingBox()
  return [b.x + b.width / 2, b.y + b.height / 2]
}
