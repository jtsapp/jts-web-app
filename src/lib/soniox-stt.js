// Soniox speech-to-text для короткого аудио — разговорный тест уровня и IELTS
// Speaking Part 1. Раньше STT шёл через Azure (azure-pronunciation), но
// AZURE_SPEECH_KEY на проде не задан → транскрипт был пустой.
//
// Используем Soniox REAL-TIME STT (websocket stt-rt.soniox.com) — тот же стек,
// что у голосового агента (livekit-plugins-soniox) и у tutor-tts
// (tts-rt.soniox.com); наш SONIOX_API_KEY работает именно для real-time
// эндпоинтов. Async REST (api.soniox.com/v1) этим ключом отдаёт 401 — поэтому НЕ
// используем его.
//
// Контракт как у transcribeWav: WAV-буфер на вход, распознанный текст на выход;
// '' при ЛЮБОЙ проблеме — экран теста тогда деградирует (пустой транскрипт), а
// не падает. Одноразово: открыли сокет, стримнули весь WAV бинарными фреймами,
// послали "" (конец), собрали финальные токены до `finished`.

const WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket'
const MODEL = process.env.SONIOX_STT_MODEL || 'stt-rt-v5'

export function isSonioxConfigured() {
  return Boolean(process.env.SONIOX_API_KEY)
}

function joinTokens(tokens) {
  return tokens.join('').replace(/\s+/g, ' ').trim()
}

export async function transcribeWavSoniox(wav, { lang = 'en', timeoutMs = 25000 } = {}) {
  const key = process.env.SONIOX_API_KEY
  if (!key) return ''
  if (!wav || wav.length === 0) return ''
  if (typeof WebSocket === 'undefined') {
    console.error('[soniox-stt] global WebSocket unavailable in this runtime')
    return ''
  }

  return new Promise((resolve) => {
    const finalTokens = []
    let settled = false
    let ws
    const finish = (text) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws?.close()
      } catch {
        /* уже закрыт */
      }
      resolve(text)
    }
    const timer = setTimeout(() => {
      console.error('[soniox-stt] timeout')
      finish(joinTokens(finalTokens))
    }, timeoutMs)

    try {
      ws = new WebSocket(WS_URL)
    } catch (e) {
      console.error('[soniox-stt] ws construct failed', e)
      finish('')
      return
    }
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            api_key: key,
            model: MODEL,
            audio_format: 'auto', // WAV с заголовком — Soniox определит формат сам
            language_hints: [lang],
          }),
        )
        // Весь WAV — бинарными кусками, затем "" как признак конца потока.
        const CHUNK = 48 * 1024
        for (let i = 0; i < wav.length; i += CHUNK) {
          ws.send(wav.subarray(i, i + CHUNK))
        }
        ws.send('')
      } catch (e) {
        console.error('[soniox-stt] send failed', e)
        finish(joinTokens(finalTokens))
      }
    }

    ws.onmessage = (ev) => {
      try {
        const raw = typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8')
        const msg = JSON.parse(raw)
        if (msg.error_code || msg.error_message) {
          console.error('[soniox-stt] server error', msg.error_code, msg.error_message)
          finish(joinTokens(finalTokens))
          return
        }
        if (Array.isArray(msg.tokens)) {
          for (const t of msg.tokens) {
            // Берём только финальные токены; служебные маркеры (<end> и т.п.) —
            // мимо.
            if (t?.is_final && typeof t.text === 'string' && !/^<.*>$/.test(t.text)) {
              finalTokens.push(t.text)
            }
          }
        }
        if (msg.finished) finish(joinTokens(finalTokens))
      } catch (e) {
        console.error('[soniox-stt] parse failed', e)
      }
    }

    ws.onerror = (e) => {
      console.error('[soniox-stt] ws error', e?.message || 'error')
      finish(joinTokens(finalTokens))
    }
    ws.onclose = () => finish(joinTokens(finalTokens))
  })
}
