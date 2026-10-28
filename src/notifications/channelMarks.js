// Отметки каналов уведомления (ТЗ кабинетов, 14): сервер пишет в `channels` только те каналы, по которым событие реально
// ушло («EMAIL,PUSH», «PUSH», пусто — только кабинет). Лишнего не выдумываем: показываем ровно то, что пришло.

const KNOWN = ['EMAIL', 'PUSH']

/** «EMAIL,PUSH» → ['EMAIL', 'PUSH']; неизвестные значения и дубли отбрасываются, порядок фиксирован. */
export function channelMarks(channels) {
  const sent = new Set(String(channels || '').split(',').map((part) => part.trim().toUpperCase()))
  return KNOWN.filter((mark) => sent.has(mark))
}

/** Ответ ручки каналов к виду { email, push } без неожиданностей: непонятное значение считается «включено» (как на сервере). */
export function normalizeChannels(value) {
  return { email: value?.email !== false, push: value?.push !== false }
}
