// Озвучка ответа помощника по сайту — голосом Луны, как в её звонке (Gemini
// Cloud TTS, «Aoede»): помощник на сайте — это Луна. Синтез общий с
// /api/tutor-tts (lib/tutorVoice.js), чтобы голос не разъехался с тьютором.
//
// Голос — ровно как у Луны в звонке: Gemini «Aoede», модель тьютора, язык
// en-US (плагин google агента по умолчанию, секретов-переопределений у агента
// нет — проверено 14.10.2026). С ru-RU Gemini звучал другим диктором («голос
// не как у Луны», живой прогон 14.10.2026). Цифры en-US читает по-английски
// («0%» — «zero percent»), поэтому у русской фразы они идут словами
// (numbersRu.js), а эмодзи вырезаются — синтез читал их вслух.
//
// Запасного голоса здесь нет — его берёт клиент (voiceQueue.js) потоковым
// /api/tts. Раньше сервер сам подставлял Soniox, но в этом пути Soniox собирает
// фразу целиком: 10–12 с на 190 символов (замер на дев-стенде 14.10.2026), и
// посреди ответа вставала долгая тишина, а следом звучал чужой голос. Казахская
// фраза (у Gemini казахского нет) сюда обычно не доходит — клиент сразу играет
// её потоком; путь Soniox оставлен на случай, когда казахские буквы попали в
// ответ, начатый по-русски.
//
// Только для вошедшего ученика и с лимитом: синтез платный, а ответ на один
// вопрос — 2–4 фразы (чат пускает 20 вопросов за 10 минут).
//
// При казахском интерфейсе помощник — Айзере (lib/assistant/persona.js, тело
// запроса `persona: 'aizere'`): её голос — тот же клон ElevenLabs «zere», что в
// звонке Speaking Buddy и на кнопке «послушать» (synth('eleven', …, 'aizere')),
// на любом языке фразы. Сбой — 502, и клиент дочитает её запасным голосом
// потоком (Soniox «Maya»): серверный Soniox собирал бы фразу целиком (см. выше).
//
// Потоком ({ stream: true } в теле; 15.10.2026 — Луна, 28.10.2026 — и Айзере):
// REST Gemini отдаёт фразу только целиком — 3.1–4.2 с до первого звука на фразу
// в 44–67 символов (замер на деве 15.10.2026), ElevenLabs без /stream — 2–2.7 с,
// и голос заметно отставал от текста. Теперь POST заводит билет и сразу
// запускает потоковый синтез тем же голосом — у Луны Cloud TTS
// StreamingSynthesize (вызов, которым она звучит в звонке,
// lib/geminiTtsStream.js), у Айзере /stream ElevenLabs, — а отвечает адресом
// { url }; звук забирает <audio src> по GET (lib/assistant/speakStream.js).
// Поток не дал звука — та же фраза записью целиком, а если и её нет — GET
// уводит на потоковый /api/tts запасным голосом персоны, как раньше делал
// клиент. Без stream в теле роут отвечает по-старому — записью целиком: старая
// вкладка с прошлым бандлом и iPhone (там нет MediaSource для MP3,
// streamSource.js) не должны остаться без голоса.
//
// Сколько ждали первого звука, роут пишет строкой [assistant-speak] (без
// текста фразы) и отдаёт в GET заголовком x-assistant-first-ms: по ним видно,
// что дал поток, и на деве окно подписывает это под ответом (voiceTiming.js).

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { streamEleven, synth, synthGemini, synthGeminiPcm } from '@/lib/tutorVoice.js'
import { isPermanent, streamGemini } from '@/lib/geminiTtsStream.js'
import { bufferResponse, createMp3Encoder, createSpeakStore } from '@/lib/assistant/speakStream.js'
import { ttsUrl } from '@/lib/ttsShared.js'
import { personaById } from '@/lib/assistant/persona.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'
import { spellNumbersRu } from '@/lib/assistant/numbersRu.js'
import { stripEmoji } from '@/lib/assistant/speechChunks.js'
import { phraseLang } from '@/lib/assistant/phraseLang.js'

export const runtime = 'nodejs'
export const MAX_TEXT = 600
// REST Gemini не потоковый: фраза приходит целиком, примерно 1.5 с + 40 мс на
// символ (75 символов — 4.4 с, 190 — 8–10 с, замер 14.10.2026). Срок — на
// настоящее зависание, а не на длинную фразу: прежние 8 с выбрасывали готовый
// звук за секунду до конца.
export const SYNTH_TIMEOUT_MS = 20_000

