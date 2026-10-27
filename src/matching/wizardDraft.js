// Черновик мастера подбора на устройстве (ТЗ §2.3: «при возврате в мастер отмеченные слоты на месте»). Слоты ещё
// уходят на сервер на шаге «Учителя» (PUT /preferences), но формат и выбор учителей до отправки живут только здесь.
// Ключ — по ученику: на общем компьютере брат не должен увидеть чужой выбор.
const EMPTY = { step: null, format: null, slots: [], interests: [], choices: [], savedAt: null }
const key = (id) => `jts_matching_draft:${id}`

export function loadDraft(id) {
  if (id == null) return { ...EMPTY }
  try {
    const raw = JSON.parse(localStorage.getItem(key(id)) || 'null')
    if (!raw || typeof raw !== 'object') return { ...EMPTY }
    return {
      step: typeof raw.step === 'string' ? raw.step : null,
      format: typeof raw.format === 'string' ? raw.format : null,
      slots: Array.isArray(raw.slots) ? raw.slots.filter((s) => s && s.weekday && s.start) : [],
      interests: Array.isArray(raw.interests) ? raw.interests.filter((x) => typeof x === 'string') : [],
      choices: Array.isArray(raw.choices) ? raw.choices.filter((x) => Number.isFinite(x)) : [],
      savedAt: Number.isFinite(raw.savedAt) ? raw.savedAt : null,
    }
  } catch {
    return { ...EMPTY }
  }
}

export function saveDraft(id, draft) {
  if (id == null) return
  try {
    localStorage.setItem(key(id), JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    /* хранилище недоступно — мастер работает и без черновика */
  }
}

export function clearDraft(id) {
  if (id == null) return
  try {
    localStorage.removeItem(key(id))
  } catch {
    /* нечего чистить */
  }
}

// Черновик старше карточки (статус подбора сменился после него: заявки ушли, менеджер подобрал, смена одобрена)
// описывает прошлый подбор — его время и выбор уже не к месту.
export function draftIsCurrent(draft, statusChangedAt) {
  if (!draft?.savedAt) return false
  const changed = statusChangedAt ? new Date(String(statusChangedAt).slice(0, 19) + '+05:00').getTime() : NaN
  return Number.isNaN(changed) || draft.savedAt >= changed
}
