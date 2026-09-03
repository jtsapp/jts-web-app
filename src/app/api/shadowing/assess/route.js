// Оценка одной фразы Shadowing: multipart { audio (16кГц mono WAV), text (эталон),
// lang } → баллы произношения + послово-карта + короткий совет Claude.
//
// Azure Pronunciation Assessment в эталон-режиме (assessAgainstReference); без
// ключей или при сбое — mock (200, mock:true), чтобы тренажёр работал всегда.
// Совет Claude — best-effort и ТОЛЬКО по реальным баллам. Гость работает.

import {
  assessAgainstReference,
  assessPronunciation,
  mockPronunciation,
  isAzureSpeechConfigured,
} from '@/lib/ielts/azure-pronunciation.js'
import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { buildTipPrompt } from '@/lib/shadowing/tipPrompt.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import {
  wavSeconds,
  creditsForSeconds,
  isoWeekKey,
  budgetPayload,
  exceedsWeeklyBudget,
  weeklyLimitFor,
  getUsed,
  consume,
  refund,
} from '@/lib/db/shadowingBudget.js'

export const runtime = 'nodejs'

// ~15 минут 16кГц mono WAV — самый длинный отрывок в уроках идёт 14.6 минуты.
// Было 40 МБ, но лимит обязан оставаться НИЖЕ client_max_body_size на nginx
// (там 32m): иначе прокси отдаёт голый 413 вместо понятной ошибки роута.
const MAX_BYTES = 30 * 1024 * 1024

const TIP_SCHEMA = {
  type: 'object',
  properties: { tip: { type: 'string' } },
  required: ['tip'],
}

// Короткий совет тренера по данным Azure. Быстрый/дешёвый haiku, 1–2 фразы на
// языке интерфейса (промпт — в lib/shadowing/tipPrompt.js). Осечка не критична —
// вызывающий отдаст пустой совет.
async function makeTip(score, refText, lang) {
  const { systemPrompt, userMessage } = buildTipPrompt(score, refText, lang)
  const raw = await structured({
    systemPrompt,
    userMessage,
    schema: TIP_SCHEMA,
    model: 'claude-haiku-4-5-20251001',
    maxOutputTokens: 200,
  })
  return String(raw?.tip || '').trim().slice(0, 300)
}

// Статус для клиента: настроена ли оценка и остаток недельного бюджета. Гостю
// (без Bearer) budget = null — кнопку «Оценить» клиент прячет. Для залогиненного
// с настроенной БД отдаём used/remaining, чтобы показать «осталось N/10» — и
// N/3 демо-аккаунту: показывать общий потолок тому, кого отсекут на своём,
// значит гарантированно получить его в поддержке.
export async function GET(request) {
  const base = { configured: isAzureSpeechConfigured() }
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return Response.json({ ...base, budget: null })
  if (!isDbConfigured()) return Response.json({ ...base, budget: null })
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  try {
    const used = await getUsed(resolved.id, isoWeekKey(new Date()))
    return Response.json({ ...base, budget: budgetPayload(used, resolved.isDemoAccount) })
  } catch (e) {
    console.error('[shadowing.assess] budget status failed', e)
    return Response.json({ ...base, budget: null })
  }
}

