// Запись чтения вслух: MediaRecorder → WAV 16 кГц моно (Д15) — для распознавания (/api/transcribe).
//
// Браузер пишет то, что умеет (webm/opus, в Safari — mp4/aac), перевод в WAV — общий blobToWav16kMono, им уже
// пользуется IELTS Speaking (его useRecorder мы не трогаем и не переносим).
//
// ТЗ v1.2 §7: запись, которую ученик слушает и скачивает, — голос вместе с фоном сцены на 45 %, «как настоящее
// объявление», а распознаётся чистый голос. Поэтому при mixWith пишутся две дорожки: чистый микрофон (WAV на
// распознавание) и сведённый поток (take()). Сведённая тоже переводится в WAV: webm от MediaRecorder в Chrome
// приходит без длительности, и плеер не перематывал бы его. Вторая дорожка — украшение, поэтому она не может ни
// задержать основную (её остановку ждём не дольше MIX_STOP_MS), ни подменить её тишиной: сведение идёт через
// контекст фона, и пока он стоит (iOS оставляет его «interrupted» после микрофона), туда пишутся нули — тогда
// take() отдаёт null и слушается чистый голос. Без mixWith take() тоже null, как до v1.2. Записи по-прежнему
// никуда не уходят (Д6).
//
// Микрофон открывается по нажатию «Начать запись» (openRecorder), а сама запись — после отсчёта 3-2-1
// (start), как в прототипе: разрешение браузер спрашивает до отсчёта, а не посреди него. Потолок — 3 минуты:
// столько длится самый длинный текст (225 слов) на самой медленной скорости 0,5x. Любой исход — стоп, отмена,
// ошибка — отпускает дорожки микрофона: иначе на вкладке горел бы значок записи.

import { blobToWav16kMono } from '../../lib/ielts-audio.js'

export const MAX_RECORD_MS = 180000
/** Сколько ждать остановки сведённой дорожки: дольше — запись идёт без неё (сбои MediaRecorder на WebAudio-потоке). */
export const MIX_STOP_MS = 1500
// Пик ниже ~0,3 % полной шкалы — тишина: так выглядит дорожка, записанная со спящего контекста.
const SILENT_PEAK = 100

/** Пик 16-битного PCM в WAV (после 44-байтного заголовка blobToWav16kMono); 0 — данных нет. */
export async function wavPeak(wav) {
  try {
    const buf = await wav.arrayBuffer()
    const v = new DataView(buf)
    let peak = 0
    for (let i = 44; i + 1 < buf.byteLength; i += 2) {
      const x = Math.abs(v.getInt16(i, true))
      if (x > peak) peak = x
    }
    return peak
  } catch {
    return 0
  }
}
// ТЗ §7: эхоподавление, шумоподавление и автоусиление. Эхоподавление ещё и вычитает фон сцены из микрофона,
// если ученик читает без наушников.
export const MIC_CONSTRAINTS = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
// Кусками по 250 мс (как в прототипе): данные копятся по ходу, и стоп не ждёт одного большого куска.
const TIMESLICE_MS = 250

export function canRecord(env = globalThis) {
  return !!(env?.navigator?.mediaDevices?.getUserMedia && env.MediaRecorder)
}

/**
 * @param {object} [o]
 * @param {(stream: MediaStream) => ({ stream: MediaStream, release(): void } | null)} [o.mixWith]  сведение
 *   микрофона с фоном (ambience.mixer); вызывается на start(), когда микрофон уже открыт
 * @returns {Promise<{ stream: MediaStream, start(): void, stop(): Promise<Blob|null>, take(): Promise<Blob|null>, cancel(): void }>}
 *   Отказ getUserMedia — промис отклонён той же ошибкой (её name экран показывает ученику).
 */
