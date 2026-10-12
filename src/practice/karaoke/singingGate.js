// Порог «поёт / молчит» для маски караоке. Чистый модуль: замеры громкости
// приходят снаружи (mic.js), здесь только решение по каждому.
//
// Раньше порог был max(3 × фон, 0.012). Микрофон открыт без автоусиления, и с
// ноутбука на столе голос приходит на ~0.006 RMS (замер «Аркады», PR #526):
// такого певца маска не слышала совсем, и ритм, покрытие и темп выходили
// нулями у человека, который пел всю песню. Пол 0.012 стоял не зря — в тихой
// комнате фон почти ноль, и без пола пением становился любой шорох и остаток
// музыки из динамиков. Поэтому пол заменён тремя мерками, а не просто снижен
// (в «Аркаде» простое снижение испортило громкий вход):
//  • фон комнаты — калибровка перед стартом, как и раньше (× 3);
//  • остаток музыки — уровень во вступлении, пока петь ещё рано (75-й
//    процентиль × 1,5). Только вступление, а не все паузы: на проде таймкоды
//    неточные, и «пауза» середины песни бывает спетой — голос в ней задрал бы
//    порог над самим певцом;
//  • голос самого певца — 90-й процентиль последних шести секунд минус 26 дБ:
//    громкому певцу это прежние ~0.01, и дыхание между строками пением не
//    становится, а тихому порог опускается вслед за голосом. Процентиль, а не
//    максимум, — чтобы хлопок или стук порог не задирали.
// Ниже MIN_THRESHOLD (~ −50 дБ) порог не опускается никогда.
//
// Коэффициенты подобраны на стенде: голос из записей «Глаголов» через
// фейковый микрофон Chrome (с его шумодавом) на трёх уровнях и под фоновой
// речью. Живого пения в замере не было — калибровка на нём ждёт вместе с
// оценкой через Azure (PR #507).

import { MASK_STEP_MS } from './scoring.js'

export const MIN_THRESHOLD = 0.003
const VOICE_DROP = 0.05 // −26 дБ
const VOICE_WINDOW_MS = 6000
const LEAK_PERCENTILE = 0.75
const LEAK_FACTOR = 1.5
const LEAK_MAX_FRAMES = 600 // полминуты вступления — больше не нужно

function percentile(values, p) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * p)]
}

/**
 * `floor` — медиана фона из калибровки. `step(rms, intro)` — один замер:
 * `intro` — идёт вступление, петь ещё рано (см. introAt). Возвращает, громче
 * ли замер текущего порога; сглаживание по окнам — у вызывающего.
 */
export function createSingingGate({ floor = 0, stepMs = MASK_STEP_MS } = {}) {
  const winLen = Math.max(1, Math.round(VOICE_WINDOW_MS / stepMs))
  const recent = []
  const introFrames = []
  let leak = 0
  const threshold = () =>
    Math.max(MIN_THRESHOLD, floor * 3, leak * LEAK_FACTOR, percentile(recent, 0.9) * VOICE_DROP)
  return {
    threshold,
    step(rms, intro = false) {
      const v = Number.isFinite(rms) ? rms : 0
      if (intro && introFrames.length < LEAK_MAX_FRAMES) {
        introFrames.push(v)
        leak = percentile(introFrames, LEAK_PERCENTILE)
      }
      recent.push(v)
      if (recent.length > winLen) recent.shift()
      return v > threshold()
    },
  }
}

/**
 * Предикат «идёт вступление»: до первой строки песни без `margin` секунд.
 * Запас — потому что певец вступает чуть раньше строки, и это не остаток
 * музыки.
 */
export function introAt(lines, margin = 0.5) {
  const first = (lines || []).reduce((m, l) => Math.min(m, l.start), Infinity)
  return (t) => Number.isFinite(first) && t >= 0 && t < first - margin
}
