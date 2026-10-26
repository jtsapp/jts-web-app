// Подписи данных резюме для профиля и листа резюме — общие, чтобы два вида одного учителя не разошлись.
export const LEVELS = ['A0', 'A1–A2', 'B1–B2', 'C1', 'C2']

// «A0–B2» из уровней учителя для плитки «уровни учеников».
export function levelsRange(levels) {
  if (!levels?.length) return null
  const ordered = LEVELS.filter((l) => levels.includes(l))
  if (!ordered.length) return levels.join(', ')
  return `${ordered[0].split('–')[0]}–${ordered[ordered.length - 1].split('–').pop()}`
}

export function years(from, to, present, t) {
  if (!from && !to) return ''
  return `${from || ''} — ${present ? t('pf.present') : to || ''}`
}
