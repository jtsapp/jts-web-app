// Прогресс коротких тренировок Writing — на устройстве, как у «Проверьте себя» прототипа: попыток в банк дрилл не
// пишет (проверка на экране, балла IELTS нет). Хранится число проходов и лучший счёт — для статуса строки списка.
const KEY = 'jts_ielts_wdrills_v1'

export function loadDrillProgress() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

/** Новый прогресс после прохода (чистая функция): проходы +1, лучший — по доле верных. */
export function withRun(progress, id, score, total) {
  const prev = progress?.[id]
  const better = !prev || (total > 0 && (!prev.total || score / total > prev.best / prev.total))
  return {
    ...(progress || {}),
    [id]: { runs: (prev?.runs || 0) + 1, best: better ? score : prev.best, total: better ? total : prev.total, at: new Date().toISOString() },
  }
}

/** Записать проход и вернуть новый прогресс; без хранилища (приватное окно) — только в памяти экрана. */
export function recordDrillRun(id, score, total) {
  const next = withRun(loadDrillProgress(), id, score, total)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* не запомнится — не беда */
  }
  return next
}
