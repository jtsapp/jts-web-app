// Тексты записей курса: public/course/<level>/transcripts.json, ключ — имя mp3 (хэш содержимого,
// поэтому пересборка шагов связь не ломает). Грузится один раз на уровень и только когда текст
// понадобился — после проверки или пропуска. Файла нет — текстов нет, без ошибки.
const cache = new Map()

export function loadTranscripts(level) {
  const key = String(level || '').toLowerCase()
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`/course/${key}/transcripts.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    )
  }
  return cache.get(key)
}

export async function transcriptFor(level, src) {
  const file = String(src || '').split('?')[0].split('/').pop()
  if (!file) return null
  const all = await loadTranscripts(level)
  return (all && all[file]) || null
}

/** Только для тестов: забыть загруженные уровни. */
export function resetTranscriptCache() {
  cache.clear()
}
