// Замер голосового ответа помощника: через сколько после вопроса пришёл текст и
// зазвучал голос (и сколько шло распознавание, если вопрос голосом).
//
// Зачем: голос Луны с 28.10.2026 идёт потоком (api/assistant/speak), и прежде
// задержку окна никто не мерил вовсе — у звонка есть строка LATENCY luna, а у
// окна была лишь сумма отдельно замеренных звеньев, которая однажды уже
// соврала втрое. Логов стенда отсюда не прочитать, поэтому замер виден в самом
// окне — подписью под ответом, но только на деве (dev-…) и по флагу
// localStorage jts_luna_timing=1: ученику на проде эти цифры ни к чему.

export const TIMING_FLAG = 'jts_luna_timing'

/** Показывать ли подпись замера: дев-стенд или флаг устройства. */
export function voiceTimingVisible(hostname, storage) {
  try {
    if (storage?.getItem(TIMING_FLAG) === '1') return true
  } catch {
    /* хранилище закрыто — решает адрес */
  }
  return /^dev-/i.test(String(hostname || ''))
}

const sec = (ms) => (Math.round(ms / 100) / 10).toFixed(1)

/**
 * Части подписи по порядку: распознавание, текст, голос. Нет замера — нет части.
 * @param {{ sttMs?: number|null, textMs?: number|null, soundMs?: number|null }} timing
 * @param {(key: string, vars?: object) => string} t
 */
export function timingParts(timing, t) {
  const parts = []
  const add = (key, ms) => {
    if (Number.isFinite(ms) && ms >= 0) parts.push(t(key, { s: sec(ms) }))
  }
  add('assistant.timing.stt', timing?.sttMs)
  add('assistant.timing.text', timing?.textMs)
  add('assistant.timing.sound', timing?.soundMs)
  return parts
}
