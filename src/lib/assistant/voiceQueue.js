// Очередь озвучки ответа помощника: фраза → /api/assistant/speak (голос Луны,
// Gemini) → адрес потока → общий <audio> из speech.js (разрешение iPhone
// играть звук живёт на нём, и его выдал тап по микрофону). С 15.10.2026 роут
// отвечает не записью, а адресом билета ({ stream: true }): синтез идёт
// потоком, и фраза начинает звучать с первых байт (через MediaSource —
// streamSource.js), а не через 3–4 с, когда REST соберёт её целиком. Где
// MediaSource для MP3 нет (iPhone), поток не просим — запись целиком, как
// раньше. Пока звучит текущая фраза, готовятся LOOKAHEAD
// следующих — их POST сразу запускает синтез на сервере, и к своей очереди
// фраза уже лежит там готовой. Дальше не забегаем: ученик может оборвать
// ответ, и синтез остального был бы впустую.
//
// Запасной голос — потоковый /api/tts (Soniox «Grace», откатный голос Луны у
// агента): первый звук через ~0.6 с. Им же сразу идёт казахский ответ — у
// Gemini казахского нет. Раньше запасной Soniox собирал сервер, целиком: 10–12 с
// на фразу, и ответ вставал.
//
// Голос один на весь ответ, и выбирает его язык САМОГО ответа, а не
// интерфейса: Луна отвечает на языке вопроса, и русский ответ в казахском
// интерфейсе должен звучать её голосом (Gemini), а не казахским синтезом. Если
// первая фраза казахская — весь ответ идёт с lang kk (иначе посреди ответа
// тембр сменился бы с Gemini на Soniox).
//
// Звук на сайте один (speech.js), и чужая реплика — ученик нажал «послушать» у
// слова, экран ушёл и всё заглушил — обрывает фразу Луны. Тогда очередь
// замолкает целиком, а не перебивает чужой звук следующей фразой.
//
// Айзере (помощник при казахском интерфейсе, persona.js) говорит своим голосом
// ElevenLabs на любом языке, казахском тоже: обходного пути «казахское — сразу
// потоком» у неё нет, а запасной поток — её откатный голос Soniox «Maya». Её
// фразы с 28.10.2026 тоже идут билетом и потоком (/stream ElevenLabs).

import { playUrl, stopTts } from '../speech.js'
import { ttsUrl } from '../ttsShared.js'
import { phraseLang } from './phraseLang.js'
import { PERSONAS } from './persona.js'
import { canStream, streamSource } from './streamSource.js'

export const LOOKAHEAD = 2

export { phraseLang }

/**
 * Тело запроса к /api/assistant/speak: голос — потоком (см. шапку), если
 * браузер умеет играть его через MediaSource (streamSource.js); иначе — как
 * раньше, записью целиком. persona — чьим голосом (persona.js).
 */
export const speakBody = (text, lang, persona) =>
  JSON.stringify(canStream() ? { text, lang, persona, stream: true } : { text, lang, persona })

/**
 * Ответ /api/assistant/speak → адрес билета (поток) или запись целиком (Blob):
 * казахская фраза и сервер с выключенным потоком отвечают записью. null —
 * голоса нет, вызывающий берёт запасной.
 * @returns {Promise<string | Blob | null>}
 */
export async function speakSource(r) {
  if (!r?.ok) return null
  if ((r.headers.get('content-type') || '').includes('application/json')) {
    const data = await r.json().catch(() => null)
    const url = typeof data?.url === 'string' ? data.url : ''
    return url.startsWith('/api/assistant/speak?') ? url : null
  }
  return r.blob()
}

/**
 * lang (язык интерфейса) голос не выбирает — см. phraseLang; принят для
 * совместимости вызова. Голос выбирает persona.
 * @param {{ token: string, lang?: string, persona?: { id: string, fallbackVoice: string }, fetchImpl?: typeof fetch,
 *           play?: typeof playUrl, stopSound?: typeof stopTts,
 *           onPhrase?: (index: number) => void,
 *           onSound?: (index: number) => void,
 *           onInterrupt?: () => void,
 *           onFinish?: (r: { played: number, failed: number }) => void }} opts
 *   onPhrase — фраза номер index (по порядку say) зазвучала — или пропущена,
 *   потому что не зазвучала вовсе: по нему виджет показывает текст ответа
 *   вслед за голосом, и пропущенная фраза не должна держать его скрытым.
 *   onSound — один раз, когда зазвучала первая фраза (пропущенная не в счёт):
 *   окно меряет по нему, через сколько после вопроса Луна заговорила
 *   (voiceTiming.js).
 *   onInterrupt — очередь замолкла от чужого звука (см. шапку); после своего
 *   stop() не зовётся.
 *   onFinish — один раз, когда после end() доиграна вся очередь; после stop()
 *   и чужого звука не зовётся.
 */
