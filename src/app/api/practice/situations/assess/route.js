// Разбор устного ответа в «Ситуациях»: multipart { audio (16кГц mono WAV),
// level, id, task, title, lang } → транскрипт, пять осей, ошибки и советы.
//
// Три звена, все платные, поэтому порядок такой:
//   1. отсечь мусор (короткая запись) — БЕСПЛАТНО и до любых вызовов;
//   2. списать разбор из дневного лимита — ДО платных вызовов, иначе потолок
//      не держится при гонке;
//   3. STT (Azure, фолбэк Soniox) → если распознавать нечего, вернуть разбор в
//      бюджет: студент не виноват, что микрофон записал тишину;
//   4. произношение (Azure, по аудио) + четыре оси (грейдер) — параллельно.
//
// Гостю разбор не положен: по device-id дневной лимит обходится одним
// рестартом браузера. Записывать себя и слушать он может — это клиентская
// часть, сюда она не ходит.

import { assessPronunciation, isAzureSpeechConfigured, transcribeWav } from '@/lib/ielts/azure-pronunciation.js'
import { transcribeWavSoniox, isSonioxConfigured } from '@/lib/soniox-stt.js'
import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { buildAssessPrompt, ASSESS_SCHEMA } from '@/lib/situations/assessPrompt.js'
import { composeScore } from '@/lib/situations/score.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
// wavSeconds живёт в бюджете Shadowing — это общая арифметика «байты 16кГц
// mono WAV → секунды», и копия здесь разъехалась бы с оригиналом.
import { wavSeconds } from '@/lib/db/shadowingBudget.js'
import { budgetPayload, consume, dayKey, getUsed, refund } from '@/lib/db/situationsBudget.js'

export const runtime = 'nodejs'

// 16кГц mono WAV = ~32 КБ/с, значит 6 МБ ≈ 3 минуты. Ответ на задание — это
// 20–60 секунд даже на C1; три минуты дают запас на «проиграю всю сцену», но
// не дают залить в грейдер подкаст. Лимит обязан оставаться НИЖЕ
// client_max_body_size на nginx (там 32m), иначе прокси отдаёт голый 413.
const MAX_BYTES = 6 * 1024 * 1024

// Короче этого разбирать нечего: «эээ» и случайное касание кнопки. Не списываем
// и не зовём платное — иначе промах пальцем стоит студенту попытки.
const MIN_SECONDS = 1.5

function isSttConfigured() {
  return isAzureSpeechConfigured() || isSonioxConfigured()
}

// Приоритет Azure, как в /api/transcribe: на том же ключе сидит оценка
// произношения, и два провайдера на один экран не нужны. Soniox — фолбэк.
async function transcribe(buf) {
  if (isAzureSpeechConfigured()) {
    const text = await transcribeWav(buf).catch((e) => {
      console.error('[situations.assess] azure stt failed', e)
      return ''
    })
    if (text) return text
  }
  if (isSonioxConfigured()) {
    return await transcribeWavSoniox(buf, { lang: 'en' }).catch((e) => {
      console.error('[situations.assess] soniox stt failed', e)
      return ''
    })
  }
  return ''
}

function clampList(list, cap, mapper) {
  return Array.isArray(list) ? list.slice(0, cap).map(mapper).filter(Boolean) : []
}

