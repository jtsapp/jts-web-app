// Cross-browser fullscreen. Every function is a safe no-op where the API
// is missing (e.g. iOS Safari) or the request is rejected.

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false
  const el = document.documentElement
  return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)
}

function currentFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

export function requestAppFullscreen() {
  if (typeof document === 'undefined') return
  if (currentFullscreenElement()) return
  const el = document.documentElement
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
  if (!req) return
  try {
    const r = req.call(el)
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch { /* ignore — fullscreen is best-effort */ }
}

export function exitAppFullscreen() {
  if (typeof document === 'undefined') return
  if (!currentFullscreenElement()) return
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
  if (!exit) return
  try {
    const r = exit.call(document)
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch { /* ignore */ }
}
