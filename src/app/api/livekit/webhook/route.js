// LiveKit webhook → bill voice minutes. Next.js App Router route handler.
// Configure in LiveKit Cloud dashboard: https://<deploy>/api/livekit/webhook
//
// On `room_finished` we close the matching voice_session row and add its
// duration to the learner's daily usage bucket. The signature is verified with
// the LiveKit API key/secret so only real LiveKit events count.

import { WebhookReceiver } from 'livekit-server-sdk'
import { recordSession, isDbConfigured } from '@/lib/usage.js'

export const runtime = 'nodejs'

export async function POST(request) {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) {
    return Response.json({ error: 'LiveKit not configured' }, { status: 503 })
  }

  let event
  try {
    // Raw body is required for signature verification.
    const raw = await request.text()
    const receiver = new WebhookReceiver(apiKey, apiSecret)
    event = await receiver.receive(raw, request.headers.get('authorization'))
  } catch (err) {
    console.error('[livekit.webhook] invalid event', err)
    return Response.json({ error: 'invalid signature' }, { status: 401 })
  }

  try {
    if (event.event === 'room_finished' && event.room?.name && isDbConfigured()) {
      const fallback = Number(event.room.duration) || 0
      await recordSession(event.room.name, fallback)
    }
  } catch (err) {
    console.error('[livekit.webhook] recordSession failed', err)
    // Still 200 so LiveKit doesn't retry-storm; the minute is lost, not fatal.
  }

  return Response.json({ ok: true })
}
