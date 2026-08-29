// Каталог книг: id, название, автор, уровень и число глав. Текста здесь нет,
// поэтому эндпоинт открыт — карточки библиотеки видит и незалогиненный
// посетитель, как было, пока каталог лежал статикой.

import { readBookIndex } from '@/lib/books.js'

export const runtime = 'nodejs'

export async function GET() {
  const index = await readBookIndex()
  if (!index) {
    return Response.json({ error: 'Каталог книг недоступен.' }, { status: 503 })
  }
  return Response.json(index, {
    // Каталог одинаков для всех и меняется только выкладкой.
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
