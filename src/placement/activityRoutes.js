// Рекомендованное задание теста v16 → куда его открыть в приложении (handleNav в App.jsx).
//
// Каталог v16 собран по живой «Практике» без доступа к нашим id (`jts-observed:…`, platformActivityId = null):
// у задания есть только раздел (navigation.identifier) и путь выбора в интерфейсе. Поэтому ведём в раздел, а не в
// само упражнение; «Чтению» отдаём ещё и уровень — его экран умеет открыть полку уровня.

// Разделы, в которые ведёт handleNav без обязательных параметров. Остальное (сказки, шэдоуинг без урока, модули без
// адреса) — в «Практику»: там ученик найдёт задание по пути выбора, который мы показываем рядом.
const DIRECT = new Set(['reading', 'numbers', 'speakspin', 'writing', 'listening', 'listenchoose', 'words', 'verbs', 'arcade'])
const READING_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']

/** { key, payload } для handleNav. */
export function navForActivity(rec) {
  const id = rec?.navigation?.identifier
  if (!DIRECT.has(id)) return { key: 'practice', payload: undefined }
  if (id === 'reading') {
    const lv = String(rec?.practiceLevel || '').toLowerCase()
    return { key: 'reading', payload: READING_LEVELS.includes(lv) ? { level: lv } : undefined }
  }
  return { key: id, payload: undefined }
}

/** Раздел из «навигации» v16 (кнопки разделов на экране итога: feature(name)) → ключ handleNav. */
export function navForSection(section) {
  if (section === 'tutor') return { key: 'tutor', payload: undefined }
  if (DIRECT.has(section)) return { key: section, payload: undefined }
  return { key: 'practice', payload: undefined }
}
