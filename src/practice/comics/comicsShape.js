'use client'

// Приведение ответа бэкенда к форме, которую ждут каталог и читалка.
//
// Зачем слой: контракт уже разошёлся с реализацией — в спеке читалка
// адресовалась по slug (`/mobile/comics/{slug}`), а сделали по id
// (`/mobile/comics/{id}`). Имена полей могут разойтись так же, и тогда раздел
// не упадёт с ошибкой, а молча покажет пустоту — это худший вид поломки.
// Поэтому берём значение по нескольким вероятным ключам и один раз здесь.
//
// Контракт: docs/superpowers/specs/2026-08-31-comics-api-contract.md

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

// Описание приходит либо объектом {ru,en,kk}, либо тремя плоскими полями.
function description(raw) {
  const obj = pick(raw, ['description', 'descriptions'])
  if (obj && typeof obj === 'object') {
    return { ru: obj.ru || '', en: obj.en || '', kk: obj.kk || '' }
  }
  return {
    ru: pick(raw, ['descriptionRu']) || (typeof obj === 'string' ? obj : '') || '',
    en: pick(raw, ['descriptionEn']) || '',
    kk: pick(raw, ['descriptionKk']) || '',
  }
}

export function normalizeComic(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = num(pick(raw, ['id', 'comicId']))
  const slug = pick(raw, ['slug', 'code', 'key'])
  if (id === undefined && !slug) return null
  return {
    id,
    slug: slug ? String(slug) : undefined,
    title: pick(raw, ['title', 'name']) || '',
    author: pick(raw, ['author']) || '',
    level: pick(raw, ['level', 'cefr']) || '',
    coverUrl: pick(raw, ['coverUrl', 'coverImageUrl', 'cover', 'thumbnailUrl']) || '',
    // pageCount по спеке; pages числом — если бэкенд назвал поле как у нас в
    // манифесте. Массив страниц сюда попасть не должен, поэтому только число.
    pageCount: num(pick(raw, ['pageCount', 'pagesCount'])) ?? num(raw?.pages) ?? 0,
    adultOnly: !!pick(raw, ['adultOnly', 'isAdult', 'adult']),
    description: description(raw),
  }
}

export function normalizeComics(list) {
  if (!Array.isArray(list)) {
    // Пагинированный ответ Spring: {content:[…]}.
    list = Array.isArray(list?.content) ? list.content : []
  }
  return list.map(normalizeComic).filter(Boolean)
}

function normalizeBlock(raw) {
  if (!raw || typeof raw !== 'object') return null
  const en = pick(raw, ['en', 'textEn', 'text'])
  if (!en) return null
  const kind = String(pick(raw, ['kind', 'type']) || 'balloon').toLowerCase()
  return {
    kind: ['balloon', 'caption', 'sfx', 'sign'].includes(kind) ? kind : 'balloon',
    en: String(en),
    ru: String(pick(raw, ['ru', 'textRu']) || ''),
    kk: String(pick(raw, ['kk', 'textKk']) || ''),
  }
}

function normalizePage(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const url = pick(raw, ['url', 'imageUrl', 'image', 'src'])
  if (!url) return null
  const blocks = pick(raw, ['blocks', 'lines', 'texts'])
  return {
    n: num(pick(raw, ['n', 'number', 'pageNumber', 'orderIndex'])) ?? index + 1,
    url: String(url),
    w: num(pick(raw, ['w', 'width'])),
    h: num(pick(raw, ['h', 'height'])),
    blocks: (Array.isArray(blocks) ? blocks : []).map(normalizeBlock).filter(Boolean),
  }
}

export function normalizeComicDoc(raw) {
  const base = normalizeComic(raw)
  if (!base) return null
  const pages = Array.isArray(raw.pages) ? raw.pages : []
  const normalized = pages.map(normalizePage).filter(Boolean)
  // Порядок страниц — наш: читалка листает по индексу массива и сама не
  // сортирует, а на сортировку сервера полагаться не стоит.
  normalized.sort((a, b) => a.n - b.n)
  return { ...base, pageCount: base.pageCount || normalized.length, pages: normalized }
}

// Ключ закладки. slug стабильнее id: при перезаливке материала строку комикса
// могут пересоздать. Если slug не пришёл — падаем на id, иначе закладки
// перестанут работать вовсе.
export function comicKey(comic) {
  return String(comic?.slug || comic?.id || '')
}

// Чем адресовать комикс в URL. Бэкенд сделал /mobile/comics/{id}, но если id
// не пришёл — пробуем slug, как было в спеке.
export function comicRef(comic) {
  return String(comic?.id ?? comic?.slug ?? '')
}
