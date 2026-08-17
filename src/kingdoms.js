// Модель королевств (по мобильному приложению, kKingdoms).
//
// map — центр узла в процентах от КАРТИНКИ острова (public/assets/learning/
// island.webp, 1485×1947), ring — цвет обводки узла. И то и другое снято с
// макета (Figma «Обучение», Screen 2062:2883) плагином, а не на глаз: узлы
// стоят на конкретных городах, при другом кадре картинки они съедут — именно
// поэтому проценты привязаны к island.webp, а не к продовому кадру
// island_map.webp: у него другая обрезка, и на нём эти же числа врут.
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
  { id: 'sunhaven', name: 'Redtown', king: 'Майкл Флот', level: 'A0', avatar: 'a1', map: { x: 47.41, y: 70.16 }, ring: '#df6043' },
  { id: 'greendale', name: 'Bluewave Town', king: 'Барни', level: 'A1', avatar: 'a2', map: { x: 58.11, y: 59.53 }, ring: '#3b8dc3' },
  { id: 'bridgeport', name: 'Green Peace Town', king: 'Ди Флотио', level: 'A2', avatar: 'b1', map: { x: 45.32, y: 51.82 }, ring: '#39aa55' },
  { id: 'highspire', name: 'Music Town', king: 'Эван Доу', level: 'B1', avatar: 'b2', map: { x: 51.18, y: 40.99 }, ring: '#8e46cf' },
  { id: 'frostcrystal', name: 'Cocalastic Town', king: 'Шелли Бумер', level: 'B2', avatar: 'c1', map: { x: 53.4, y: 30.61 }, ring: '#cf9a21' },
  { id: 'goldcrown', name: 'Rosewind Town', king: 'Атлас Дон', level: 'C1', avatar: 'c2', map: { x: 49.09, y: 21.37 }, ring: '#941c5e' },
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

// Уровни, у которых есть арт шапки Профиля (/assets/world/hero/<level>.webp).
// Все, кроме A0: файла под него никогда не было, а экран его всё равно просил —
// и каждый заход в Профиль на первом уровне давал неуспешный запрос. Список
// считается из LEVEL_ORDER, чтобы новый уровень курса не остался без шапки
// молча. Живёт здесь, рядом с kingdomAvatar: это такое же соответствие
// «уровень → файл арта», и отсюда его берёт тест, не поднимая целый экран.
export const HERO_LEVELS = new Set(LEVEL_ORDER.filter((l) => l !== 'A0').map((l) => l.toLowerCase()))

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
