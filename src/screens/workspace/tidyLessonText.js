// Хвост `>` / `">` из сломанной вёрстки курса (`make small talk." >`).
export function tidyLessonText(value) {
  return String(value ?? '')
    .replace(/&gt;/gi, '>')
    .replace(/["']?\s*>+\s*$/g, (tail) => (tail.includes('"') ? '"' : tail.includes("'") ? "'" : ''))
    .replace(/\s+$/g, '')
}
