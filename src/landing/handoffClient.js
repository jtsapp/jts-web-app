// Приложение распечатывает код передачи с лендинга (см. handoff.js) через
// свой сервер — ключ шифрования в браузер не уходит. Любая неудача — null:
// регистрация тогда просто начнётся сначала.
export async function openLandingHandoff(token) {
  try {
    const res = await fetch('/api/landing/handoff?t=' + encodeURIComponent(token), { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data?.name && data?.phone ? data : null
  } catch {
    return null
  }
}
