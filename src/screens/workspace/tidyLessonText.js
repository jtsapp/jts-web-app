// Литеральные `\u00e9` из курса и хвост, который остаётся, когда слэш
// съели при разборе (`cafu00e9` → на экране «caflu00e9»).
const COURSE_ESCAPES = new Set([
  0x00e0, 0x00e1, 0x00e2, 0x00e7, 0x00e8, 0x00e9, 0x00ea, 0x00eb,
  0x00ed, 0x00f1, 0x00f3, 0x00fa, 0x00fc, 0x00f6, 0x00e4, 0x00a3,
  0x00b0, 0x2018, 0x2019, 0x201c, 0x201d, 0x2192,
])

export function decodeCourseEscapes(value) {
  let s = String(value ?? '')
  if (s.includes('\\u')) {
    s = s.replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  }
  return s.replace(/([A-Za-z])u([0-9a-fA-F]{4})(?![0-9a-fA-F])/g, (m, letter, hex) => {
    const code = parseInt(hex, 16)
    return COURSE_ESCAPES.has(code) ? letter + String.fromCharCode(code) : m
  })
}

// Хвост `>` / `">` из сломанной вёрстки курса (`make small talk." >`).
export function tidyLessonText(value) {
  return decodeCourseEscapes(value)
    .replace(/&gt;/gi, '>')
    .replace(/["']?\s*>+\s*$/g, (tail) => (tail.includes('"') ? '"' : tail.includes("'") ? "'" : ''))
    .replace(/\s+$/g, '')
}
