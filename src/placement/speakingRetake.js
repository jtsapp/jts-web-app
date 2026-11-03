// Пересдача одного говорения с «Главной» (решение владельца 03.11.2026: «если нет уровня — можно перепройти»).
//
// Тест v16 хранит прогон в браузере, а на другом устройстве его нет вовсе, поэтому пересдача идёт мимо теста: то же окно
// говорения (SpeakingTask) поверх «Главной», а итог дописывается в сохранённый конверт так же, как его записал бы сам
// тест (validateSpeaking и buildResultPayload автора). Общий уровень не меняется: говорение в него не входит.

import { CEFR } from './envelope.js'
import { pickFeedback } from './speakingFeedback.js'

/** Говорение в конверте не оценено — можно пересдать. */
export function speakingMissing(env) {
  const s = env?.assessment?.skillResults?.S
  return !!env?.assessment && !(s?.status === 'completed' && CEFR.includes(s.level))
}

/** Уровни трёх навыков из конверта — по ним окно выбирает тему, как в тесте. */
export function retakeArgs(env) {
  const s = env?.assessment?.skillResults || {}
  return { grammarLevel: s.LU?.level || null, readingLevel: s.R?.level || null, listeningLevel: s.L?.level || null }
}

/**
 * Конверт с оценённым говорением или null, если ответ окна не оценка. Метки прошлого отказа (speaking_*) снимаются;
 * «частичный» итог становится «предварительным», когда грамматика, чтение и аудирование тоже пройдены — то же правило,
 * что у автора (overall.partial = !allCoreDone() || говорение не оценено). Ручная запись уровня ('manual') такой и
 * остаётся.
 */
export function withSpeakingResult(env, r) {
  const a = env?.assessment
  const raw = r?.speaking_level || r?.level || r?.cefr_level
  const level = CEFR.includes(raw) ? raw : null
  if (!a || !level || (r?.status !== 'completed' && r?.status !== 'success')) return null
  const S = {
    status: 'completed',
    level,
    confidence: r.confidence || null,
    subscores: r.subscores || null,
    feedback: pickFeedback(r?.feedback || r),
  }
  const skillResults = { ...(a.skillResults || {}), S }
  const coreDone = ['LU', 'R', 'L'].every((k) => CEFR.includes(skillResults[k]?.level))
  const flags = (Array.isArray(a.flags) ? a.flags : []).filter((f) => !(typeof f === 'string' && f.startsWith('speaking_')))
  const overallStatus = a.overallStatus === 'manual' ? 'manual' : coreDone ? 'preliminary' : 'partial'
  const rawResult = a.rawResult
    ? {
        ...a.rawResult,
        flags,
        skills: { ...(a.rawResult.skills || {}), S },
        levels: { ...(a.rawResult.levels || {}), S: level },
        overall: a.rawResult.overall ? { ...a.rawResult.overall, partial: !coreDone } : a.rawResult.overall,
      }
    : a.rawResult
  return {
    ...env,
    assessment: { ...a, skillResults, speakingStatus: 'completed', flags, overallStatus, ...(rawResult ? { rawResult } : {}) },
    host: { ...(env.host || {}), speakingRetakenAt: new Date().toISOString() },
  }
}
