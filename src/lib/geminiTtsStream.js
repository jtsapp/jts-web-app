// Потоковый синтез голоса Луны — Cloud TTS StreamingSynthesize (gRPC). Ровно
// тот вызов, которым звучит живая Луна в звонке: плагин google агента
// (livekit-plugins-google 1.6.7) по умолчанию идёт потоком — модель
// gemini-2.5-flash-tts, голос «Aoede», en-US, без prompt, PCM 24 кГц. Тот же
// продукт, тот же голос — тембр не меняется (ru-RU однажды уже дал «голос не
// как у Луны», 14.10.2026, поэтому язык здесь не трогаем).
//
// Зачем поток: REST text:synthesize отдаёт фразу только целиком — ~1.2 с +
// 40 мс на символ, на деве 3.1–4.2 с до первого байта на фразу в 44–67
// символов (замер 15.10.2026). Поток отдаёт звук по мере синтеза.
//
// Свой gRPC поверх node:http2, без SDK: @google-cloud/text-to-speech тянет
// google-gax, grpc-js и protobufjs ради трёх сообщений, а токен сервисного
// аккаунта у нас уже свой (tutorVoice.js — тоже без SDK). Сообщения собраны
// вручную по cloud_tts.proto (googleapis, google/cloud/texttospeech/v1) —
// номера полей у каждого сообщения ниже; geminiTtsStream.test.js сверяет байты
// с эталоном, снятым protobufjs с того же proto.
//
// Синтез начинается только после half-close (так устроен API: «the API only
// starts synthesizing when the client sends Half-Close»), поэтому фраза уходит
// одним куском: конфиг, текст, конец записи.

import http2 from 'node:http2'

import { GEMINI_TTS, googleAuth } from './tutorVoice.js'

const PATH = '/google.cloud.texttospeech.v1.TextToSpeech/StreamingSynthesize'
// AudioEncoding.PCM = 7: поток умеет только PCM, ALAW, MULAW и OGG_OPUS.
const AUDIO_PCM = 7
export const SAMPLE_RATE = 24000

// --- protobuf: ровно то, что нужно трём сообщениям -------------------------

function varint(n) {
  const out = []
  while (n > 0x7f) {
    out.push((n & 0x7f) | 0x80)
    n = Math.floor(n / 128)
  }
  out.push(n)
  return Buffer.from(out)
}

const key = (field, wire) => varint(field * 8 + wire)
const message = (field, body) => Buffer.concat([key(field, 2), varint(body.length), body])
const string = (field, s) => (s ? message(field, Buffer.from(s, 'utf8')) : Buffer.alloc(0))
const int = (field, n) => (n ? Buffer.concat([key(field, 0), varint(n)]) : Buffer.alloc(0))

/**
 * Первое сообщение потока — StreamingSynthesizeRequest.streaming_config (1):
 *   StreamingSynthesizeConfig { voice = 1; streaming_audio_config = 4 }
 *   VoiceSelectionParams { language_code = 1; name = 2; model_name = 6 }
 *   StreamingAudioConfig { audio_encoding = 1; sample_rate_hertz = 2 }
 */
export function configMessage({ voice, languageCode, model, sampleRate = SAMPLE_RATE }) {
  const voiceParams = Buffer.concat([string(1, languageCode), string(2, voice), string(6, model)])
  const audio = Buffer.concat([int(1, AUDIO_PCM), int(2, sampleRate)])
  return message(1, Buffer.concat([message(1, voiceParams), message(4, audio)]))
}

/** Текст — StreamingSynthesizeRequest.input (2) → StreamingSynthesisInput.text (1). */
export function inputMessage(text) {
  return message(2, string(1, text))
}

function readVarint(buf, at) {
  let n = 0
  let mul = 1
  for (;;) {
    if (at >= buf.length) throw new Error('protobuf: varint past end')
    const b = buf[at++]
    n += (b & 0x7f) * mul
    if (b < 0x80) return [n, at]
    mul *= 128
  }
}

/** StreamingSynthesizeResponse { bytes audio_content = 1 } — прочие поля пропускаем. */
export function audioOf(msg) {
  const parts = []
  let at = 0
  while (at < msg.length) {
    const [k, next] = readVarint(msg, at)
    at = next
    const wire = k % 8
    if (wire === 2) {
      const [len, start] = readVarint(msg, at)
      if (Math.floor(k / 8) === 1) parts.push(msg.subarray(start, start + len))
      at = start + len
    } else if (wire === 0) at = readVarint(msg, at)[1]
    else if (wire === 1) at += 8
    else if (wire === 5) at += 4
    else throw new Error(`protobuf: wire type ${wire}`)
  }
  return parts.length === 1 ? parts[0] : Buffer.concat(parts)
}

// --- gRPC поверх HTTP/2 ------------------------------------------------------

/** Сообщение gRPC: флаг сжатия (0) + длина big-endian + тело. */
export function frame(msg) {
  const head = Buffer.alloc(5)
  head.writeUInt32BE(msg.length, 1)
  return Buffer.concat([head, msg])
}