export function createVoiceQueue({
  token,
  persona = PERSONAS.luna,
  fetchImpl = (...args) => fetch(...args),
  play = playUrl,
  stopSound = stopTts,
  onPhrase,
  onSound,
  onInterrupt,
  onFinish,
} = {}) {
  const items = [] // { text, url: Promise<string|null> | null }
  const urls = new Set()
  const ctrl = new AbortController()
  let idx = 0
  let busy = false
  let ended = false
  let stopped = false
  let finished = false
  let voiceLang = null
  let played = 0
  let failed = 0
  let reached = -1 // последняя фраза, о которой сказали onPhrase
  let sounded = false

  // Каждой фразе — один раз и по порядку.
  const reach = (i) => {
    if (i <= reached) return
    reached = i
    onPhrase?.(i)
  }

  const revoke = (u) => {
    if (u && urls.delete(u)) URL.revokeObjectURL(u)
  }

  // Потоковая запись той же фразы запасным голосом.
  const streamUrl = (text) => ttsUrl({ text, voice: persona.fallbackVoice, lang: voiceLang })

  function load(item) {
    if (item.url) return item.url
    if (voiceLang === 'kk' && !persona.speaksKazakh) {
      item.url = Promise.resolve(streamUrl(item.text))
      return item.url
    }
    item.url = fetchImpl('/api/assistant/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: speakBody(item.text, voiceLang, persona.id),
      signal: ctrl.signal,
    })
      .then(speakSource)
      .then((b) => {
        if (stopped) return null
        if (!b) return streamUrl(item.text)
        // Адрес билета: фраза играется потоком через MediaSource.
        const u = typeof b === 'string' ? streamSource(b) : URL.createObjectURL(b)
        if (u === b) return u
        urls.add(u)
        return u
      })
      // Сеть упала — тоже запасной поток; оборвали сами (stop) — ничего.
      .catch((e) => (stopped || e?.name === 'AbortError' ? null : streamUrl(item.text)))
    return item.url
  }

  // Фразу оборвал чужой звук: замолкаем целиком, чужое не трогаем.
  function yieldToOther(resolve) {
    if (stopped) return resolve()
    stopped = true
    ctrl.abort()
    for (const u of [...urls]) revoke(u)
    onInterrupt?.()
    resolve()
  }

  function finish() {
    if (finished || stopped) return
    finished = true
    onFinish?.({ played, failed })
  }

  async function pump() {
    if (busy || stopped) return
    if (idx >= items.length) {
      if (ended) finish()
      return
    }
    busy = true
    const at = idx
    const item = items[at]
    for (let k = 1; k <= LOOKAHEAD && items[at + k]; k++) load(items[at + k])
    const url = await load(item)
    if (stopped) return
    const skip = () => {
      failed++
      reach(at)
    }
    if (url) {
      await new Promise((resolve) => {
        const ok = play(url, {
          onStart: () => {
            reach(at)
            if (sounded) return
            sounded = true
            onSound?.(at)
          },
          onEnd: (reason) => {
            if (reason === 'stopped' && !stopped) return yieldToOther(resolve)
            played++
            resolve()
          },
          onCancel: () => yieldToOther(resolve),
          onFail: () => {
            skip()
            resolve()
          },
        })
        if (ok === false) {
          skip()
          resolve()
        }
      })
      revoke(url)
    } else skip()
    if (stopped) return
    idx++
    busy = false
    pump()
  }

  return {
    say(text) {
      const t = String(text ?? '').trim()
      if (!t || stopped) return
      voiceLang ??= phraseLang(t)
      items.push({ text: t, url: null })
      // Фраза пришла, пока звучит предыдущая, — готовим её сразу, если она в
      // пределах LOOKAHEAD.
      if (busy && items.length - 1 <= idx + LOOKAHEAD) load(items[items.length - 1])
      pump()
    },
    end() {
      ended = true
      pump()
    },
    stop() {
      if (stopped) return
      stopped = true
      ctrl.abort()
      // Своей реплики ещё не было — общий элемент не трогаем: на нём может
      // звучать чужое «послушать» или тишина разблокировки iPhone.
      if (busy) stopSound()
      for (const u of [...urls]) revoke(u)
    },
  }
}