// Сколько ждём первого звука потока, прежде чем взять запись целиком: поток,
// который за это время ничего не дал, скорее завис, чем думает. Не больше 3 с:
// <audio> ждёт первого звука START_TIMEOUT_MS (8 с, speech.js) с момента, как
// получил адрес билета, а запись целиком потом ещё 2.3–3.9 с (замер 28.10.2026)
// — с порогом 4 с фраза на этом пути пропадала бы по сторожу плеера.
export const FIRST_AUDIO_MS = 3000
// Поток Gemini отказал так, что не заработает и на следующей фразе (метода
// нет, запрос собран не так — isPermanent): столько роут отвечает по-старому.
export const STREAM_OFF_MS = 10 * 60_000

const LUNA_VOICE = 'Aoede'
const LUNA_LANGUAGE = 'en-US'

const store = createSpeakStore()
let streamOffUntil = 0

/** Поток включён: рубильник ASSISTANT_TTS_STREAM=off. */
export function streamEnabled() {
  return process.env.ASSISTANT_TTS_STREAM?.replace(/^﻿/, '').trim() !== 'off'
}

/** Для тестов: забыть паузу после отказа потока Gemini. */
export function resetStreamState() {
  streamOffUntil = 0
}

const takeQuota = createRateLimiter({ windowLimit: 100, dayLimit: 800 })
const json = (status, body, headers = {}) => Response.json(body, { status, headers })

/**
 * Язык фразы для голоса: казахская фраза (phraseLang — тот же расчёт, что у
 * клиента) — kk; lang 'kk' — клиент закрепил казахский за всем ответом (его
 * первая фраза была казахской, voiceQueue.js).
 */
export function voiceLang(text, lang) {
  if (lang === 'kk' || phraseLang(text) === 'kk') return 'kk'
  return lang === 'en' ? 'en' : 'ru'
}

