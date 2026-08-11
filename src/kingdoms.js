// Модель королевств (по мобильному приложению, kKingdoms).
//
// map — центр узла в процентах от КАНВАСА карты (.lp-map__canvas с картинкой
// /assets/world/island_map.webp), ring — цвет кольца узла. Значения не трогать
// вместе с размерами канваса: узлы привязаны к его боксу и aspect-ratio
// 1600/2111, при другом кадре картинки они съезжают с городов.
// Уровни на карте сдвинуты на ступень вниз: точки острова остались на местах,
// но каждой досталось на уровень меньше (A1→A0, A2→A1, B1→A2, B2→B1, C1→B2,
// C2→C1). Уровня C2 у курса нет вовсе, поэтому верхняя точка — это C1.
// Нижнее королевство теперь A0: контента (public/learning/a0.json) под него
// пока не существует, тропа там пустая.
//
// avatar — файл арта короля. Он НЕ выводится из уровня: арт принадлежит
// королевству, а не ступени, и при сдвиге уровней короли иначе переехали бы
// по чужим городам (Redtown получил бы короля Bluewave и так далее).
export const KINGDOMS = [
  { id: 'sunhaven', name: 'Redtown', king: 'Майкл Флот', level: 'A0', avatar: 'a1', map: { x: 45, y: 85 }, ring: '#EF6C2E' },
  { id: 'greendale', name: 'Bluewave Town', king: 'Барни', level: 'A1', avatar: 'a2', map: { x: 63, y: 71 }, ring: '#2E86D6' },
  { id: 'bridgeport', name: 'Green Peace Town', king: 'Ди Флотио', level: 'A2', avatar: 'b1', map: { x: 39, y: 57 }, ring: '#3AA35A' },
  { id: 'highspire', name: 'Music Town', king: 'Эван Доу', level: 'B1', avatar: 'b2', map: { x: 57, y: 43 }, ring: '#7C43B4' },
  { id: 'frostcrystal', name: 'Cocalastic Town', king: 'Шелли Бумер', level: 'B2', avatar: 'c1', map: { x: 40, y: 28 }, ring: '#E0A21F' },
  { id: 'goldcrown', name: 'Rosewind Town', king: 'Атлас Дон', level: 'C1', avatar: 'c2', map: { x: 58, y: 15 }, ring: '#C43C93' },
]

// Арт короля по королевству; на случай зова с одним уровнем (экраны, которые
// знают только его) — падаем на одноимённый файл, как было раньше.
export function kingdomAvatar(kingdomOrLevel) {
  if (kingdomOrLevel && kingdomOrLevel.avatar) return kingdomOrLevel.avatar
  const level = String(kingdomOrLevel?.level || kingdomOrLevel || '').toLowerCase()
  const k = KINGDOMS.find((x) => x.level.toLowerCase() === level)
  return k ? k.avatar : level
}

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
