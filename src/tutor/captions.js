// Субтитры голосового звонка. Чистая логика вынесена сюда, чтобы её можно было
// гонять юнит-тестами без LiveKit-комнаты: поднять комнату в тестах нельзя, а
// именно здесь живут решения «что показать» и «каким кеглем».

// Без lookbehind (`(?<=…)`): Safari до 16.4 такую регулярку не понимает, и это
// ошибка РАЗБОРА — файл не запускается целиком, а с ним и весь чанк. Границу
// ставим заменой с меткой (lookahead Safari понимает давно).
const SENTENCE_BREAK = '\u0000'

// Последнее предложение текущей реплики — подпись сменяется, а не растёт.
export function lastSentence(text) {
  const s = (text || '').trim()
  if (!s) return ''
  const parts = s
    .replace(/([.!?…])\s+/g, `$1${SENTENCE_BREAK}`)
    .split(SENTENCE_BREAK)
  return (parts[parts.length - 1] || s).trim()
}

// Ниже этого кегля подпись перестаёт читаться с дивана — дальше уже честнее
// обрезать хвост многоточием, чем делать вид, что текст показан.
export const CAP_MIN_PX = 15

// Лесенка кеглей для автоподгона: от максимума из CSS (--t-cap-max: 32px на
// десктопе, 22px на мобилке) вниз до пола. Ступени, а не плавная шкала —
// подпись обновляется по несколько раз в секунду, и непрерывный подбор
// дрожал бы на каждом новом слове.
export function fitSizes(maxPx, minPx = CAP_MIN_PX) {
  const max = Number(maxPx) > 0 ? Number(maxPx) : 32
  const floor = Number(minPx) > 0 ? Number(minPx) : CAP_MIN_PX
  const out = []
  for (const ratio of [1, 0.875, 0.75, 0.66, 0.58, 0.5]) {
    const px = Math.round(max * ratio)
    if (px < floor) break
    if (out[out.length - 1] !== px) out.push(px)
  }
  return out.length ? out : [Math.max(floor, Math.round(max))]
}

// Какая реплика висит на экране: та, что изменилась ПОСЛЕДНЕЙ, чья бы она ни
// была. Раньше приоритет был у говорящего тьютора, и его фраза пропадала ровно
// в тот момент, когда он договорил, — подпись откатывалась на старую реплику
// ученика, и прочитать сказанное было уже негде.
//
// `seen` — что показывали в прошлый раз с каждой стороны; сравниваем с ним, а не
// с часами: у транскрипций ученика timestamp проставлен часами АГЕНТА (тот
// публикует их от имени ученика), и расхождение часов перемешало бы очередь.
// Ученик проверяется первым: если в одном коммите приехали обе реплики, это
// перебивание, и на экране должен остаться он.
//
// Ничего не менялось — возвращает ПРЕЖНЮЮ ссылку: она уходит в setState на
// каждое обновление транскрипции, и новый объект каждый раз давал бы лишний
// ререндер карточки звонка.
export function nextLive(live, seen, tutorCaption, userCaption) {
  const was = seen || {}
  if (userCaption && userCaption !== was.user) return { text: userCaption, isUser: true }
  if (tutorCaption && tutorCaption !== was.tutor) return { text: tutorCaption, isUser: false }
  return live
}

// Ключ реплики ученика. Обновления одного сегмента приезжают РАЗНЫМИ потоками с
// общим lk.segment_id (components-core сам их склеивает, но подменяет streamInfo
// на свежий) — по streamInfo.id копилка заводила бы новую реплику на каждое
// слово.
export function userTurnKey(stream) {
  const info = stream?.streamInfo
  return info?.attributes?.['lk.segment_id'] || info?.id || ''
}

// Копилка реплик для панели «показать текст». Порядок — по первому появлению на
// клиенте, а не по timestamp: у тьютора это его собственные часы, у транскрипций
// ученика — часы агента (он публикует их от имени ученика), и расхождение
// клиентских и серверных часов перемешало бы диалог.
//
// Возвращает prev БЕЗ изменений, если ничего не поменялось: массив уходит в
// setState на каждое обновление транскрипции, и новая ссылка каждый раз давала
// бы лишний ререндер карточки звонка.
export function mergeTurns(prev, { agentSegments = [], userStreams = [] } = {}) {
  const next = Array.isArray(prev) ? prev.slice() : []
  const index = new Map(next.map((turn, i) => [turn.id, i]))
  let changed = false

  const put = (id, who, raw) => {
    if (!id) return
    const text = (raw || '').trim()
    if (!text) return
    const at = index.get(id)
    if (at === undefined) {
      index.set(id, next.length)
      next.push({ id, who, text })
      changed = true
      return
    }
    if (next[at].text !== text) {
      next[at] = { ...next[at], text }
      changed = true
    }
  }

  // Префикс вешаем ПОСЛЕ проверки ключа: с ним пустой ключ становится
  // непустым 'u:', и реплика без streamInfo заводила бы новую строку на каждое
  // обновление.
  for (const seg of agentSegments) {
    const id = seg?.id
    if (id) put(`a:${id}`, 'tutor', seg?.text)
  }
  for (const stream of userStreams) {
    const id = userTurnKey(stream)
    if (id) put(`u:${id}`, 'me', stream?.text)
  }

  return changed ? next : prev
}
