'use client'

// Browser audio helpers for the IELTS sections: mic capture → 16 kHz mono WAV
// (what Azure Pronunciation Assessment takes), and playback of the Listening
// scripts.
//
// Ported from the relevant slice of felix lib/voice.ts. The server-voice
// (Gemini TTS) leg of speakListeningAudio is dropped — this app has no Gemini
// key — so the fallback chain is ElevenLabs → browser SpeechSynthesis.

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? window.webkitAudioContext ?? null
}

function getOfflineAudioContextCtor() {
  if (typeof window === 'undefined') return null
  return window.OfflineAudioContext ?? window.webkitOfflineAudioContext ?? null
}

export function isMediaRecordingSupported() {
  if (typeof window === 'undefined') return false
  const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia
  const hasRecorder = typeof MediaRecorder !== 'undefined'
  return hasGetUserMedia && hasRecorder && getAudioContextCtor() !== null
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // format = PCM
  view.setUint16(22, 1, true) // channels = mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate (mono * 16-bit)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}

/** Decode any recorded blob and re-render it to a 16 kHz mono WAV blob. */
export async function blobToWav16kMono(blob) {
  const Ctx = getAudioContextCtor()
  const OfflineCtx = getOfflineAudioContextCtor()
  if (!Ctx || !OfflineCtx) throw new Error('Web Audio API unavailable')

  const arrayBuf = await blob.arrayBuffer()
  const decodeCtx = new Ctx()
  let decoded
  try {
    // slice(0) hands decodeAudioData its own copy (some browsers detach it).
    decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0))
  } finally {
    void decodeCtx.close()
  }

  const targetRate = 16000
  const frames = Math.max(1, Math.ceil(decoded.duration * targetRate))
  const offline = new OfflineCtx(1, frames, targetRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  return encodeWav(rendered.getChannelData(0), targetRate)
}

// ---------------------------------------------------------------------------
// Listening playback
// ---------------------------------------------------------------------------

let currentAudio = null
let currentObjectUrl = null
// Поколение нажатия на «послушать» — см. playTutorSample.
let sampleSeq = 0

function stopServerAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause()
    } catch {
      /* ignore */
    }
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

/** Stop any in-flight listening audio (leaving the screen, submitting). */
export function cancelSpeech() {
  if (typeof window === 'undefined') return
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  stopServerAudio()
}

// 8 мс тишины, 16-бит моно 8 кГц. Нужен именно валидный источник: play() на
// элементе без src отклоняется с NotSupportedError и разрешения не даёт.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

/**
 * Создать <audio> и разблокировать его прямо в тике пользовательского жеста.
 *
 * iOS Safari выдаёт разрешение на воспроизведение не странице, а конкретному
 * элементу, и только если play() вызван до того, как жест «протух» — то есть до
 * первого await. Оба серверных голоса сначала идут в сеть (fetch → blob), и
 * элемент, созданный после этого, на iPad уже молчит, а вызывающий код считает,
 * что всё сыграло. Разрешение живёт на элементе и переживает подмену src,
 * поэтому элемент заводим здесь, по нажатию, а blob-URL подставим в него, когда
 * придёт ответ сервера.
 *
 * playTutorSample в этом не нуждается: там файл известен сразу и play() зовётся
 * без предшествующего await.
 */
function createGestureUnlockedAudio() {
  const audio = new Audio(SILENT_WAV)
  try {
    const primed = audio.play()
    // Заглушку оборвёт подмена src — этот отказ ожидаем и не должен всплыть
    // необработанным промисом.
    if (primed && typeof primed.catch === 'function') primed.catch(() => {})
  } catch {
    // Разблокировать не вышло (jsdom, старый браузер) — дальше как раньше.
  }
  return audio
}

// Сколько ждём, что синтезатор действительно заговорит, прежде чем считать
// фолбэк несработавшим. С запасом больше старта локального голоса и холодного
// старта сетевых голосов Chrome — чтобы не отбирать звук у десктопа, где он есть.
const SPEECH_START_TIMEOUT_MS = 2000

