// Служебные параметры раздела IELTS в адресе (?ieltsRun=, ?ieltsAttempt=…): F5 посреди теста возвращает туда же.
// ?screen= пишет App; свои параметры экран ставит сам и сам же убирает, уходя (null — стереть).
export function setIeltsParams(params) {
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') url.searchParams.delete(k)
      else url.searchParams.set(k, String(v))
    }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории (тест, превью) — просто не пишем */
  }
}
