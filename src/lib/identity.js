'use client'

// The id learner data is keyed by, client side.
//
// Anonymous visitors are keyed by a stable per-browser device id (the same one
// the voice tutor already uses for its minute limits, so a learner keeps one
// identity across both features). Logged-in learners are keyed server-side by
// `user-<id>` — the routes derive that from the Bearer token and ignore the
// deviceId, so nothing extra is needed here.

const DEVICE_ID_KEY = 'jts_device_id'

/** Stable id of this browser. Shape matches the server's /^[A-Za-z0-9_-]{6,64}$/. */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return 'dev-ephemeral'
  }
}

/** Authorization header for the IELTS routes; empty for anonymous learners. */
export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
