// Окно «Жёсткий режим общения» (макет «Первый заход»): показывается ОДИН раз и
// только после тура «Главной» (решение владельца 21.10.2026). Тур кладёт сюда
// 'pending', окно — 'done'. Видевшие тур раньше этой отметки не получат: окно —
// продолжение тура, а не отдельная рассылка всем.
//
// Новый ученик после тура сразу уходит в тест, поэтому окно ждёт его возвращения
// на «Главную» с пройденным тестом (HomePage не показывает его поверх закрытого
// роадмапа).
export function temperInviteKey(tourKey) {
  return tourKey ? `${tourKey}:temper` : null
}

function read(key) {
  try {
    return key ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (key) localStorage.setItem(key, value)
  } catch {
    /* localStorage недоступен — окно просто не выйдет */
  }
}

export const armTemperInvite = (key) => {
  if (read(key) !== 'done') write(key, 'pending')
}
export const isTemperInvitePending = (key) => read(key) === 'pending'
export const closeTemperInvite = (key) => write(key, 'done')
