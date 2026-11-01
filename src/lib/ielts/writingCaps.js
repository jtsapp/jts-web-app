// Ограничения балла Writing после ответа модели — порт IeltsWritingService.saveAssessment бэкенда (контракт §2).
// Настоящие ограничения ставит бэкенд, а этот порт нужен скрипту eval-writing (прогон эссе без сервера) и тестам:
// чтобы отчёт показывал тот же балл, что увидит ученик. Правила менять только парой с Java.
//
// Порядок: критерии уже приведены к 0–9 с шагом 0.5 → ограничения → общий балл = min(потолок, ieltsRound(среднее)).

import { CRITERIA, overallBand } from '../../ielts/writing/writing.js'

/** Коды баннеров экрана разбора (result.caps). */
export const CAP_CODES = ['off_topic', 'too_short', 'under_length', 'no_overview', 'copied_intro']

/**
 * criteria — { taskResponse, coherenceCohesion, lexicalResource, grammaticalRange };
 * flags — { onTopic, overviewPresent, introCopied } от модели; copied / effectiveWords / minWords / taskKind — от сдачи.
 * Итог: { criteria (копия с ограничением TA), overall, caps: [коды] }.
 */
export function applyWritingCaps({ criteria, onTopic, overviewPresent, introCopied, copied = 0, effectiveWords, minWords, taskKind }) {
  const c = { ...criteria }
  const caps = []
  let capOverall = 9
  const capTa = (max) => {
    c.taskResponse = Math.min(Number(c.taskResponse), max)
  }
  if (onTopic === false) {
    capTa(2)
    capOverall = Math.min(capOverall, 3.5)
    caps.push('off_topic')
  }
  const min = Number(minWords) || 0
  const eff = Number(effectiveWords)
  if (min > 0 && Number.isFinite(eff)) {
    if (eff < 0.5 * min) {
      capTa(4)
      capOverall = Math.min(capOverall, 4.5)
      caps.push('too_short')
    } else if (eff < min) {
      capTa(5)
      caps.push('under_length')
    }
  }
  if (taskKind === 'task1_academic' && overviewPresent === false) {
    capTa(5)
    caps.push('no_overview')
  }
  if (introCopied === true || Number(copied) >= 12) caps.push('copied_intro')
  const mean = overallBand(c)
  return { criteria: c, overall: mean == null ? null : Math.min(capOverall, mean), caps }
}

export { CRITERIA }
