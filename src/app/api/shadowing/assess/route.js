// Оценка одной фразы Shadowing: multipart { audio (16кГц mono WAV), text (эталон),
// lang } → баллы произношения + послово-карта + короткий совет Claude.
//
// Azure Pronunciation Assessment в эталон-режиме (assessAgainstReference); без
// ключей или при сбое — mock (200, mock:true), чтобы тренажёр работал всегда.
// Совет Claude — best-effort и ТОЛЬКО по реальным баллам. Гость работает.

import {
  assessAgainstReference,
  mockPronunciation,
  isAzureSpeechConfigured,
} from '@/lib/ielts/azure-pronunciation.js'
import { hasAnthropicKey, structured } from '@/lib/anthropic.js'

export const runtime = 'nodejs'

const MAX_BYTES = 10 * 1024 * 1024 // ~5 мин 16кГц mono WAV; фразы куда короче
const LANG_NAME = { ru: 'Russian', en: 'English', kk: 'Kazakh' }

const TIP_SCHEMA = {
  type: 'object',
  properties: { tip: { type: 'string' } },
  required: ['tip'],
}

// Короткий совет тренера по данным Azure. Быстрый/дешёвый haiku, 1–2 фразы на
// языке интерфейса. Осечка не критична — вызывающий отдаст пустой совет.
async function makeTip(score, refText, lang) {
  const weak = (score.words || [])
    .filter((w) => w.error !== 'None' || w.accuracy < 70)
    .map((w) => w.word)
    .slice(0, 6)
  const langName = LANG_NAME[lang] || 'Russian'
  const raw = await structured({
    systemPrompt:
      `You are a warm, concrete English pronunciation coach. Give exactly ONE short, ` +
      `encouraging tip (max 2 sentences) in ${langName}. Target the biggest issue: ` +
      `prosody/intonation or the specific weak words. No preamble, no numbers, no scores.`,
    userMessage:
      `Reference phrase: "${refText}"\n` +
      `Scores (0-100): accuracy ${score.accuracy}, fluency ${score.fluency}, ` +
      `prosody ${score.prosody}, overall ${score.overall}.\n` +
      `Weak or incorrect words: ${weak.join(', ') || 'none'}.`,
    schema: TIP_SCHEMA,
    model: 'claude-haiku-4-5-20251001',
    maxOutputTokens: 200,
  })
  return String(raw?.tip || '').trim().slice(0, 300)
}

export async function GET() {
  return Response.json({ configured: isAzureSpeechConfigured() })
}

export async function POST(request) {
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

  // Оценка: реальная Azure, иначе mock (без падения).
  let score = null
  if (isAzureSpeechConfigured()) {
    score = await assessAgainstReference(Buffer.from(await file.arrayBuffer()), text).catch(
      (e) => {
        console.error('[shadowing.assess] azure failed', e)
        return null
      },
    )
  }
  if (!score) {
    score = { ...mockPronunciation(), words: [], transcript: '' }
  }

  // Совет — best-effort, только по реальным баллам.
  let tip = ''
  if (!score.mock && hasAnthropicKey() && text) {
    try {
      tip = await makeTip(score, text, lang)
    } catch (e) {
      console.error('[shadowing.assess] tip failed', e)
    }
  }

  return Response.json({ ...score, tip })
}
