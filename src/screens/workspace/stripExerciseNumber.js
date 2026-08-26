/**
 * Course HTML titles often keep the old stage number («3 · Choose…»), while
 * the live sheet stamps its own badge from practice order. Showing both
 * reads as two conflicting numerations (badge 2 + «3 · …»).
 */
export function stripExerciseNumber(title) {
  const raw = String(title || '').trim()
  if (!raw) return ''
  return raw.replace(/^\d+\s*[·.•\-–—:)]\s*/u, '').replace(/^\d+\.\s+/, '').trim() || raw
}
