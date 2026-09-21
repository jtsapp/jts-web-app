// Что ученик уже открывал из сказок и мемов — для их квоты.
//
// Сервер счёта для них не ведёт: у сказок и мемов нет прогресса в practice
// state, и /api/practice/entitlement отдаёт completed=0 всегда. Поэтому
// «свежая проверка» при открытии отвечала то же, что и при загрузке страницы,
// и демо-ученик с лимитом листал сказки без конца. Считаем здесь, как
// «Ситуации» считают уровни: РАЗНЫЕ открытые единицы, повторный заход в уже
// открытую лимит не тратит. Это витрина, а не защита (как и у книг до
// серверного превью), но честная: ученик видит экран лимита, а не бесконечную
// ленту. Ключ свой у каждого ученика — иначе на общем компьютере лимит
// съедал бы предыдущий.
import { userScopedKey } from '../lib/userScopedKey.js'

const BASE = { tales: 'jts_tales_seen', memes: 'jts_memes_seen' }

export function readSeen(kind) {
  try {
    const raw = JSON.parse(localStorage.getItem(userScopedKey(BASE[kind])) || '[]')
    return Array.isArray(raw) ? raw.map(String) : []
  } catch {
    return []
  }
}

// limit — из ответа квоты: null — потолка нет, 0 — раздел закрыт.
export function canOpenSeen(kind, id, limit) {
  if (limit == null) return true
  const seen = readSeen(kind)
  return seen.includes(String(id)) || seen.length < limit
}

export function markSeen(kind, id) {
  const seen = readSeen(kind)
  if (seen.includes(String(id))) return
  try {
    localStorage.setItem(userScopedKey(BASE[kind]), JSON.stringify([...seen, String(id)]))
  } catch {
    /* приватный режим — лимит просто не запомнится */
  }
}
