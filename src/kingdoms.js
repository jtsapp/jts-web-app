// Модель королевств (по мобильному приложению, kKingdoms).
// map: позиция ноды на острове-карте в процентах (x,y), ring — цвет кольца ноды.
export const KINGDOMS = [
  { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'A1', map: { x: 45, y: 85 }, ring: '#EF6C2E' },
  { id: 'greendale', name: 'Greendale', king: 'Барни', level: 'A2', map: { x: 63, y: 71 }, ring: '#2E86D6' },
  { id: 'bridgeport', name: 'Bridgeport', king: 'Ди Флотио', level: 'B1', map: { x: 39, y: 57 }, ring: '#3AA35A' },
  { id: 'highspire', name: 'Highspire', king: 'Эван Доу', level: 'B2', map: { x: 57, y: 43 }, ring: '#7C43B4' },
  { id: 'frostcrystal', name: 'Frostcrystal', king: 'Шелли Бумер', level: 'C1', map: { x: 40, y: 28 }, ring: '#E0A21F' },
  { id: 'goldcrown', name: 'Goldcrown', king: 'Атлас Дон', level: 'C2', comingSoon: true, map: { x: 58, y: 15 }, ring: '#C43C93' },
]

export const LEVEL_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// Роль (звание) по уровню. Аватарки статусов — из загрузок.
export const ROLE_BY_LEVEL = {
  A0: { key: 'merchant', title: 'Купец' },
  A1: { key: 'merchant', title: 'Купец' },
  A2: { key: 'knight', title: 'Рыцарь' },
  B1: { key: 'baron', title: 'Барон' },
  B2: { key: 'viscount', title: 'Виконт' },
  C1: { key: 'king', title: 'Король' },
  C2: { key: 'lord', title: 'Лорд' },
}

export function levelIndex(level) {
  const i = LEVEL_ORDER.indexOf((level || 'A0').toUpperCase())
  return i < 0 ? 0 : i
}

// Гейтинг доступа (world_cubit): A1 всегда открыт, открыты уровни <= max(userIndex, A1)
export function computeKingdoms(userLevel) {
  const userIdx = levelIndex(userLevel)
  const effIdx = Math.max(userIdx, levelIndex('A1'))
  return KINGDOMS.map((k) => {
    const kIdx = levelIndex(k.level)
    const unlocked = !k.comingSoon && kIdx <= effIdx
    return { ...k, unlocked, current: !k.comingSoon && kIdx === effIdx }
  })
}

export function roleForLevel(level) {
  return ROLE_BY_LEVEL[(level || 'A0').toUpperCase()] || ROLE_BY_LEVEL.A1
}
