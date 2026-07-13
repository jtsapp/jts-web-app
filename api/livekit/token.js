// LiveKit token issuance for the voice tutor, with the free-tier minute cap.
//
// Ported/trimmed from felix app/api/livekit/token/route.ts. Added for the new
// plan:
//   * usage cap — refuse a token once the learner is over 10 min/day or
//     300 min/month (checked against Neon via api/_lib/usage).
//   * TTL clamped to the remaining daily budget so one session can't overrun.
//   * openSession() so the room_finished webhook can bill the minutes.
//   * JTS tutor keys (dexter/luna/spark) mapped to the agent persona ids
//     (bro/gentle/hype) the Python agent + Azure voice map expect.
//   * tier forwarded in metadata (free → agent skips paid Krisp BVC).
//
// Secrets (LIVEKIT_API_KEY/SECRET, DATABASE_URL) live in Vercel server env only
// — never VITE_-prefixed, so they never reach the browser bundle.

import { AccessToken } from "livekit-server-sdk";
import {
  isDbConfigured,
  isValidDeviceId,
  getUsage,
  openSession,
  DAILY_LIMIT_SEC,
  MONTH_LIMIT_SEC,
} from "../_lib/usage.js";

// JTS picker key → agent persona id (see felix lib/tutors.ts ACTIVE_TUTOR_IDS).
const TUTOR_KEY_TO_PERSONA = {
  dexter: "bro",
  luna: "gentle",
  spark: "hype",
};

const MAX_LEN = 120;
function trimStr(s, max = MAX_LEN) {
  if (typeof s !== "string") return "";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
function trimList(raw, cap, maxLen = MAX_LEN) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const t = trimStr(item, maxLen);
    if (t) out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

function buildMetadata(p, tier) {
  const meta = {
    level: p.level || "B1",
    lang: p.lang || "en",
    style: p.style || "friendly",
    goal: p.goal || "general",
    tier,
  };
  if (p.deviceId) meta.deviceId = p.deviceId;
  const persona = p.tutor ? TUTOR_KEY_TO_PERSONA[p.tutor] || p.tutor : undefined;
  if (persona) meta.tutor = persona;
  const interests = trimList(p.interests, 6, 40);
  if (interests.length) meta.interests = interests;
  if (typeof p.profession === "string" && p.profession.trim())
    meta.profession = p.profession.trim().slice(0, 120);
  const mistakes = trimList(p.mistakes, 8);
  if (mistakes.length) meta.mistakes = mistakes;
  const topics = trimList(p.topics, 10, 60);
  if (topics.length) meta.topics = topics;
  const vocab = trimList(p.vocab, 20, 40);
  if (vocab.length) meta.vocab = vocab;
  if (p.explanationLang === "ru" || p.explanationLang === "kz" || p.explanationLang === "en")
    meta.explanationLang = p.explanationLang;
  if (p.mode === "placement") {
    meta.mode = "placement";
    meta.draftLevel = p.draftLevel || meta.level;
  }
  if (p.mode === "debate") {
    meta.mode = "debate";
    if (typeof p.debateTopic === "string" && p.debateTopic.trim())
      meta.debateTopic = p.debateTopic.trim().slice(0, 200);
  }
  if (typeof p.scenario === "string" && p.scenario.trim())
    meta.scenario = p.scenario.trim().slice(0, 400);
  return JSON.stringify(meta);
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) {
    res.status(503).json({
      configured: false,
      error:
        "LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.",
    });
    return;
  }

  const p =
    req.method === "POST"
      ? (typeof req.body === "object" && req.body) || {}
      : Object.fromEntries(new URL(req.url, "http://x").searchParams);

  // Free-tier cap: refuse before issuing a token once over budget. TTL is then
  // clamped to whatever daily seconds remain so a session can't overrun.
  let ttl = 600; // 10 min hard ceiling per session
  const freeTier = p.tier !== "paid";
  if (freeTier && isDbConfigured() && isValidDeviceId(p.deviceId)) {
    try {
      const { todaySeconds, monthSeconds } = await getUsage(p.deviceId);
      if (monthSeconds >= MONTH_LIMIT_SEC || todaySeconds >= DAILY_LIMIT_SEC) {
        res.status(403).json({
          configured: true,
          limited: true,
          error: monthSeconds >= MONTH_LIMIT_SEC ? "monthly_limit" : "daily_limit",
        });
        return;
      }
      ttl = Math.max(60, Math.min(600, DAILY_LIMIT_SEC - todaySeconds));
    } catch (err) {
      console.error("[livekit.token] usage check failed", err);
      // Fail open on a DB blip — a transient error shouldn't lock users out.
    }
  }

  const identity = p.identity || `learner-${Math.random().toString(36).slice(2, 10)}`;
  const room = p.room || `jts-tutor-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
  const tier = freeTier ? "free" : "paid";
  const metadata = buildMetadata(p, tier);

  const at = new AccessToken(apiKey, apiSecret, { identity, ttl, metadata });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await at.toJwt();

  // Open the session row so the webhook can bill its duration on room_finished.
  if (isDbConfigured() && isValidDeviceId(p.deviceId)) {
    try {
      await openSession(room, p.deviceId);
    } catch (err) {
      console.error("[livekit.token] openSession failed", err);
    }
  }

  res.status(200).json({ configured: true, token, url: wsUrl, room, identity, ttl });
}