/** Куски HTTP/2 → целые сообщения gRPC (сообщение может прийти в нескольких кусках и наоборот). */
export function createDeframer(onMessage) {
  let buf = Buffer.alloc(0)
  return (chunk) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk
    while (buf.length >= 5) {
      if (buf[0] !== 0) throw new Error('grpc: compressed message')
      const len = buf.readUInt32BE(1)
      if (buf.length < 5 + len) return
      onMessage(buf.subarray(5, 5 + len))
      buf = buf.subarray(5 + len)
    }
  }
}

export class GrpcError extends Error {
  constructor(code, detail) {
    super(`Gemini stream grpc-status ${code}: ${detail || ''}`.trim())
    this.code = code
  }
}

// Коды, при которых поток не заработает и на следующей фразе: запрос собран не
// так, метода нет в этом регионе, нет прав. Транзиентные (UNAVAILABLE,
// INTERNAL, DEADLINE) — нет: их лечит повтор.
const PERMANENT = new Set([3, 5, 7, 12])
export const isPermanent = (e) => e instanceof GrpcError && PERMANENT.has(e.code)

const decodeMessage = (m) => {
  try {
    return decodeURIComponent(String(m || ''))
  } catch {
    return String(m || '')
  }
}

// Одно соединение HTTP/2 на процесс: TLS и рукопожатие до Google — сотни
// миллисекунд, и платить их на каждой фразе незачем. Сорвалось или Google
// прислал GOAWAY — следующая фраза откроет новое.
let session = null
let sessionHost = ''

function connect(host) {
  if (session && sessionHost === host && !session.closed && !session.destroyed) return session
  const s = http2.connect(host)
  // Ошибка сессии приходит и на её запросы — там её и разбираем; без
  // обработчика здесь она уронила бы процесс.
  s.on('error', () => {})
  const forget = () => {
    if (session === s) session = null
  }
  s.on('close', forget)
  s.on('goaway', forget)
  // Без запросов две минуты — отпускаем: Google всё равно закроет сам.
  s.setTimeout(120_000, () => s.close())
  s.unref()
  session = s
  sessionHost = host
  return s
}

/**
 * Синтезировать фразу потоком. onAudio(pcm) получает куски PCM (16 бит, 24 кГц,
 * моно) по мере синтеза. Промис — конец синтеза (grpc-status 0) или ошибка:
 * GrpcError с кодом gRPC, AbortError по signal. Без ключа Google — ошибка с
 * code 'no_credentials'.
 * @param {string} text
 * @param {{ voice: string, languageCode: string, onAudio: (pcm: Buffer) => void,
 *           signal?: AbortSignal, timeoutMs?: number, host?: string }} opts
 */
export async function streamGemini(text, { voice, languageCode, onAudio, signal, timeoutMs = 30_000, host = GEMINI_TTS.host }) {
  const auth = await googleAuth()
  if (!auth) throw Object.assign(new Error('GOOGLE_CREDENTIALS_JSON is not set'), { code: 'no_credentials' })
  if (signal?.aborted) throw abortError()

  return new Promise((resolve, reject) => {
    let req
    try {
      req = connect(host).request({
        ':method': 'POST',
        ':path': PATH,
        'content-type': 'application/grpc',
        te: 'trailers',
        'grpc-timeout': `${Math.ceil(timeoutMs / 1000)}S`,
        authorization: `Bearer ${auth.token}`,
        ...(auth.project ? { 'x-goog-user-project': auth.project } : {}),
      })
    } catch (e) {
      session = null
      reject(e)
      return
    }

    let settled = false
    const finish = (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (err) {
        if (!req.closed) req.close(http2.constants.NGHTTP2_CANCEL)
        reject(err)
      } else resolve()
    }
    const onAbort = () => finish(abortError())
    signal?.addEventListener('abort', onAbort)
    const timer = setTimeout(() => finish(new GrpcError(4, `no status in ${timeoutMs} ms`)), timeoutMs)

    // grpc-status приходит в трейлерах, а при мгновенном отказе — прямо в
    // заголовках ответа (trailers-only).
    const status = (headers) => {
      if (headers['grpc-status'] === undefined) return
      const code = Number(headers['grpc-status'])
      finish(code === 0 ? null : new GrpcError(code, decodeMessage(headers['grpc-message'])))
    }
    const deframe = createDeframer((msg) => {
      const pcm = audioOf(msg)
      if (pcm.length) onAudio(pcm)
    })

    req.on('response', (headers) => {
      if (headers[':status'] !== 200) return finish(new GrpcError(14, `HTTP ${headers[':status']}`))
      status(headers)
    })
    req.on('data', (chunk) => {
      if (settled) return
      try {
        deframe(chunk)
      } catch (e) {
        finish(e)
      }
    })
    req.on('trailers', status)
    req.on('error', (e) => finish(e))
    req.on('close', () => finish(new GrpcError(14, 'stream closed without status')))

    req.write(frame(configMessage({ voice, languageCode, model: GEMINI_TTS.model })))
    req.write(frame(inputMessage(text)))
    req.end()
  })
}

function abortError() {
  const e = new Error('aborted')
  e.name = 'AbortError'
  return e
}
