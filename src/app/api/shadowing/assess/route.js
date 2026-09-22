// Оценка одной фразы Shadowing: multipart { audio (16кГц mono WAV), text (эталон),
// lang } → баллы произношения + послово-карта + короткий совет Claude.
//
// Azure Pronunciation Assessment в эталон-режиме (assessAgainstReference); без
// ключей или при сбое — mock (200, mock:true), чтобы тренажёр работал всегда.
// Совет Claude — best-effort и ТОЛЬКО по реальным баллам. Гостю оценка закрыта,
// лимита на количество оценок нет (см. lib/db/shadowingBudget.js).

import {
  assessAgainstReference,
  assessPronunciation,
  mockPronunciation,
  isAzureSpeechConfigured,
} from '@/lib/ielts/azure-pronunciation.js'
import { hasAnthropicKey, structured } from '@/lib/anthropic.js'
import { buildTipPrompt } from '@/lib/shadowing/tipPrompt.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { wavSeconds, creditsForSeconds, dayKey, recordCredits } from '@/lib/db/shadowingBudget.js'

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

export async function POST(request) {
  // Оценка — только для залогиненных: Azure+Claude платные, и учёт кредитов ведём
  // на аккаунт. Гость отсекается здесь (клиент кнопку «Оценить» ему и не показывает).
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

  // Токен проверяем у бэкенда ДО платного вызова: одного заголовка Bearer мало,
  // иначе Azure жёг бы любой выдуманный токен. Отсюда же profile-id для учёта.
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

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

  // Учёт — только за состоявшуюся оценку: mock (Azure не настроен/сбой) ничего не
  // стоил, и минутами шэдоуинга в Roadmap он не считается. Пишем ПОСЛЕ вызова:
  // списывать заранее имело смысл, пока гонка могла пробить потолок, а потолка
  // больше нет. Без БД учёта нет; сбой БД оценку не роняет — теряется лишь
  // строка учёта, студент своё получает.
  if (!score.mock) {
    try {
      await recordCredits(resolved.id, dayKey(new Date()), creditsForSeconds(wavSeconds(file.size)))
    } catch (e) {
      console.error('[shadowing.assess] usage record failed', e)
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

  return Response.json({ ...score, tip })
}
