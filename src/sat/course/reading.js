// Чтение урока юнита на устройстве: на какой части остановились и какие уроки дочитаны до конца. Это не прогресс
// курса для сервера — это закладка, как у прототипа (jts.unitPart.<код>): преподаватель у доски и ученик дома
// возвращаются к той же части. Хранилища нет (приватное окно) — урок открывается с начала, и только.
const PART = 'jts_sat_unit_part:'
const READ = 'jts_sat_units_read'

export function readPart(code) {
  try {
    return Number(window.localStorage.getItem(PART + code)) || 0
  } catch {
    return 0
  }
}

export function savePart(code, i) {
  try {
    window.localStorage.setItem(PART + code, String(i))
  } catch {
    /* закладка не сохранится — не беда */
  }
}

/** Коды юнитов, чей урок открывали до последней части. */
export function readUnits() {
  try {
    const v = JSON.parse(window.localStorage.getItem(READ) || '[]')
    return new Set(Array.isArray(v) ? v : [])
  } catch {
    return new Set()
  }
}

export function markRead(code) {
  const all = readUnits()
  if (all.has(code)) return
  all.add(code)
  try {
    window.localStorage.setItem(READ, JSON.stringify([...all]))
  } catch {
    /* отметка не сохранится — юнит без набора останется «впереди» */
  }
}
