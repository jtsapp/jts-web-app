// Поток голоса Луны → общий <audio> через MediaSource.
//
// Просто отдать адрес потока в <audio src> мало: Chrome открывает поток MP3
// (loadedmetadata) только набрав ~32 КБ кадров. Стенд 15.10.2026 (запись Луны,
// отданная потоком в темпе синтеза): 64 кбит/с — звук через 3.1 с, 128 — 1.4 с,
// 32 — только в конце потока; пустой тег ID3 на 32 КБ впереди не помогает.
// Короткая первая фраза ответа и есть эти 32 КБ, то есть поток по ссылке почти
// ничего бы не дал. MediaSource играет с первых кадров: на том же стенде звук
// через 0.15–0.3 с после первого байта.
//
// Где MediaSource для MP3 нет (iPhone: там только ManagedMediaSource), поток не
// просим вовсе — роут отвечает записью целиком, как раньше (canStream →
// speakBody в voiceQueue.js): как Safari играет живой поток без Range, здесь
// не проверить, а тишина хуже задержки.
//
// Элемент — тот же общий <audio> из speech.js (разрешение iPhone живёт на нём):
// адрес MediaSource — обычный blob:-адрес. Он одноразовый: каждое
// проигрывание — свой streamSource.

// Сколько накопить перед первым кадром: ~0.5 с речи на 64 кбит/с
// (MP3_KBPS в speakStream.js). Синтез идёт быстрее речи, но не намного, и без
// запаса фраза заикалась бы на первом же сетевом рывке.
export const PREBUFFER_BYTES = 4096

const MIME = 'audio/mpeg'

/** Можно ли играть поток MP3 через MediaSource. */
export function canStream(win = typeof window === 'undefined' ? undefined : window) {
  try {
    return Boolean(win?.MediaSource?.isTypeSupported?.(MIME))
  } catch {
    return false
  }
}

function append(sb, buf) {
  return new Promise((resolve, reject) => {
    sb.addEventListener('updateend', resolve, { once: true })
    sb.addEventListener('error', reject, { once: true })
    sb.appendBuffer(buf)
  })
}

function concat(parts, size) {
  if (parts.length === 1) return parts[0]
  const out = new Uint8Array(size)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/**
 * Адрес для <audio>: MediaSource, который при подключении к элементу сам
 * забирает поток url. Без MediaSource — сам url.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, win?: Window }} [opts]
 */
export function streamSource(url, { fetchImpl, win = typeof window === 'undefined' ? undefined : window } = {}) {
  if (!url || !canStream(win)) return url
  const doFetch = fetchImpl || ((...a) => win.fetch(...a))
  const ms = new win.MediaSource()
  let reader = null
  let closed = false

  // Элемент отпустил источник (stopTts, новая реплика) — докачивать незачем.
  ms.addEventListener(
    'sourceclose',
    () => {
      closed = true
      reader?.cancel().catch(() => {})
    },
    { once: true },
  )
  ms.addEventListener('sourceopen', () => feed(), { once: true })

  async function feed() {
    let sb = null
    let appended = 0
    try {
      sb = ms.addSourceBuffer(MIME)
      const res = await doFetch(url)
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      reader = res.body.getReader()
      let parts = []
      let size = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (closed) return
        if (value?.length) {
          parts.push(value)
          size += value.length
        }
        if (size && (done || appended || size >= PREBUFFER_BYTES)) {
          await append(sb, concat(parts, size))
          appended += size
          parts = []
          size = 0
          if (closed) return
        }
        if (done) break
      }
      if (ms.readyState === 'open') ms.endOfStream()
    } catch {
      if (closed) return
      // Звука не было — ошибка элемента (speech.js сочтёт это onFail); был —
      // доигрываем, что успело прийти.
      try {
        if (ms.readyState === 'open') ms.endOfStream(appended ? undefined : 'network')
      } catch {
        /* источник уже закрыт */
      }
    }
  }

  return win.URL.createObjectURL(ms)
}
