'use client'

// Данные раздела «Комиксы» Практики.
//
// Всё приходит из API: каталог — `/mobile/comics`, сам комикс со страницами и
// репликами — `/mobile/comics/{id}` (в спеке было по slug, бэкенд сделал по id;
// разбор формы ответа вынесен в comicsShape.js). Материал заводит
// контентщик через админку, статической копии в public/ нет намеренно — иначе
// у каталога стало бы два источника правды.
//
// Кэш здесь только на время жизни вкладки: комикс — это сотни килобайт JSON,
// и перелистывание страниц не должно ходить в сеть заново.

import { getComics, getComic, searchComics } from '../../api.js'
import { COMICS_POS_KEY as KEY } from '../practiceKeys.js'
import { normalizeComics, normalizeComicDoc, comicKey, comicRef } from './comicsShape.js'

let _indexPromise = null
const _comicCache = {}

export function loadComicsIndex(token, onFresh) {
  if (!_indexPromise) {
    _indexPromise = getComics(token, (fresh) => onFresh?.(normalizeComics(fresh)))
      .then(normalizeComics)
      .catch(() => [])
  }
  return _indexPromise
}

// Принимаем карточку каталога целиком, а не идентификатор: чем адресовать
// комикс в URL (id) и чем помечать закладку (slug) — решает comicsShape.js.
export function loadComic(token, comic) {
  const ref = comicRef(comic)
  if (!ref) return Promise.resolve(null)
  if (!_comicCache[ref]) {
    _comicCache[ref] = getComic(token, ref)
      .then(normalizeComicDoc)
      .catch(() => null)
  }
  return _comicCache[ref]
}

// Поиск по каталогу. Серверный, а не фильтр по загруженному списку: каталог в
// приложении обрезан гейтом 18+ и может быть неполным, а искать студент
// ожидает по всей библиотеке.
//
// Пустой запрос — это не «ничего не найдено», а «показать всё»: иначе стоит
// стереть строку, и раздел опустеет.
export function searchComicsCatalog(token, q) {
  const query = String(q || '').trim()
  if (!query) return loadComicsIndex(token)
  return searchComics(token, query)
    .then(normalizeComics)
    .catch(() => [])
}

// ── Возрастной гейт ─────────────────────────────────────────────────────────
// У комикса есть флаг adultOnly (мат, сцены насилия). Кнопка «18+» у тьютора
// возрастом НЕ управляет — это ось нрава (calm/harsh), она никого никуда не
// пускает. Настоящей проверки возраста в приложении нет: birthDate уходит на
// бэкенд в updateUser и обратно не возвращается.
//
// Поэтому гейт закрыт по умолчанию: пока подтвердить совершеннолетие нечем,
// такой комикс не показывается никому. Открыть раздел неподтверждённому
// читателю — ошибка дороже, чем спрятать его от взрослого. Как только бэкенд
// начнёт отдавать birthDate (запрошено в контракте API), сюда придёт профиль
// и проверка заработает сама.
export function canSeeAdult(profile) {
  const raw = profile?.birthDate
  if (!raw) return false
  const born = new Date(raw)
  if (Number.isNaN(born.getTime())) return false
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  if (beforeBirthday) age--
  return age >= 18
}

export function visibleComics(list, profile) {
  if (!Array.isArray(list)) return []
  const adult = canSeeAdult(profile)
  return list.filter((c) => !c?.adultOnly || adult)
}

// ── Закладка ────────────────────────────────────────────────────────────────
// Храним номер последней открытой страницы, а не «пройденность»: комикс читают
// подряд и возвращаются туда, где закрыли. Ключ комикса — slug, а не id:
// закладка должна пережить перезаливку материала, при которой id меняется.
function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export function getComicPage(slug) {
  const n = Number(read()[slug])
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function setComicPage(slug, page) {
  if (!slug) return
  const all = read()
  all[slug] = Math.max(1, Math.floor(Number(page) || 1))
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* нет квоты — закладка просто не переживёт перезагрузку */
  }
}

// «Читаю» — если закладка ушла дальше первой страницы, но комикс не дочитан.
export function comicStatus(comic) {
  const page = getComicPage(comicKey(comic))
  const total = Number(comic?.pageCount) || 0
  if (!total || page <= 1) return { page, total, started: false, done: false }
  return { page, total, started: true, done: page >= total }
}
