// Запись чтения вслух: MediaRecorder → WAV 16 кГц моно (Д15).
//
// WAV — потому что его принимает распознавание (/api/transcribe), и тот же файл ученик слушает и скачивает:
// одна запись, а не две. Браузер пишет то, что умеет (webm/opus, в Safari — mp4/aac), перевод в WAV — общий
// blobToWav16kMono, им уже пользуется IELTS Speaking (его useRecorder мы не трогаем и не переносим).
//
// Микрофон открывается по нажатию «Начать запись» (openRecorder), а сама запись — после отсчёта 3-2-1
// (start), как в прототипе: разрешение браузер спрашивает до отсчёта, а не посреди него. Потолок — 3 минуты:
// столько длится самый длинный текст (225 слов) на самой медленной скорости 0,5x. Любой исход — стоп, отмена,
// ошибка — отпускает дорожки микрофона: иначе на вкладке горел бы значок записи.

import { blobToWav16kMono } from '../../lib/ielts-audio.js'

export const MAX_RECORD_MS = 180000
// Кусками по 250 мс (как в прототипе): данные копятся по ходу, и стоп не ждёт одного большого куска.
const TIMESLICE_MS = 250

export function canRecord(env = globalThis) {
  return !!(env?.navigator?.mediaDevices?.getUserMedia && env.MediaRecorder)
}

/**
 * @returns {Promise<{ start(): void, stop(): Promise<Blob|null>, cancel(): void }>}
 *   Отказ getUserMedia — промис отклонён той же ошибкой (её name экран показывает ученику).
 */
export async function openRecorder({
  getUserMedia = (c) => navigator.mediaDevices.getUserMedia(c),
  MediaRecorderCtor = globalThis.MediaRecorder,
  toWav = blobToWav16kMono,
  maxMs = MAX_RECORD_MS,
  onLimit = () => {},
  timers = globalThis,
} = {}) {
  const stream = await getUserMedia({ audio: true })
  const chunks = []
  let rec = null
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
    for (const t of stream.getTracks()) {
      try {
        t.stop()
      } catch {
        /* дорожка уже остановлена */
      }
    }
  }

  return {
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
      limit = timers.setTimeout(() => {
        limit = null
        onLimit()
      }, maxMs)
    },
    stop() {
      if (stopping) return stopping
      stopping = new Promise((resolve) => {
        if (!rec || rec.state === 'inactive') {
          release()
          resolve(null)
          return
        }
        rec.onstop = async () => {
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
    cancel() {
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