// Статус для клиента: есть ли чем разбирать и остаток дневного лимита. Гостю
// budget = null — клиент прячет кнопку «Разобрать ответ».
export async function GET(request) {
  const base = { configured: isSttConfigured() && hasAnthropicKey() }
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return Response.json({ ...base, budget: null })
  if (!isDbConfigured()) return Response.json({ ...base, budget: null })
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  try {
    const used = await getUsed(resolved.id, dayKey(new Date()))
    return Response.json({ ...base, budget: budgetPayload(used, resolved.isDemoAccount) })
  } catch (e) {
    console.error('[situations.assess] budget status failed', e)
    return Response.json({ ...base, budget: null })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Expected multipart/form-data with an 'audio' file." }, { status: 400 })
  }

  const file = form.get('audio')
  const level = String(form.get('level') || '').toLowerCase()
  const task = String(form.get('task') || '').trim()
  const title = String(form.get('title') || '').trim()
  const lang = String(form.get('lang') || 'ru')

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'audio' file field." }, { status: 400 })
  }
  if (file.size === 0) {
    return Response.json({ error: 'Audio file is empty.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: 'recording_too_long', limitMb: Math.floor(MAX_BYTES / (1024 * 1024)) },
      { status: 413 },
    )
  }

  const seconds = wavSeconds(file.size)
  if (seconds < MIN_SECONDS) {
    return Response.json({ error: 'too_short', seconds }, { status: 400 })
  }
  if (!isSttConfigured() || !hasAnthropicKey()) {
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  const profileId = resolved.id
  const isDemo = resolved.isDemoAccount
  const today = dayKey(new Date())

  let charged = false
  let usedNow = null
  if (isDbConfigured()) {
    try {
      const after = await consume(profileId, today, isDemo)
      if (after == null) {
        let used = null
        try {
          used = await getUsed(profileId, today)
        } catch {
          /* показать что есть */
        }
        return Response.json(
          { error: 'daily_limit_reached', budget: budgetPayload(used, isDemo) },
          { status: 429 },
        )
      }
      charged = true
      usedNow = after
    } catch (e) {
      // Сбой БД не должен ронять разбор: fail-open. Один вызов всё равно
      // ограничен длиной записи, риск перерасхода мал. Логируем.
      console.error('[situations.assess] budget consume failed', e)
    }
  }

  const giveBack = async () => {
    if (!charged) return
    try {
      await refund(profileId, today)
      usedNow = usedNow == null ? null : Math.max(0, usedNow - 1)
      charged = false
    } catch (e) {
      console.error('[situations.assess] budget refund failed', e)
    }
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const transcript = (await transcribe(buf)).trim()
  if (!transcript) {
    // Распознавать нечего: тишина, шум, слишком далеко от микрофона. Платного
    // разбора не было — возвращаем попытку.
    await giveBack()
    return Response.json({ empty: true, seconds, budget: budgetPayload(usedNow, isDemo) })
  }

  // Произношение считает Azure по аудио; берём именно accuracy, а не его
  // overall: в overall подмешаны беглость и полнота, а их отдельно оценивает
  // грейдер — иначе одна и та же характеристика попала бы в итог дважды.
  const [pron, graded] = await Promise.all([
    isAzureSpeechConfigured()
      ? assessPronunciation(buf).catch((e) => {
          console.error('[situations.assess] azure pronunciation failed', e)
          return null
        })
      : Promise.resolve(null),
    structured({
      ...buildAssessPrompt({ level, task, transcript, seconds, lang, title }),
      schema: ASSESS_SCHEMA,
      maxOutputTokens: 900,
    }).catch((e) => {
      console.error('[situations.assess] grader failed', e)
      return null
    }),
  ])

  if (!graded) {
    // Грейдер — сердце разбора: без него показывать нечего, и брать за это
    // попытку нельзя.
    await giveBack()
    return Response.json({ error: 'assess_failed', budget: budgetPayload(usedNow, isDemo) }, { status: 502 })
  }

  const { axes, overall } = composeScore({
    grammar: graded.grammar,
    vocabulary: graded.vocabulary,
    fluency: graded.fluency,
    coherence: graded.coherence,
    pronunciation: pron && !pron.mock ? pron.accuracy : null,
  })

  return Response.json({
    transcript,
    seconds,
    overall,
    axes,
    taskAchieved: graded.taskAchieved !== false,
    errors: clampList(graded.errors, 4, (e) => {
      const bad = String(e?.bad || '').trim().slice(0, 200)
      if (!bad) return null
      return { bad, good: String(e?.good || '').trim().slice(0, 200), note: String(e?.note || '').trim().slice(0, 240) }
    }),
    recommendations: clampList(graded.recommendations, 4, (r) =>
      typeof r === 'string' && r.trim() ? r.trim().slice(0, 240) : null,
    ),
    summary: String(graded.summary || '').trim().slice(0, 600),
    budget: budgetPayload(usedNow, isDemo),
  })
}
