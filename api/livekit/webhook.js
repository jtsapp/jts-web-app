// LiveKit webhook → bill voice minutes. Configure the endpoint in the LiveKit
// Cloud dashboard (Settings → Webhooks): https://<deploy>/api/livekit/webhook
//
// On `room_finished` we close the matching voice_session row and add its
// duration to the learner's daily usage bucket (api/_lib/usage.recordSession).
// The signature is verified with the LiveKit API key/secret so only real
// LiveKit events count.

import { WebhookReceiver } from "livekit-server-sdk";
import { recordSession, isDbConfigured } from "../_lib/usage.js";

// Raw body is required for signature verification — read the stream ourselves
// instead of letting Vercel JSON-parse it.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    res.status(503).json({ error: "LiveKit not configured" });
    return;
  }

  let event;
  try {
    const raw = await readRawBody(req);
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    // validate = true (default) verifies the Authorization header signature.
    event = await receiver.receive(raw, req.headers.authorization);
  } catch (err) {
    console.error("[livekit.webhook] invalid event", err);
    res.status(401).json({ error: "invalid signature" });
    return;
  }

  try {
    if (event.event === "room_finished" && event.room?.name && isDbConfigured()) {
      // room.duration may be present; recordSession recomputes from started_at
      // and uses this only as a fallback.
      const fallback = Number(event.room.duration) || 0;
      await recordSession(event.room.name, fallback);
    }
  } catch (err) {
    console.error("[livekit.webhook] recordSession failed", err);
    // Still 200 so LiveKit doesn't retry-storm; the minute is lost, not fatal.
  }

  res.status(200).json({ ok: true });
}
