// Журнал ошибок заданий (ТЗ v2.0, 8.1: «журнал ошибок с правилом, примером, источником и датой; повторяющиеся — в
// приоритет»). Спека — раздел 5.
//
// Строки — неверные ответы из study_answer за 30 дней. Группа — «правило»: тема «Грамматики · игр», урок курса или
// «слова» (все промахи «Словаря» одной группой: правило у слова одно — само слово). Порядок — сколько раз, потом
// свежесть. Ошибки Speaking Buddy сюда не входят: у них своя строка профиля (mistakesLine), и на её название опирается
// правило «назови связь» в RULES.

export const SOURCES = { ggame: 'Грамматика · игры', lesson: 'урок курса', vocab: 'Словарь' }

/**
 * @param {{ source: string, item: string, title?: string|null, example?: string|null, at: number }[]} wrongs
 * @param {{ titleOf?: (item: string) => string|null }} [opts]
 * @returns {{ key: string, source: string, rule: string, count: number, lastAt: number, example: string|null, words?: string[] }[]}
 */
export function buildJournal(wrongs, { titleOf = () => null } = {}) {
  const groups = new Map()
  for (const w of wrongs || []) {
    if (!w || !SOURCES[w.source]) continue
    const key = w.source === 'vocab' ? 'vocab' : String(w.item || '')
    if (!key) continue
    let g = groups.get(key)
    if (!g) {
      g = { key, source: w.source, rule: '', count: 0, lastAt: 0, example: null, words: w.source === 'vocab' ? [] : undefined }
      groups.set(key, g)
    }
    g.count++
    const at = Number(w.at) || 0
    if (at >= g.lastAt) {
      g.lastAt = at
      if (w.example) g.example = String(w.example)
    } else if (!g.example && w.example) g.example = String(w.example)
    if (g.words && w.title && !g.words.includes(w.title)) g.words.push(w.title)
    if (!g.rule) g.rule = (w.source === 'vocab' ? 'слова' : titleOf(w.item) || w.title || w.item) || ''
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
}
