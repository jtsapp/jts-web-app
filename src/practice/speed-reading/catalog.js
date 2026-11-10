// Справочник Скорочтения v1.2 — группы жанров и порядок жанров внутри группы (ТЗ v1.2 §3; источник —
// data/speed-reading-scenarios.json: поле genres и порядок texts). Бэкенд хранит у текста только ключи (genre, category,
// sound), а названия групп и порядок карточек держит сайт: тексты приходят в порядке sort, и у восьми текстов v1.1 он
// остался прежним (0–7) — без своего порядка они стояли бы первыми в своих группах. Тот же справочник — у админки
// (web-admin speed-reading.catalog.ts). Группа, которой здесь нет, — вкладка «Другие», неизвестный жанр — в конце группы.
// Названия фоновых сцен — рядом с их синтезом (ambience.js).

export const CATEGORIES = [
  { id: 'travel', ic: '✈️', ru: 'Путешествия', kk: 'Саяхат', en: 'Travel' },
  { id: 'city', ic: '🏙️', ru: 'Город', kk: 'Қала', en: 'City' },
  { id: 'media', ic: '📻', ru: 'Медиа', kk: 'Медиа', en: 'Media' },
  { id: 'work', ic: '💼', ru: 'Работа и учёба', kk: 'Жұмыс және оқу', en: 'Work & study' },
  { id: 'life', ic: '🌟', ru: 'Жизнь и приключения', kk: 'Өмір мен шытырман', en: 'Life & adventure' },
]

/** Вкладка для текстов без группы или с группой не из справочника (старые тексты до переимпорта). */
export const OTHER_CATEGORY = { id: 'other', ic: '📄', ru: 'Другие', kk: 'Басқалар', en: 'Other' }

/** Жанры групп в порядке карточек прототипа. */
export const GENRE_ORDER = {
  travel: ['airport', 'inflight', 'station', 'metro', 'bus', 'taxi', 'ship', 'hotel', 'tourguide', 'citytour'],
  city: ['shop', 'mall', 'cafe', 'clinic', 'library', 'museum', 'cinema', 'concert', 'bazaar', 'zoo'],
  media: ['news', 'weather', 'radioad', 'podcast', 'sportscomm', 'stadium', 'documentary', 'cookshow', 'presscon', 'stormwarn'],
  work: ['schoolpa', 'lesson', 'interview', 'firstday', 'bizpres', 'phone', 'conference', 'graduation', 'debate', 'court'],
  life: ['intro', 'party', 'holiday', 'camp', 'parkwalk', 'rainyday', 'fitness', 'hike', 'space', 'twister'],
}

/** Уровни в порядке вкладок: v1.2 — A1–C1, бэкенд допускает ещё A0 и C2 (вкладка есть, только если есть такие тексты). */
export const LEVEL_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id))
const GENRE_RANK = new Map(Object.values(GENRE_ORDER).flatMap((list) => list.map((g, i) => [g, i])))

/** Группа текста для вкладок: из справочника — как есть, иначе «Другие». */
export const categoryOf = (t) => (t && CATEGORY_IDS.has(t.category) ? t.category : OTHER_CATEGORY.id)

/** Место жанра в своей группе (неизвестный — в конец). */
export const genreRank = (g) => (GENRE_RANK.has(g) ? GENRE_RANK.get(g) : 999)
