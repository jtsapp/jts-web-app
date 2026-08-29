// Текст книги. Демо-аккаунту приходят только первые главы — остальные с
// пустым текстом и `locked: true`.
//
// Резать надо на сервере: пока книги лежали в public, ограничение на клиенте
// обходилось открытием файла напрямую. Сколько глав открыто, решает демо-квота
// BOOK на бэкенде (её меняет менеджер на экране «Демо-квоты»), а не константа
// здесь.

import { readBookContent, applyPreview, isValidBookId, chapterLimitOf } from '@/lib/books.js'
import { bearerFromRequest, verifyToken, fetchContentQuota } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

/**
 * Сколько глав читает этот запрос. Аноним приравнен к демо: платный текст не
 * должен открываться целиком тому, у кого вообще нет аккаунта.
 *
 * Для демо сбой запроса квоты означает превью, а не полный доступ — в отличие
 * от практики, где fail-open осознанный (см. fetchContentQuota): там речь про
 * счётчик прохождений, здесь — про сам платный контент.
 */
async function chapterLimitFor(request) {
  const token = bearerFromRequest(request)
  const user = token ? await verifyToken(token) : null
  return chapterLimitOf({
    authenticated: !!user,
    isDemoAccount: !!user?.isDemoAccount,
    quota: user ? await fetchContentQuota(token, 'BOOK') : null,
  })
}

export async function GET(request, { params }) {
  const { id } = await params
  if (!isValidBookId(id)) {
    return Response.json({ error: 'Некорректный идентификатор книги.' }, { status: 400 })
  }

  const content = await readBookContent(id)
  if (!content) {
    return Response.json({ error: 'Книга не найдена.' }, { status: 404 })
  }

  const limit = await chapterLimitFor(request)
  return Response.json(applyPreview(content, limit), {
    // Ответ зависит от того, кто спросил: общий кэш отдал бы превью
    // оплатившему ученику (или, что хуже, полную книгу — демо-аккаунту).
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