export async function openRecorder({
  getUserMedia = (c) => navigator.mediaDevices.getUserMedia(c),
  MediaRecorderCtor = globalThis.MediaRecorder,
  toWav = blobToWav16kMono,
  maxMs = MAX_RECORD_MS,
  onLimit = () => {},
  timers = globalThis,
  mixWith = null,
} = {}) {
  const stream = await getUserMedia(MIC_CONSTRAINTS)
  const chunks = []
  let rec = null
  // Вторая дорожка «голос + фон»: её сбой не должен ронять основную запись — тогда take() просто null.
  let mix = null
  let mixRec = null
  const mixChunks = []
  let mixDone = null
  let takeDone = null
  let limit = null
  let released = false
  let stopping = null

  const release = () => {
    if (limit !== null) {
      timers.clearTimeout(limit)
      limit = null
    }
    if (released) return
    released = true
    try {
      mix?.release()
    } catch {
      /* сведение уже разобрано */
    }
    for (const t of stream.getTracks()) {
      try {
        t.stop()
      } catch {
        /* дорожка уже остановлена */
      }
    }
  }

  function stopMix() {
    if (mixDone) return mixDone
    mixDone = new Promise((resolve) => {
      if (!mixRec || mixRec.state === 'inactive') return resolve(null)
      let done = false
      const finish = (v) => {
        if (done) return
        done = true
        timers.clearTimeout(wait)
        resolve(v)
      }
      const wait = timers.setTimeout(() => finish(null), MIX_STOP_MS)
      mixRec.onstop = () => {
        const blob = new Blob(mixChunks, { type: mixChunks[0]?.type || mixRec.mimeType || 'audio/webm' })
        finish(blob.size ? blob : null)
      }
      try {
        mixRec.stop()
      } catch {
        finish(null)
      }
    })
    return mixDone
  }

  return {
    stream,
    start() {
      if (rec || released) return
      try {
        rec = new MediaRecorderCtor(stream)
      } catch (e) {
        release()
        throw e
      }
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data)
      }
      rec.start(TIMESLICE_MS)
      if (mixWith) {
        try {
          mix = mixWith(stream)
          if (mix?.stream) {
            mixRec = new MediaRecorderCtor(mix.stream)
            mixRec.ondataavailable = (e) => {
              if (e.data && e.data.size) mixChunks.push(e.data)
            }
            mixRec.start(TIMESLICE_MS)
          }
        } catch {
          mixRec = null
        }
      }
      limit = timers.setTimeout(() => {
        limit = null
        onLimit()
      }, maxMs)
    },
    stop() {
      if (stopping) return stopping
      // Сведённая дорожка останавливается вместе с основной; release() отключает сведение только после её onstop.
      const mixed = stopMix()
      stopping = new Promise((resolve) => {
        if (!rec || rec.state === 'inactive') {
          mixed.then(release)
          resolve(null)
          return
        }
        rec.onstop = async () => {
          await mixed
          release()
          const blob = new Blob(chunks, { type: chunks[0]?.type || rec.mimeType || 'audio/webm' })
          if (!blob.size) return resolve(null)
          try {
            resolve(await toWav(blob))
          } catch {
            resolve(null)
          }
        }
        try {
          rec.stop()
        } catch {
          release()
          resolve(null)
        }
      })
      return stopping
    },
    /**
     * Запись «голос + фон» WAV-ом после stop(); null — сведения не было, оно не записалось или записалось тишиной
     * при живом голосе (контекст фона спал).
     */
    take() {
      if (takeDone) return takeDone
      if (!stopping || !mixDone) return Promise.resolve(null)
      takeDone = Promise.all([stopping, mixDone]).then(async ([clean, mixed]) => {
        if (!mixed) return null
        let wav
        try {
          wav = await toWav(mixed)
        } catch {
          return null
        }
        if (!wav) return null
        if (clean && (await wavPeak(wav)) < SILENT_PEAK && (await wavPeak(clean)) >= SILENT_PEAK) return null
        return wav
      })
      return takeDone
    },
    cancel() {
      if (mixRec && mixRec.state !== 'inactive') {
        mixRec.onstop = null
        try {
          mixRec.stop()
        } catch {
          /* уже остановлен */
        }
      }
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null
        try {
          rec.stop()
        } catch {
          /* уже остановлен */
        }
      }
      release()
    },
  }
}
