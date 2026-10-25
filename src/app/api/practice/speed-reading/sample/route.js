// Образец озвучки текста Скорочтения (спека 2026-10-25-grammar-games-speed-reading-design, B3).
//
// Ключи синтеза есть только у сайта, а образец хранит бэкенд (MinIO, один раз на пару «текст + голос»). Поэтому
// сайт — исполнитель: спрашивает у бэкенда, готов ли образец (sample-claim), и если нет — синтезирует его
// ElevenLabs с разметкой слов и отдаёт бэкенду (PUT sample). Claim ставит отметку «готовлю»: второй ученик,
// открывший тот же текст в эти 90 с, получает 409 → здесь 202 «подождите», и синтез не идёт дважды.
//
// Только со входом: синтез платный, и без входа любой мог бы гонять его по кругу. Голос и текст берутся из
// ответа бэкенда, а не из запроса: клиент присылает только id. Без ключа ElevenLabs готовые образцы всё равно
// отдаются, а новые — 503, и экран пишет «Образец недоступен»: запись и итог работают и без образца.

import { BACKEND_URL, bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { elevenKey, sampleModel, speedReadingKey, synthSample } from '@/lib/speedReading/sample.js'

export const runtime = 'nodejs'

// id текстов бэкенда: восемь из прототипа (hello, weather…) и slug с хвостом у новых.
const ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/i
const BACKEND_TIMEOUT_MS = 15000
// Текст до 225 слов синтезируется за секунды; потолок — с запасом, но под 100 с Cloudflare прода.
const SYNTH_TIMEOUT_MS = 60000

const reply = (body, status = 200) => Response.json(body, { status })

export async function POST(request) {
  const token = bearerFromRequest(request)
  if (!token) return reply({ error: 'unauthorized' }, 401)

  let body
  try {
    body = await request.json()
  } catch {
    return reply({ error: 'bad_request' }, 400)
  }
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  if (!ID_RE.test(id)) return reply({ error: 'bad_request' }, 400)

  const key = speedReadingKey()
  if (!key) return reply({ error: 'not_configured' }, 503)

  const auth = await verifyTokenStatus(token)
  if (auth.status === 'unauthorized') return reply({ error: 'unauthorized' }, 401)
  if (auth.status !== 'ok') return reply({ error: 'backend_unavailable' }, 502)

  const base = `${BACKEND_URL}/integrations/web/speed-reading/${encodeURIComponent(id)}`
  let claim
  try {
    const res = await fetch(`${base}/sample-claim`, {
      method: 'POST',
      headers: { 'x-integration-key': key },
      cache: 'no-store',
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    })
    if (res.status === 404) return reply({ error: 'not_found' }, 404)
    if (res.status === 409) return reply({ pending: true }, 202)
    if (!res.ok) {
      console.warn('[speed-reading.sample] claim refused', res.status)
      return reply({ error: 'backend_refused' }, 502)
    }
    claim = await res.json()
  } catch (e) {
    console.warn('[speed-reading.sample] claim failed', e?.message || e)
    return reply({ error: 'backend_unavailable' }, 502)
  }
  if (claim?.ready) return reply({ sample: claim.sample })

  const eleven = elevenKey()
  if (!eleven) return reply({ error: 'not_configured' }, 503)
  if (typeof claim?.body !== 'string' || !claim.body.trim() || !claim.hash) return reply({ error: 'backend_refused' }, 502)

  let synth
  try {
    synth = await synthSample({ text: claim.body, voice: claim.voice, key: eleven, model: sampleModel(), signal: AbortSignal.timeout(SYNTH_TIMEOUT_MS) })
  } catch (e) {
    console.error('[speed-reading.sample] synth failed', e?.message || e)
    return reply({ error: 'synth_failed' }, 502)
  }

  const form = new FormData()
  form.set('audio', new Blob([synth.audio], { type: 'audio/mpeg' }), `${id}.mp3`)
  form.set('words', JSON.stringify(synth.words))
  form.set('hash', String(claim.hash))
  form.set('wpm', String(synth.wpm))
  try {
    const res = await fetch(`${base}/sample`, {
      method: 'PUT',
      headers: { 'x-integration-key': key },
      body: form,
      cache: 'no-store',
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    })
    // Текст поправили в админке, пока шёл синтез: бэкенд не принял образец старого текста. Клиент спросит снова
    // и получит claim уже на новый текст.
    if (res.status === 409 || res.status === 412) return reply({ pending: true }, 202)
    if (!res.ok) {
      console.warn('[speed-reading.sample] put refused', res.status)
      return reply({ error: 'backend_refused' }, 502)
    }
    const saved = await res.json()
    return reply({ sample: saved?.sample ?? saved })
  } catch (e) {
    console.warn('[speed-reading.sample] put failed', e?.message || e)
    return reply({ error: 'backend_unavailable' }, 502)
  }
}
