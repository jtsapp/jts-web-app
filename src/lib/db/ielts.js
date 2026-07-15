// IELTS attempt/score persistence. One learner submission → one ielts_attempt
// row (what they wrote) + one ielts_score row (the band result + full AI
// payload for the progress screen and teacher calibration). Best-effort:
// callers wrap this so a DB failure never blocks returning the assessment.
//
// Ported from felix lib/db/ielts.ts. Tables: see src/lib/schema.sql.

import { neon } from '@neondatabase/serverless'

let cached
function getSql() {
  if (cached !== undefined) return cached
  const url = process.env.DATABASE_URL
  cached = url ? neon(url) : null
  return cached
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

// FK safety: ielts_attempt.device_id references learner(device_id), so every
// writer upserts the learner row first.
async function ensureLearner(deviceId) {
  const sql = getSql()
  if (!sql) return
  await sql`
    insert into learner (device_id)
    values (${deviceId})
    on conflict (device_id) do update
      set last_seen_at = now()
  `
}

// Shared two-row write: attempt (what they submitted) + score (the outcome).
// Returns { attemptId, scoreId }, or null when the DB is unconfigured.
async function writeAttemptAndScore({
  profileId,
  section,
  response,
  overallBand,
  criteria,
  assessment,
  provider,
}) {
  const sql = getSql()
  if (!sql) return null

  await ensureLearner(profileId)

  const attemptRows = await sql`
    insert into ielts_attempt (device_id, section, response)
    values (${profileId}, ${section}, ${JSON.stringify(response)}::jsonb)
    returning id
  `
  const attemptId = attemptRows[0].id

  const scoreRows = await sql`
    insert into ielts_score
      (attempt_id, device_id, section, overall_band, criteria, assessment, provider)
    values (
      ${attemptId},
      ${profileId},
      ${section},
      ${overallBand},
      ${JSON.stringify(criteria)}::jsonb,
      ${JSON.stringify(assessment)}::jsonb,
      ${provider}
    )
    returning id
  `

  return { attemptId, scoreId: scoreRows[0].id }
}

/** Persist a Writing submission + its band score. */
export function recordIeltsWriting({ profileId, promptShown, essay, assessment, provider }) {
  return writeAttemptAndScore({
    profileId,
    section: 'writing',
    response: { task: assessment.task, promptShown, essay },
    overallBand: assessment.overallBand,
    criteria: assessment.criteria,
    assessment,
    provider,
  })
}

/**
 * Persist one answer-key-graded Listening/Reading attempt. criteria carries
 * {correct,total} (the progress screen renders it as «N/M правильных»),
 * assessment keeps the full per-question breakdown, provider 'answer-key'
 * marks the deterministic grader.
 */
export function recordIeltsSection({ profileId, section, taskId, answers, result }) {
  return writeAttemptAndScore({
    profileId,
    section,
    response: { taskId, answers },
    overallBand: result.band,
    criteria: { correct: result.correct, total: result.total },
    assessment: result,
    provider: 'answer-key',
  })
}

/** Persist one IELTS Speaking attempt + its band. */
export function recordIeltsSpeaking({ profileId, taskId, answers, assessment, provider }) {
  return writeAttemptAndScore({
    profileId,
    section: 'speaking',
    response: { taskId, answers },
    overallBand: assessment.overallBand,
    criteria: assessment.criteria,
    assessment,
    provider,
  })
}

/** A learner's IELTS score history, most recent first. For the progress screen. */
export async function listIeltsScores(profileId, limit = 50) {
  const sql = getSql()
  if (!sql) return []
  const rows = await sql`
    select id, section, overall_band, criteria, assessment, provider, created_at
    from ielts_score
    where device_id = ${profileId}
    order by created_at desc
    limit ${limit}
  `
  return rows.map((r) => ({
    id: String(r.id),
    section: String(r.section),
    overallBand: Number(r.overall_band),
    criteria: r.criteria,
    assessment: r.assessment,
    provider: r.provider === null ? null : String(r.provider),
    createdAt: String(r.created_at),
  }))
}