async function withTimeout(promise, label, ok = (r) => r?.audio) {
  let timer
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}: timeout ${SYNTH_TIMEOUT_MS} ms`)), SYNTH_TIMEOUT_MS)
    })
    const r = await Promise.race([promise, timeout])
    return ok(r) ? r : null
  } catch (e) {
    console.warn('[assistant-speak]', e?.message || e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Поток, а без звука за FIRST_AUDIO_MS или при отказе — запись целиком той же
 * фразой (whole). Звук, начатый потоком, доигрывается как есть, даже если поток
 * оборвался посередине: повтор целиком прозвучал бы фразой дважды.
 * @returns {Promise<'stream'|'whole'>} чем в итоге озвучено
 */
async function streamOrWhole(label, sink, stream, whole, onRefused) {
  let heard = false
  const ctrl = new AbortController()
  const first = setTimeout(() => heard || ctrl.abort(), FIRST_AUDIO_MS)
  // Поток, застрявший посреди фразы, иначе держал бы билет (и <audio>) вечно:
  // у gRPC Gemini свой срок есть, у /stream ElevenLabs — нет.
  const total = setTimeout(() => ctrl.abort(), SYNTH_TIMEOUT_MS)
  try {
    await stream({
      signal: ctrl.signal,
      onAudio: (buf) => {
        heard = true
        sink.write(buf)
      },
    })
    return 'stream'
  } catch (e) {
    if (heard) {
      console.warn(`[assistant-speak] ${label} stream broke mid-phrase:`, e?.message || e)
      return 'stream'
    }
    onRefused?.(e)
    console.warn(`[assistant-speak] ${label} stream → whole:`, e?.message || e)
    const audio = await whole()
    if (!audio?.length) throw e
    sink.write(audio)
    return 'whole'
  } finally {
    clearTimeout(first)
    clearTimeout(total)
  }
}

/** Луна: поток Gemini (PCM) → MP3 на лету. */
async function speakLuna(text, sink) {
  const enc = createMp3Encoder()
  const mp3 = { write: (pcm) => sink.write(enc.push(pcm)) }
  const how = await streamOrWhole(
    'gemini',
    mp3,
    (o) => streamGemini(text, { voice: LUNA_VOICE, languageCode: LUNA_LANGUAGE, ...o }),
    async () => {
      const r = await withTimeout(
        synthGeminiPcm(text, { voice: LUNA_VOICE, languageCode: LUNA_LANGUAGE }),
        'gemini',
        (x) => x?.pcm?.length,
      )
      return r ? enc.push(r.pcm) : null
    },
    (e) => {
      if (isPermanent(e)) streamOffUntil = Date.now() + STREAM_OFF_MS
    },
  )
  sink.write(enc.end())
  return how
}

/** Айзере: ElevenLabs /stream отдаёт MP3 сам — кладём как есть. */
function speakAizere(text, sink) {
  return streamOrWhole(
    'eleven',
    sink,
    (o) => streamEleven(text, 'aizere', o),
    async () => (await withTimeout(synth('eleven', text, 'aizere'), 'eleven'))?.audio || null,
  )
}

export async function POST(request) {
  const auth = await verifyTokenStatus(bearerFromRequest(request))
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })

  let body
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'bad_request' })
  }
  const raw = typeof body?.text === 'string' ? body.text.slice(0, MAX_TEXT) : ''
  const text = stripEmoji(raw).replace(/\s+/g, ' ').trim()
  if (!text) return json(400, { error: 'bad_request' })

  const key = `user-${auth.user.userId}`
  const quota = takeQuota(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const lang = voiceLang(text, body?.lang)
  const persona = personaById(body?.persona)
  const voice = persona.id === 'aizere' ? 'eleven' : lang === 'kk' ? 'soniox' : 'gemini'
  const spoken = lang === 'ru' ? spellNumbersRu(text) : text

  const wantsStream = body?.stream === true && streamEnabled()
  const canStream = voice === 'eleven' || (voice === 'gemini' && Date.now() >= streamOffUntil)
  if (wantsStream && canStream) {
    const id = store.open({ text, lang, voice, fallbackVoice: persona.fallbackVoice }, async (sink) => {
      let how = 'none'
      try {
        how = voice === 'eleven' ? await speakAizere(spoken, sink) : await speakLuna(spoken, sink)
      } catch (e) {
        // Голоса персоны не было — фраза не должна съесть лимит ученика.
        takeQuota.refund(key)
        throw e
      } finally {
        logPhrase({ voice, mode: how, chars: text.length, firstMs: sink.firstMs(), ms: sink.ms() })
      }
    })
    return json(200, { url: `/api/assistant/speak?s=${id}` }, { 'cache-control': 'no-store' })
  }

  const startedAt = Date.now()
  const result =
    voice === 'eleven'
      ? await withTimeout(synth('eleven', spoken, 'aizere', lang), 'eleven')
      : voice === 'soniox'
        ? await withTimeout(synth('soniox', text, 'luna', 'kk'), 'soniox')
        : await withTimeout(synthGemini(spoken, { voice: LUNA_VOICE, languageCode: LUNA_LANGUAGE }), 'gemini')
  const ms = Date.now() - startedAt
  logPhrase({ voice, mode: result ? 'whole' : 'none', chars: text.length, firstMs: result ? ms : null, ms })
  if (!result) {
    // Звука не было — и фраза не должна съесть лимит ученика.
    takeQuota.refund(key)
    return json(502, { error: 'tts_failed' })
  }
  return new Response(result.audio, {
    headers: {
      'content-type': result.contentType,
      'cache-control': 'no-store',
      'x-assistant-voice': voice,
      'x-assistant-first-ms': String(ms),
    },
  })
}

/**
 * Звук билета для <audio src>. Без входа: <audio> не шлёт Authorization, а
 * билет — случайный адрес на пять минут, выданный POST после проверки входа и
 * лимита. Ответы: 200 audio/mpeg потоком (или 200/206 готовой записью), 307 —
 * голоса персоны нет, звучит запасной /api/tts, 404 — билета нет или он истёк.
 */
export async function GET(request) {
  const t = store.get(new URL(request.url).searchParams.get('s'))
  if (!t) return json(404, { error: 'not_found' }, { 'cache-control': 'no-store' })
  await store.ready(t)
  if (t.failed) {
    const url = ttsUrl({ text: t.meta.text, voice: t.meta.fallbackVoice, lang: t.meta.lang })
    return new Response(null, { status: 307, headers: { location: url, 'cache-control': 'no-store' } })
  }
  const headers = {
    'cache-control': 'no-store',
    'x-assistant-voice': t.meta.voice,
    'x-assistant-first-ms': String(t.firstMs ?? ''),
  }
  if (t.done) return bufferResponse(Buffer.concat(t.chunks), request, headers)
  // x-accel-buffering: nginx не копит поток в буфер — иначе первый звук ждал бы
  // заполнения буфера, а не синтеза.
  return new Response(store.stream(t), {
    headers: { 'content-type': 'audio/mpeg', 'x-accel-buffering': 'no', ...headers },
  })
}

// Строка лога на каждую фразу: чем озвучено (stream — поток, whole — запись
// целиком, none — голоса не было) и через сколько пришёл первый звук. Текста
// фразы здесь нет: это ответ ученику, ему не место в логе стенда.
function logPhrase(row) {
  console.info('[assistant-speak]', JSON.stringify(row))
}
