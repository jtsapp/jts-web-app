// Модель королевств (по мобильному приложению, kKingdoms).
// map: позиция ноды на острове-карте в процентах (x,y), ring — цвет кольца ноды.
// Уровни съехали на один узел: курс A0 занял первый город, C2 из раздела ушёл.
// Города, короли, цвета колец и позиции остались на местах — их знают в лицо.
export const KINGDOMS = [
  { id: 'sunhaven', name: 'Redtown', king: 'Майкл Флот', level: 'A0', map: { x: 45, y: 85 }, ring: '#EF6C2E' },
  { id: 'greendale', name: 'Bluewave Town', king: 'Барни', level: 'A1', map: { x: 63, y: 71 }, ring: '#2E86D6' },
  { id: 'bridgeport', name: 'Green Peace Town', king: 'Ди Флотио', level: 'A2', map: { x: 39, y: 57 }, ring: '#3AA35A' },
  { id: 'highspire', name: 'Music Town', king: 'Эван Доу', level: 'B1', map: { x: 57, y: 43 }, ring: '#7C43B4' },
  { id: 'frostcrystal', name: 'Cocalastic Town', king: 'Шелли Бумер', level: 'B2', map: { x: 40, y: 28 }, ring: '#E0A21F' },
  { id: 'goldcrown', name: 'Rosewind Town', king: 'Атлас Дон', level: 'C1', map: { x: 58, y: 15 }, ring: '#C43C93' },
]

// Шкала уровней раздела. C2 закончился вместе с городом: контента за ним нет
// ни на карте, ни в public/learning — значит, и звания за него быть не должно,
// иначе студенту с C1 «следующим» светится звание за уровень, которого в
// разделе нет.
export const LEVEL_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1']

// Роль (звание) по уровню. Аватарки статусов — из загрузок.
export const ROLE_BY_LEVEL = {
  A0: { key: 'merchant', title: 'Купец' },
  A1: { key: 'merchant', title: 'Купец' },
  A2: { key: 'knight', title: 'Рыцарь' },
  B1: { key: 'baron', title: 'Барон' },
  B2: { key: 'viscount', title: 'Виконт' },
  C1: { key: 'king', title: 'Король' },
}

// Уровень выше шкалы раздела — не «неизвестный»: в анкете бэкенда C2 остался, и
// сажать такого студента на A0 (что делает фолбэк для мусорного кода) нельзя.
// Он приравнивается к последнему уровню шкалы — ровно то, что раньше делал
// clamp внутри computeKingdoms.
const ABOVE_SCALE = new Set(['C2'])

export function levelIndex(level) {
  const code = (level || 'A0').toUpperCase()
  if (ABOVE_SCALE.has(code)) return LEVEL_ORDER.length - 1
  const i = LEVEL_ORDER.indexOf(code)
  return i < 0 ? 0 : i
}

// Гейтинг доступа (world_cubit): A0 открыт всегда, дальше — всё до уровня
// студента включительно. Уровень выше последнего города не оставляет карту без
// «текущего» — им становится последний.
export function computeKingdoms(userLevel) {
  const last = levelIndex(KINGDOMS[KINGDOMS.length - 1].level)
  const effIdx = Math.min(last, Math.max(levelIndex(userLevel), levelIndex('A0')))
  return KINGDOMS.map((k) => {
    const kIdx = levelIndex(k.level)
    const unlocked = !k.comingSoon && kIdx <= effIdx
    return { ...k, unlocked, current: !k.comingSoon && kIdx === effIdx }
  })
}

export function roleForLevel(level) {
  // Через levelIndex, а не прямым чтением таблицы: у него уже есть и фолбэк на
  // первый уровень карты (после сдвига это A0), и приравнивание уровня выше
  // шкалы к последнему — иначе студент с C2 получал бы звание новичка.
  return ROLE_BY_LEVEL[LEVEL_ORDER[levelIndex(level)]]
}
