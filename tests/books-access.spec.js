import { test, expect } from '@playwright/test'

// Каталог книг раздаётся только через /api/books: файлы лежат вне public
// именно для того, чтобы «демо читает первые главы» нельзя было обойти
// открытием файла напрямую. Здесь проверяется сама эта граница.

test('текст книги не лежит в public', async ({ request }) => {
  const res = await request.get('/practice/books/alice.json')
  expect(res.status()).toBe(404)
})

test('незалогиненный получает превью, а не всю книгу', async ({ request }) => {
  const res = await request.get('/api/books/alice')
  expect(res.ok()).toBeTruthy()
  const data = await res.json()

  // Оглавление целиком, текст — только у первых двух глав.
  expect(data.chapters.length).toBeGreaterThan(2)
  expect(data.chapters[0].text.length).toBeGreaterThan(0)
  expect(data.chapters[1].text.length).toBeGreaterThan(0)
  expect(data.chapters[2].text).toBe('')
  expect(data.chapters[2].locked).toBe(true)
  expect(data.preview.limit).toBe(2)
})

test('ответ не кладётся в общий кэш', async ({ request }) => {
  const res = await request.get('/api/books/alice')
  expect(res.headers()['cache-control']).toContain('no-store')
})

test('каталог отдаётся без текста книг', async ({ request }) => {
  const res = await request.get('/api/books')
  expect(res.ok()).toBeTruthy()
  const index = await res.json()

  expect(Array.isArray(index)).toBe(true)
  expect(index.length).toBeGreaterThan(10)
  expect(JSON.stringify(index)).not.toContain('chapters":[')
})

test('из каталога книг не выйти по ../', async ({ request }) => {
  for (const id of ['..%2F..%2F.env', '..%2F..%2Fpackage.json']) {
    const res = await request.get(`/api/books/${id}`)
    expect([400, 404]).toContain(res.status())
  }
})

test('несуществующая книга — 404, а не пустая страница', async ({ request }) => {
  const res = await request.get('/api/books/nosuchbook')
  expect(res.status()).toBe(404)
})
