// Голос Луны в туре по экрану: шаг за шагом, по «Далее» ученика.
//
// Не очередь ответа (voiceQueue.js): реплики тура известны заранее, поэтому
// СЛЕДУЮЩИЙ шаг синтезируется, пока ученик слушает текущий, и по «Далее» звучит
// сразу. Gemini не потоковый — ~1.5 с + 40 мс на символ (замер 14.10.2026), — и
// без запаса каждый шаг начинался бы с 5–7 с тишины: ученик успевал нажать
// «Далее» раньше, чем Луна заговорит, и тур шёл молча.
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
import { phraseLang } from './voiceQueue.js'
import { stripEmoji } from './speechChunks.js'
import { PERSONAS } from './persona.js'

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
} = {}) {
  const cache = new Map() // фраза → Promise<url|null>
  const blobUrls = new Set()
  const ctrl = new AbortController()
  let seq = 0
  let playing = false
  let disposed = false

  const streamUrl = (text, lang) => ttsUrl({ text, voice: persona.fallbackVoice, lang })

  function load(text) {
    if (cache.has(text)) return cache.get(text)
    const lang = phraseLang(text)
    const url =
      lang === 'kk' && !persona.speaksKazakh
        ? Promise.resolve(streamUrl(text, lang))
        : fetchImpl('/api/assistant/speak', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
            body: JSON.stringify({ text, lang, persona: persona.id }),
            signal: ctrl.signal,
          })
            .then((r) => (r.ok ? r.blob() : null))
            .then((b) => {
              if (disposed) return null
              if (!b) return streamUrl(text, lang)
              const u = URL.createObjectURL(b)
              blobUrls.add(u)
              return u
            })
            .catch((e) => (disposed || e?.name === 'AbortError' ? null : streamUrl(text, lang)))
    cache.set(text, url)
    return url
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
        const finished = await new Promise((resolve) => {
          playing = true
          const ok = play(url, {
            onEnd: (reason) => resolve(reason !== 'stopped'),
            onCancel: () => resolve(false),
            onFail: () => resolve(true),
          })
          if (ok === false) resolve(true)
        })
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