// Browser SpeechSynthesis fallback, so a learner without ElevenLabs configured
// still hears the clip.
//
// Успехом считаем onstart, а не «speak() не бросил исключение». speak() — это
// синхронная постановка в очередь, она ничего не знает о звуке: на iOS вызов
// без пользовательского жеста (а сюда мы попадаем уже после await fetch, то
// есть жест потерян) молча не произносит ничего и при этом не бросает.
// speechSynthesis.speaking там тоже врёт — он про непустую очередь, а не про
// речь. Вызывающий верил этому «true», и экран Listening залипал в «Играет…»,
// сжигая прослушивание. Достоверен только onstart; onerror — явный отказ;
// таймаут закрывает iOS-случай, когда не приходит ни то, ни другое.
async function speakBrowser(text, opts) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    const synth = window.speechSynthesis
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.95
    if (opts.volume != null) u.volume = Math.max(0, Math.min(1, opts.volume))
    let started = false
    // onEnd — только для речи, которая звучала: наш собственный cancel() по
    // таймауту часть браузеров присылает как end, и без этой проверки «конец»
    // прилетел бы на прослушивание, о котором мы уже отчитались как о
    // несостоявшемся, и снова сдвинул бы состояние экрана.
    u.onend = () => {
      if (started) opts.onEnd?.()
    }
    synth.cancel()
    const spoke = await new Promise((resolve) => {
      let settled = false
      let timer = null
      const settle = (ok) => {
        if (settled) return
        settled = true
        started = ok
        if (timer !== null) clearTimeout(timer)
        resolve(ok)
      }
      // Снимаем очередь, чтобы опоздавшая речь не заговорила поверх экрана,
      // который мы уже вернули в исходное состояние.
      timer = setTimeout(() => {
        synth.cancel()
        settle(false)
      }, SPEECH_START_TIMEOUT_MS)
      u.onstart = () => settle(true)
      u.onerror = () => settle(false)
      synth.speak(u)
    })
    return spoke
  } catch {
    return false
  }
}

/**
 * Play a Listening clip via the low-latency ElevenLabs route
 * (/api/listening-audio), falling back to browser TTS so the learner always
 * hears the prompt. Returns which path played, or "none" if nothing did.
 *
 * "fallback" означает, что браузерный синтез ПОДТВЕРДИЛ начало речи (см.
 * speakBrowser), а не просто принял её в очередь. На это опирается экран
 * Listening: он списывает прослушивание только за звук, который зазвучал.
 *
 * @returns {Promise<"eleven" | "fallback" | "none">}
 */
export async function speakListeningAudio(text, opts = {}) {
  if (!text.trim()) return 'none'
  try {
    // Сначала гасим предыдущее — иначе новый элемент попал бы под свой же
    // stopServerAudio() строкой ниже.
    stopServerAudio()
    // ДО первого await, пока жив жест, — см. createGestureUnlockedAudio.
    // Внутри try намеренно: если конструктор Audio недоступен (SSR, чужой
    // webview), сбой обязан уйти в общий catch и вернуть код возврата, а не
    // отклонённый промис — вызывающий его не ловит и кнопка залипнет.
    const audio = createGestureUnlockedAudio()
    // Под общее владение модуля сразу, а не только когда придёт звук: если
    // сеть не ответит, элемент с тишиной погасит хвост функции или следующее
    // нажатие, а не «как-нибудь сам».
    currentAudio = audio
    const res = await fetch('/api/listening-audio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const blob = await res.blob()
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob)
        // Играем тем же элементом, что разблокировали при нажатии: подмена src
        // выданное жестом разрешение не сбрасывает.
        audio.src = url
        if (opts.volume != null) audio.volume = Math.max(0, Math.min(1, opts.volume))
        currentAudio = audio
        currentObjectUrl = url
        audio.onended = () => {
          stopServerAudio()
          opts.onEnd?.()
        }
        audio.onerror = () => stopServerAudio()
        await audio.play()
        return 'eleven'
      }
    } else {
      console.warn(`[listening-audio] ElevenLabs failed (HTTP ${res.status}); falling back.`)
    }
  } catch (e) {
    console.warn('[listening-audio] ElevenLabs error; falling back:', e)
    stopServerAudio()
  }
  // Ни один серверный путь не сыграл — гасим разблокированную тишину, иначе
  // она осталась бы висеть в currentAudio до следующего нажатия.
  stopServerAudio()
  return (await speakBrowser(text, opts)) ? 'fallback' : 'none'
}

/**
 * Play the tutor's pre-recorded voice card from public/tutor/voice/<key>.mp3.
 *
 * Экран выбора тьютора крутит одну и ту же фразу всем и помногу раз, поэтому
 * она лежит файлом, а не синтезируется на каждое нажатие: не платим провайдеру
 * за один и тот же звук, не ждём сеть и не зависим от квоты в момент, когда
 * ученик только знакомится с приложением. Файлы озвучены голосами тех же
 * провайдеров (см. scripts/make-tutor-voice-samples.js), так что тембр совпадает
 * с тем, каким тьютор заговорит вживую.
 *
 * Браузерного фолбэка тут нет намеренно: файл либо есть в сборке, либо его
 * отсутствие — это баг деплоя, который надо чинить, а не маскировать
 * роботизированным голосом поверх тщательно подобранного тембра.
 *
 * Звучит всегда ровно одна визитка: новое нажатие останавливает предыдущую,
 * а серия нажатий подряд оставляет играть только последнее. "superseded" —
 * это нормальный исход для нажатия, которое успели сменить, а не ошибка.
 *
 * @param {'luna'|'dexter'|'spark'} tutor
 * @param {{ volume?: number, onEnd?: () => void }} [opts]
 * @returns {Promise<"sample" | "superseded" | "none">}
 */