export async function POST(request) {
  // Оценка — только для залогиненных: Azure+Claude платные, лимит считаем на
  // аккаунт. Гость отсекается здесь (клиент кнопку «Оценить» ему и не показывает).
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  let form
  try {
    form = await request.formData()
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data with an 'audio' file." },
      { status: 400 },
    )
  }

  const file = form.get('audio')
  const text = String(form.get('text') || '').trim()
  const lang = String(form.get('lang') || 'ru')
  // 'whole' — оценка целого отрывка: длинное аудио, поэтому continuous без
  // эталона (recognizeOnce эталон-режима обрезал бы на ~15с). Послово-карты нет.
  const mode = String(form.get('mode') || 'phrase')

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'audio' file field." }, { status: 400 })
  }
  if (file.size === 0) {
    return Response.json({ error: 'Audio file is empty.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `Audio too large. Keep it under ${Math.floor(MAX_BYTES / (1024 * 1024))} MB.` },
      { status: 413 },
    )
  }

  // Идентичность и недельный лимит. Гость уже отсечён выше; здесь резолвим
  // profile-id и списываем кредиты ДО платного вызова — так недельный потолок не
  // пробить даже при гонке. Без БД (dev/preview) метрирования нет (мягкая
  // деградация, как в остальных db-модулях).
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  const profileId = resolved.id
  // Демо-аккаунту — свой недельный потолок (3 кредита, см. shadowingBudget.js).
  // Флаг приехал тем же /user/me, которым проверялся токен, и решает и отсечку,
  // и списание, и цифру в ответе — одним значением на весь запрос.
  const isDemo = resolved.isDemoAccount

  const weekKey = isoWeekKey(new Date())
  const credits = creditsForSeconds(wavSeconds(file.size))
  let charged = null // { profileId, weekKey, credits } — если списали (для рефанда)
  let usedNow = null // текущее used для поля budget в ответе

  if (isDbConfigured()) {
    // Запись дороже целого недельного бюджета — оценить нечем, не начинаем.
    // На демо-потолке в 3 кредита сюда попадает уже запись длиннее 90 секунд, и
    // проверка обязательна: путь INSERT в consume() лимит не смотрит.
    if (exceedsWeeklyBudget(credits, isDemo)) {
      let used = weeklyLimitFor(isDemo)
      try { used = await getUsed(profileId, weekKey) } catch { /* показать что есть */ }
      return Response.json(
        { error: 'recording_too_long', budget: budgetPayload(used, isDemo) },
        { status: 413 },
      )
    }
    try {
      const after = await consume(profileId, weekKey, credits, isDemo)
      if (after == null) {
        // Лимит на неделю исчерпан.
        let used = weeklyLimitFor(isDemo)
        try { used = await getUsed(profileId, weekKey) } catch { /* показать что есть */ }
        return Response.json(
          { error: 'weekly_limit_reached', budget: budgetPayload(used, isDemo) },
          { status: 429 },
        )
      }
      charged = { profileId, weekKey, credits }
      usedNow = after
    } catch (e) {
      // Сбой БД не должен ронять оценку: fail-open. Разовый вызов всё равно
      // ограничен длиной аудио, так что риск перерасхода мал. Логируем.
      console.error('[shadowing.assess] budget consume failed', e)
    }
  }

  // Оценка: реальная Azure, иначе mock (без падения).
  let score = null
  if (isAzureSpeechConfigured()) {
    const buf = Buffer.from(await file.arrayBuffer())
    const run =
      mode === 'whole'
        ? assessPronunciation(buf).then((r) => (r ? { ...r, words: [] } : null))
        : assessAgainstReference(buf, text)
    score = await run.catch((e) => {
      console.error('[shadowing.assess] azure failed', e)
      return null
    })
  }
  if (!score) {
    score = { ...mockPronunciation(), words: [], transcript: '' }
  }

  // Оценка не состоялась (Azure не настроен/сбой → mock) — вернём кредиты: платы
  // не было, недельный бюджет тратить не за что.
  if (score.mock && charged) {
    try {
      await refund(charged.profileId, charged.weekKey, charged.credits)
      usedNow = Math.max(0, usedNow - charged.credits)
    } catch (e) {
      console.error('[shadowing.assess] budget refund failed', e)
    }
  }

  // Совет — best-effort, только по реальным баллам.
  let tip = ''
  if (!score.mock && hasAnthropicKey() && (text || mode === 'whole')) {
    try {
      tip = await makeTip(score, text || '(целый отрывок)', lang)
    } catch (e) {
      console.error('[shadowing.assess] tip failed', e)
    }
  }

  return Response.json({ ...score, tip, budget: budgetPayload(usedNow, isDemo) })
}
