// Произношение в «SpeakSpin»: общий балл Azure (0–100) → шкала рубрики 1..5.
//
// Модель произношение НЕ оценивает: по транскрипту оно не видно, а угадывать
// его по тексту — выдавать ошибки распознавания за ошибки студента. Балл
// приходит только от Azure по аудио.
//
// Пороги — ПЕРВАЯ прикидка калибровки (02.10.2026), не замер: на живых
// ответах их предстоит сверить с оценкой методиста. Берём overall, а не
// accuracy, как в «Ситуациях»: здесь беглость отдельной осью Azure не идёт,
// и overall честнее отражает «насколько понятно звучит» в целом.
const THRESHOLDS = [
  [45, 1],
  [60, 2],
  [75, 3],
  [88, 4],
]

// null/NaN/не число → null: «произношение не оценивали», а не «оценили на 1».
export function pronunciationBand(overall) {
  if (overall == null || typeof overall === 'boolean') return null
  const n = Number(overall)
  if (!Number.isFinite(n)) return null
  for (const [below, band] of THRESHOLDS) {
    if (n < below) return band
  }
  return 5
}
