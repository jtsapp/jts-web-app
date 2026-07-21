// Долговременная память тьютора: профиль ученика (learner) + журналы ошибок,
// тем, фактов, словаря и «пройденных» ошибок.
//
// Ключ (profileId) приходит из resolveProfileId: `user-<id>` у залогиненного,
// device-id у анонима. Колонка исторически называется device_id — переименовывать
// её нельзя, база общая с felix.
//
// Порт felix lib/db/profile.ts.

import { getSql } from './sql.js'

function trimText(s, max = 240) {
  if (typeof s !== 'string') return null
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return null
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

// FK-безопасность: mistake_log.device_id и остальные ссылаются на learner,
// поэтому каждый писатель сначала создаёт строку ученика.
export async function ensureLearner(deviceId) {
  const sql = getSql()
  if (!sql) return
  await sql`
    insert into learner (device_id)
    values (${deviceId})
    on conflict (device_id) do update
      set last_seen_at = now()
  `
}

export async function upsertProfile(deviceId, patch) {
  const sql = getSql()
  if (!sql) return
  await ensureLearner(deviceId)
  // coalesce для скаляров: не переданное поле не затирает сохранённое.
  // case/when для jsonb: явный null должен уметь очистить поле.
  await sql`
    update learner set
      level           = coalesce(${patch.level ?? null}, level),
      lang            = coalesce(${patch.lang ?? null}, lang),
      style           = coalesce(${patch.style ?? null}, style),
      goal            = coalesce(${patch.goal ?? null}, goal),
      tutor           = coalesce(${patch.tutor ?? null}, tutor),
      profession      = coalesce(${patch.profession ?? null}, profession),
      interests       = case
                          when ${patch.interests !== undefined}
                          then ${JSON.stringify(patch.interests ?? [])}::jsonb
                          else interests
                        end,
      minutes_per_day = case
                          when ${patch.minutesPerDay !== undefined}
                          then ${patch.minutesPerDay ?? null}
                          else minutes_per_day
                        end,
      skills          = case
                          when ${patch.skills !== undefined}
                          then ${patch.skills ? JSON.stringify(patch.skills) : null}::jsonb
                          else skills
                        end,
      writing         = case
                          when ${patch.writing !== undefined}
                          then ${patch.writing ? JSON.stringify(patch.writing) : null}::jsonb
                          else writing
                        end,
      updated_at      = now(),
      last_seen_at    = now()
    where device_id = ${deviceId}
  `
}

export async function appendMistakes(deviceId, raw) {
  const sql = getSql()
  if (!sql) return
  const clean = raw.map((x) => trimText(x)).filter(Boolean)
  if (clean.length === 0) return
  await ensureLearner(deviceId)
  await sql`
    insert into mistake_log (device_id, mistake)
    select ${deviceId}, m
    from unnest(${clean}::text[]) as t(m)
  `
  // Spaced repetition: schedule each new mistake for its first review tomorrow
  // (Leitner box 0). on-conflict-do-nothing so re-logging the same mistake keeps
  // its existing schedule (box movement is log_review's job, not re-logging's).
  // Soft-fail: if review_item isn't migrated yet, mistake logging must not break.
  try {
    for (const m of clean) {
      await sql`
        insert into review_item (device_id, kind, item, item_key, box, due_at)
        values (${deviceId}, 'mistake', ${m}, ${m.toLowerCase()}, 0, now() + interval '1 day')
        on conflict (device_id, kind, item_key) do nothing
      `
    }
  } catch {
    // review_item table absent (migration pending) — SR simply inactive.
  }
}

// Leitner ladder: box index → days until next review. Correct answer advances a
// box (longer gap), a wrong answer drops back to box 0 (see tomorrow).
const LEITNER_DAYS = [1, 3, 7, 21, 60]

/**
 * Reschedule a reviewed item (mistake OR vocab) after the tutor quizzed the
 * learner on it. correct → advance one Leitner box; wrong → reset to box 0.
 * Matching is fuzzy (like resolved_log) and kind-agnostic: the tutor echoes the
 * item text with log_review and we find it by key across both kinds.
 */
export async function reviewItem(deviceId, item, correct) {
  const sql = getSql()
  if (!sql) return
  const text = trimText(item, 240)
  if (!text) return
  const key = text.toLowerCase()
  const rows = await sql`
    select id, box from review_item
    where device_id = ${deviceId}
      and (item_key = ${key}
           or item_key like ${'%' + key + '%'}
           or ${key} like '%' || item_key || '%')
    order by due_at asc
    limit 1
  `
  if (rows.length === 0) return
  const box = correct
    ? Math.min((rows[0].box | 0) + 1, LEITNER_DAYS.length - 1)
    : 0
  const days = LEITNER_DAYS[box]
  await sql`
    update review_item set
      box        = ${box},
      reps       = reps + 1,
      lapses     = lapses + ${correct ? 0 : 1},
      due_at     = now() + make_interval(days => ${days}),
      updated_at = now()
    where id = ${rows[0].id}
  `
}

export async function appendTopics(deviceId, raw) {
  const sql = getSql()
  if (!sql) return
  const clean = raw.map((x) => trimText(x, 120)).filter(Boolean)
  if (clean.length === 0) return
  await ensureLearner(deviceId)
  // Нестрогий дедуп: пропускаем тему, если она уже есть среди последних 50,
  // иначе лента «обсуждённых тем» забивается повторами.
  await sql`
    insert into topic_log (device_id, topic)
    select ${deviceId}, t.topic
    from unnest(${clean}::text[]) as t(topic)
    where not exists (
      select 1 from (
        select topic from topic_log
        where device_id = ${deviceId}
        order by created_at desc
        limit 50
      ) recent
      where recent.topic = t.topic
    )
  `
}

export async function appendFacts(deviceId, raw) {
  const sql = getSql()
  if (!sql) return
  const clean = raw.map((x) => trimText(x)).filter(Boolean)
  if (clean.length === 0) return
  await ensureLearner(deviceId)
  // Дедуп как у тем: тьютор, каждый раз логирующий «хочет в Лондон», не должен
  // множить один факт.
  await sql`
    insert into fact_log (device_id, fact)
    select ${deviceId}, t.fact
    from unnest(${clean}::text[]) as t(fact)
    where not exists (
      select 1 from (
        select fact from fact_log
        where device_id = ${deviceId}
        order by created_at desc
        limit 50
      ) recent
      where recent.fact = t.fact
    )
  `
}

// Липкий флаг безопасности. Внутри приложения обратно в false не возвращается.
export async function raiseSafetyAlert(deviceId) {
  const sql = getSql()
  if (!sql) return
  await ensureLearner(deviceId)
  await sql`
    update learner set safety_alert = true, updated_at = now()
    where device_id = ${deviceId}
  `
}

export async function appendResolved(deviceId, raw) {
  const sql = getSql()
  if (!sql) return
  const clean = raw.map((x) => trimText(x, 160)).filter(Boolean)
  if (clean.length === 0) return
  await ensureLearner(deviceId)
  await sql`
    insert into resolved_log (device_id, resolved)
    select ${deviceId}, t.resolved
    from unnest(${clean}::text[]) as t(resolved)
    where not exists (
      select 1 from (
        select resolved from resolved_log
        where device_id = ${deviceId}
        order by created_at desc
        limit 50
      ) recent
      where recent.resolved = t.resolved
    )
  `
}

export async function appendVocab(deviceId, words) {
  const sql = getSql()
  if (!sql) return
  const clean = words
    .map((w) => {
      const word = trimText(w.word, 80)
      const hint = trimText(w.hint ?? null, 160)
      if (!word) return null
      return { word, hint, key: word.toLowerCase() }
    })
    .filter(Boolean)
  if (clean.length === 0) return
  await ensureLearner(deviceId)
  for (const w of clean) {
    await sql`
      insert into vocab_bank (device_id, word, word_key, hint)
      values (${deviceId}, ${w.word}, ${w.key}, ${w.hint})
      on conflict (device_id, word_key) do nothing
    `
  }
  // Spaced repetition: schedule each new word for its first review tomorrow,
  // same Leitner ladder as mistakes. Soft-fail if review_item isn't migrated.
  try {
    for (const w of clean) {
      await sql`
        insert into review_item (device_id, kind, item, item_key, box, due_at)
        values (${deviceId}, 'vocab', ${w.word}, ${w.key}, 0, now() + interval '1 day')
        on conflict (device_id, kind, item_key) do nothing
      `
    }
  } catch {
    // review_item table absent (migration pending) — SR simply inactive.
  }
}

/**
 * Полная память ученика для экрана профиля и промпта тьютора.
 * Возвращает null, если ученика нет, и при неподнятой БД.
 */
export async function loadProfile(deviceId) {
  const sql = getSql()
  if (!sql) return null
  const baseRows = await sql`
    select level, lang, style, goal, tutor, interests, profession,
           minutes_per_day, skills, writing, safety_alert
    from learner
    where device_id = ${deviceId}
  `
  if (baseRows.length === 0) return null
  const base = baseRows[0]

  const [
    mistakesRows, topicsRows, factsRows, vocabRows, resolvedRows, lessonRows,
    dueRows, dueVocabRows,
  ] = await Promise.all([
      // Берём с запасом (30): после отсева «пройденных» ниже должно остаться
      // полное окно активных ошибок.
      sql`
        select mistake from mistake_log
        where device_id = ${deviceId}
        order by created_at desc
        limit 30
      `,
      sql`
        select topic from topic_log
        where device_id = ${deviceId}
        order by created_at desc
        limit 12
      `,
      // Мягкий отказ: если таблицы ещё нет (миграция не доехала), теряем только
      // факты, а не всю память целиком.
      sql`
        select fact from fact_log
        where device_id = ${deviceId}
        order by created_at desc
        limit 12
      `.catch(() => []),
      sql`
        select word from vocab_bank
        where device_id = ${deviceId}
        order by added_at desc
        limit 30
      `,
      sql`
        select resolved from resolved_log
        where device_id = ${deviceId}
        order by created_at desc
        limit 50
      `.catch(() => []),
      sql`
        select lesson_key, status, score, attempts, next_variant
        from lesson_progress
        where device_id = ${deviceId}
        order by updated_at desc
        limit 200
      `.catch(() => []),
      // Spaced repetition: items whose scheduled review time has passed. Soft-fail
      // if review_item isn't migrated yet — the rest of the profile still loads.
      sql`
        select item from review_item
        where device_id = ${deviceId} and kind = 'mistake' and due_at <= now()
        order by due_at asc
        limit 6
      `.catch(() => []),
      sql`
        select item from review_item
        where device_id = ${deviceId} and kind = 'vocab' and due_at <= now()
        order by due_at asc
        limit 6
      `.catch(() => []),
    ])

  const resolved = resolvedRows.map((r) => r.resolved)
  const resolvedLower = resolved.map((r) => r.toLowerCase())
  // Прячем ошибки, которые ученик перерос: если «пройденный» токен входит в
  // текст ошибки (или наоборот), считаем освоенным и не даём тьютору её долбить.
  // Подстрочное сравнение — намеренно нестрогое.
  const activeMistakes = mistakesRows
    .map((r) => r.mistake)
    .filter((m) => {
      const ml = m.toLowerCase()
      return !resolvedLower.some((r) => r && (ml.includes(r) || r.includes(ml)))
    })
    .slice(0, 12)

  return {
    deviceId,
    level: base.level,
    lang: base.lang,
    style: base.style,
    goal: base.goal,
    tutor: base.tutor,
    interests: Array.isArray(base.interests) ? base.interests : [],
    profession: base.profession,
    minutesPerDay: base.minutes_per_day,
    skills: base.skills ?? null,
    writing: base.writing ?? null,
    mistakes: activeMistakes,
    // Тот же отсев «пройденных», что у activeMistakes: приложение помечает ошибку
    // освоенной через resolved_log, но review_item отдельная таблица и её строка
    // живёт дальше. Без фильтра тьютор долбил бы ошибку, которую ученик перерос.
    dueReviews: dueRows
      .map((r) => r.item)
      .filter((m) => {
        const ml = m.toLowerCase()
        return !resolvedLower.some((r) => r && (ml.includes(r) || r.includes(ml)))
      }),
    dueVocab: dueVocabRows.map((r) => r.item),
    topics: topicsRows.map((r) => r.topic),
    facts: factsRows.map((r) => r.fact),
    vocab: vocabRows.map((r) => r.word),
    resolved,
    safetyAlert: Boolean(base.safety_alert),
    lessons: lessonRows.map((r) => ({
      lessonKey: r.lesson_key,
      status: r.status === 'passed' ? 'passed' : 'failed',
      score: r.score,
      attempts: r.attempts,
      nextVariant: r.next_variant,
    })),
  }
}