export async function playTutorSample(tutor, opts = {}) {
  if (!tutor) return 'none'
  // Номер нажатия. Звучит всегда ровно одна визитка — последняя нажатая, —
  // а без этого счётчика получается гонка: play() асинхронный, и когда второе
  // нажатие ставит паузу первому, тот отвечает AbortError («play() request was
  // interrupted by a call to pause()»). Его catch и onerror сработали бы уже
  // ПОСЛЕ старта второго звука и заглушили бы именно его — то есть быстрый
  // двойной клик давал тишину. Поэтому обработчики старого нажатия молчат,
  // если поколение сменилось.
  const seq = ++sampleSeq
  const stale = () => seq !== sampleSeq
  try {
    stopServerAudio()
    const audio = new Audio(`/tutor/voice/${tutor}.mp3`)
    if (opts.volume != null) audio.volume = Math.max(0, Math.min(1, opts.volume))
    currentAudio = audio
    audio.onended = () => {
      if (stale()) return
      stopServerAudio()
      opts.onEnd?.()
    }
    audio.onerror = () => {
      if (!stale()) stopServerAudio()
    }
    await audio.play()
    return stale() ? 'superseded' : 'sample'
  } catch (e) {
    // Нас прервало следующее нажатие — это норма, а не сбой.
    if (stale()) return 'superseded'
    console.warn('[tutor-sample] playback failed:', e)
    stopServerAudio()
    return 'none'
  }
}

/**
 * Speak `text` in a specific tutor's voice via /api/tutor-tts (Gemini for
 * Luna/Dexter, Soniox for Spark). Falls back to browser speech if the server
 * TTS is unconfigured or fails, so a "listen" button always does something.
 *
 * Для готовых реплик (визитка на экране выбора) есть playTutorSample выше —
 * этот путь остаётся для ДИНАМИЧЕСКОГО текста, который заранее не озвучить:
 * задание placement-теста в SpeakingTestPage.
 *
 * @param {'luna'|'dexter'|'spark'} tutor
 * @param {string} text
 * @param {{ lang?: 'en'|'ru'|'kz', volume?: number, onEnd?: () => void }} [opts]
 * @returns {Promise<"tutor" | "fallback" | "none">}
 */
export async function speakTutorVoice(tutor, text, opts = {}) {
  if (!text.trim()) return 'none'
  try {
    // Сначала гасим предыдущее — иначе новый элемент попал бы под свой же
    // stopServerAudio() строкой ниже.
    stopServerAudio()
    // ДО первого await, пока жив жест, — см. createGestureUnlockedAudio.
    // Внутри try намеренно: если конструктор Audio недоступен (SSR, чужой
    // webview), сбой обязан уйти в общий catch и вернуть код возврата, а не
    // отклонённый промис — вызывающий его не ловит и кнопка залипнет.
    const audio = createGestureUnlockedAudio()
    // Под общее владение модуля сразу, а не только когда придёт звук: если
    // сеть не ответит, элемент с тишиной погасит хвост функции или следующее
    // нажатие, а не «как-нибудь сам».
    currentAudio = audio
    const res = await fetch('/api/tutor-tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tutor, text, lang: opts.lang || 'en' }),
    })
    if (res.ok) {
      const blob = await res.blob()
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob)
        // Играем тем же элементом, что разблокировали при нажатии: подмена src
        // выданное жестом разрешение не сбрасывает.
        audio.src = url
        if (opts.volume != null) audio.volume = Math.max(0, Math.min(1, opts.volume))
        currentAudio = audio
        currentObjectUrl = url
        audio.onended = () => {
          stopServerAudio()
          opts.onEnd?.()
        }
        audio.onerror = () => stopServerAudio()
        await audio.play()
        return 'tutor'
      }
    } else {
      console.warn(`[tutor-tts] server TTS failed (HTTP ${res.status}); falling back.`)
    }
  } catch (e) {
    console.warn('[tutor-tts] error; falling back:', e)
    stopServerAudio()
  }
  // Ни один серверный путь не сыграл — гасим разблокированную тишину, иначе
  // она осталась бы висеть в currentAudio до следующего нажатия.
  stopServerAudio()
  return (await speakBrowser(text, opts)) ? 'fallback' : 'none'
}
