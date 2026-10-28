// Голос Луны в туре по экрану: шаг за шагом, по «Далее» ученика.
//
// Не очередь ответа (voiceQueue.js): реплики тура известны заранее, поэтому
// СЛЕДУЮЩИЙ шаг синтезируется, пока ученик слушает текущий, и по «Далее» звучит
// сразу. Синтез идёт потоком (с 15.10.2026: роут отдаёт адрес билета, а не
// запись), но и потоку нужна секунда-другая до первого звука, а раньше REST
// собирал шаг целиком 5–7 с — ученик успевал нажать «Далее» раньше, чем Луна
// заговорит, и тур шёл молча. Билет живёт на сервере пять минут: шаг, на
// котором ученик задержался дольше TICKET_FRESH_MS, просит следующий заново.
//
// Шаг — две фразы: заголовок (короткий, синтезируется быстро — Луна начинает
// говорить почти сразу) и текст. Голос и запасной путь — как у ответов чата:
// Gemini «Aoede» через /api/assistant/speak, при сбое и для казахского —
// потоковый /api/tts голосом Soniox «Grace».
//
// Звук на сайте один (speech.js): новая реплика тура обрывает прошлую, а чужой
// звук («послушать» у слова) обрывает реплику тура — дальше по этому шагу Луна
// молчит, следующий шаг звучит как обычно.
//
// Тур Айзере (казахский интерфейс, persona.js) — её голосом на любом языке,
// запасной поток — Soniox «Maya», как у ответов чата.

import { playUrl, stopTts } from '../speech.js'
import { ttsUrl } from '../ttsShared.js'
import { phraseLang, speakBody, speakSource } from './voiceQueue.js'
import { stripEmoji } from './speechChunks.js'
import { PERSONAS } from './persona.js'
import { streamSource } from './streamSource.js'

// Билет сервера живёт 5 минут (TICKET_TTL_MS в speakStream.js) — берём с запасом.
export const TICKET_FRESH_MS = 4 * 60_000

/** Фразы шага: заголовок и текст отдельно (см. шапку). */
export function stepPhrases(step) {
  if (!step) return []
  const clean = (s) => stripEmoji(typeof s === 'string' ? s : '').replace(/\s+/g, ' ').trim()
  const title = clean(step.title)
  const text = clean(step.text)
  const head = title && !/[.!?…:]$/.test(title) ? `${title}.` : title
  return [head, text].filter(Boolean)
}

/**
 * @param {{ token: string, persona?: { id: string, fallbackVoice: string, speaksKazakh: boolean },
 *           fetchImpl?: typeof fetch, play?: typeof playUrl, stopSound?: typeof stopTts }} opts
 */
export function createTourVoice({
  token,
  persona = PERSONAS.luna,
  fetchImpl = (...args) => fetch(...args),
  play = playUrl,
  stopSound = stopTts,
  now = () => Date.now(),
} = {}) {
  const cache = new Map() // фраза → { url: Promise<url|null>, at, ticket }
  const blobUrls = new Set()
  const ctrl = new AbortController()
  let seq = 0
  let playing = false
  let disposed = false

  const streamUrl = (text, lang) => ttsUrl({ text, voice: persona.fallbackVoice, lang })

  function load(text) {
    const hit = cache.get(text)
    // Адрес билета протух — сервер его уже забыл, и <audio> получил бы 404.
    if (hit && !(hit.ticket && now() - hit.at > TICKET_FRESH_MS)) return hit.url
    const lang = phraseLang(text)
    const entry = { url: null, at: now(), ticket: false }
    entry.url =
      lang === 'kk' && !persona.speaksKazakh
        ? Promise.resolve(streamUrl(text, lang))
        : fetchImpl('/api/assistant/speak', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
            body: speakBody(text, lang, persona.id),
            signal: ctrl.signal,
          })
            .then(speakSource)
            .then((b) => {
              if (disposed) return null
              if (!b) return streamUrl(text, lang)
              if (typeof b === 'string') {
                entry.ticket = true
                return b
              }
              const u = URL.createObjectURL(b)
              blobUrls.add(u)
              return u
            })
            .catch((e) => (disposed || e?.name === 'AbortError' ? null : streamUrl(text, lang)))
    cache.set(text, entry)
    return entry.url
  }

  function stop() {
    seq++
    // Своя реплика не звучит — общий элемент не трогаем: на нём может играть
    // чужое «послушать» или тишина разблокировки iPhone.
    if (playing) stopSound()
    playing = false
  }

  return {
    /** Подготовить фразы заранее (следующий шаг). */
    prefetch(phrases) {
      if (disposed) return
      for (const p of phrases || []) if (p) load(p)
    },
    /** Сказать фразы шага по порядку; прошлый шаг обрывается. */
    async say(phrases) {
      if (disposed) return
      stop()
      const my = seq
      const list = (phrases || []).filter(Boolean)
      list.forEach(load)
      for (const text of list) {
        const url = await load(text)
        if (my !== seq || disposed) return
        if (!url) continue
        // Билет играется потоком через MediaSource, а её адрес одноразовый:
        // свой на каждое проигрывание (шаг могут повторить «Назад»/«Далее»).
        const src = url.startsWith('/api/assistant/speak?') ? streamSource(url) : url
        const finished = await new Promise((resolve) => {
          playing = true
          const ok = play(src, {
            onEnd: (reason) => resolve(reason !== 'stopped'),
            onCancel: () => resolve(false),
            onFail: () => resolve(true),
          })
          if (ok === false) resolve(true)
        })
        if (src !== url) URL.revokeObjectURL(src)
        if (my === seq) playing = false
        if (!finished || my !== seq) return
      }
    },
    stop,
    /** Тур закончен: замолчать и отпустить всё, что успели синтезировать. */
    dispose() {
      if (disposed) return
      stop()
      disposed = true
      ctrl.abort()
      for (const u of blobUrls) URL.revokeObjectURL(u)
      blobUrls.clear()
      cache.clear()
    },
  }
}
