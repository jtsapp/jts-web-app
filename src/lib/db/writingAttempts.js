// Журнал AI-проверенных письменных работ (writing_attempt) + усечённый снимок
// writing-навыков в профиле ученика (learner.writing).
//
// Обе записи best-effort: оценка уже получена и оплачена, терять её из-за
// сбоя БД нельзя — вызывающий роут отдаёт ответ в любом случае, а сюда мы
// возвращаем false и пишем в лог.

import { getSql } from './sql.js'
import { upsertProfile } from './profile.js'

function clamp100(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function strList(v, cap) {
  return Array.isArray(v)
    ? v
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter(Boolean)
        .slice(0, cap)
    : []
}

/**
 * Одна проверенная работа → одна строка writing_attempt. Не ielts_attempt:
 * другой ключ (profile_id) и другой формат оценки (см. 0005_writing.sql).
 * Возвращает true при успехе, false без БД или при сбое записи.
 */
export async function recordWritingAttempt({ profileId, level, genre, wordCount, essay, assessment, mode }) {
  const sql = getSql()
  if (!sql) return false
  try {
    // jsonb — только через sql.json(): porsager сериализует сам, готовая
    // JSON.stringify-строка легла бы двойным кодированием (задокументированный
    // инцидент 21.07.2026, см. upsertProfile в profile.js).
    await sql`
      insert into writing_attempt (profile_id, level, genre, word_count, essay, assessment, mode)
      values (
        ${profileId},
        ${level ?? null},
        ${genre ?? null},
        ${Number.isFinite(Number(wordCount)) ? Math.round(Number(wordCount)) : null},
        ${typeof essay === 'string' ? essay : ''},
        ${sql.json(assessment ?? {})}::jsonb,
        ${mode ?? null}
      )
    `
    return true
  } catch (e) {
    console.error('[writingAttempts] insert failed', e)
    return false
  }
}

/**
 * Снимок последней оценки в learner.writing — его читает голосовой тьютор через
 * room metadata и опирается на слабые места ученика в разговоре. Форма зеркалит
 * sanitizeWriting из /api/profile (grammar/vocab/coherence 0–100, focus до 6,
 * strengths до 4): оба писателя одного поля обязаны совпадать, иначе профиль
 * то и дело меняет форму под читателем. Оценки 0–5 переводим в проценты (×20).
 */
export async function updateWritingSnapshot(profileId, assessment) {
  const sql = getSql()
  if (!sql) return false
  try {
    const scores = assessment?.scores || {}
    const strengths = Array.isArray(assessment?.strengths) ? assessment.strengths : []
    const writing = {
      grammar: clamp100(Number(scores.grammar) * 20),
      vocab: clamp100(Number(scores.vocabulary) * 20),
      coherence: clamp100(Number(scores.organisation) * 20),
      focus: strList(assessment?.nextSteps, 6),
      strengths: strList(strengths.map((s) => s?.why), 4),
    }
    await upsertProfile(profileId, { writing })
    return true
  } catch (e) {
    console.error('[writingAttempts] snapshot update failed', e)
    return false
  }
}
