// Раскладка звонка урока: один на один для индивидуальных и пробного, иначе сетка.
export const DUO_TYPES = ['INDIVIDUAL_STANDARD', 'INDIVIDUAL_PREMIUM', 'TRIAL']

export function videoLayout(lessonType) {
  return DUO_TYPES.includes(lessonType) ? 'duo' : 'grid'
}

// teacherUserId — id из нашей базы, он лежит в identity участника; userId — номер в сессии Zoom.
export function orderTiles(participants, teacherUserId) {
  const teacher = String(teacherUserId)
  return [...participants].sort((a, b) => {
    if (a.identity === teacher) return -1
    if (b.identity === teacher) return 1
    return a.name.localeCompare(b.name, 'ru')
  })
}

export function initials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// Без кода ответа — сеть или сам SDK: показываем прежнюю ссылку на звонок.
export function callFallback(error) {
  switch (error?.status) {
    case 409: return 'ended'
    case 403: return 'denied'
    default: return 'link'
  }
}
