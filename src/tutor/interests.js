// Канонические темы интересов: id ↔ ключ словаря ↔ английская метка.
//
// В профиль (Neon, POST /api/profile { interests }) уходят английские метки —
// их же голосовой тьютор получает в metadata комнаты и вставляет в промпт,
// поэтому они должны быть читаемым текстом, а не ключами словаря. UI при
// восстановлении конвертирует метки обратно в id через enToInterestIds().
export const INTEREST_TOPICS = [
  { id: 'code', tKey: 'interests.topic.code', en: 'Programming' },
  { id: 'football', tKey: 'interests.topic.football', en: 'Football' },
  { id: 'sport', tKey: 'interests.topic.sport', en: 'Sports' },
  { id: 'psy', tKey: 'interests.topic.psy', en: 'Psychology' },
  { id: 'games', tKey: 'interests.topic.games', en: 'Video games' },
  { id: 'esport', tKey: 'interests.topic.esport', en: 'Esports' },
  { id: 'art', tKey: 'interests.topic.art', en: 'Art' },
  { id: 'politics', tKey: 'interests.topic.politics', en: 'Politics' },
  { id: 'movies', tKey: 'interests.topic.movies', en: 'Movies and series' },
  { id: 'fashion', tKey: 'interests.topic.fashion', en: 'Fashion and style' },
]

const BY_ID = new Map(INTEREST_TOPICS.map((t) => [t.id, t]))
const BY_EN = new Map(INTEREST_TOPICS.map((t) => [t.en.toLowerCase(), t]))

/** id[] → английские метки для профиля/промпта. Неизвестные id отбрасываются. */
export function interestIdsToEn(ids) {
  return (ids ?? []).map((id) => BY_ID.get(id)?.en).filter(Boolean)
}

/** Метки из профиля → id[] для подсветки чипсов. Незнакомые метки пропускаем. */
export function enToInterestIds(labels) {
  return (Array.isArray(labels) ? labels : [])
    .map((l) => (typeof l === 'string' ? BY_EN.get(l.trim().toLowerCase())?.id : null))
    .filter(Boolean)
}
