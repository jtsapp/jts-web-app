// Выжимка звонка: один вызов LLM по транскрипту, который и так лежит в
// call_log, разложенный на три адресата:
//   - отчёт ученику      → call_log.recap/topics/wins/mistakes/new_words/focus
//   - долгая память      → fact_log, topic_log (только free|placement)
//   - наблюдаемость      → call_log.summary_status
//
// Правило номер один: звонок уже в базе, выжимка его не роняет. Всё, что здесь
// падает, стоит только выжимки — сам звонок с транскриптом остаётся целым.
//
// IO-половина модуля. Всё, что можно проверить тестом (промпт, схема, язык,
// бюджет, валидация), живёт в ./prompt.js.

import { SUMMARY_MODEL, hasAnthropicKey, structured } from '../anthropic.js'
import { loadKnownMemory } from '../db/profile.js'
import {
  findStaleSummaryCallId,
  loadCallForSummary,
  markSummaryStatus,
  saveCallSummary,
} from '../db/calls.js'
import {
  FACT_MODES,
  MIN_TURNS,
  buildSummaryPrompt,
  isEmptySummary,
  validateSummary,
} from './prompt.js'

// Без него дефолт SDK — 10 минут с ретраями, и зависший вызов держал бы after()
// вместе с памятью процесса на контейнере с mem_limit: 1g.
const SUMMARY_TIMEOUT_MS = 30_000

function logSummary(fields) {
  try {
    console.log(JSON.stringify({ kind: 'call_summary', ...fields }))
  } catch {
    /* лог не должен ронять фоновую работу */
  }
}

/**
 * @param {{callId: string|null, trusted: boolean,
 *          call?: {deviceId?: string, transcript: object[], lang?: string,
 *                  mode?: string, level?: string}}} params
 * @returns {Promise<'skipped'|'done'|'failed'|'noop'>}
 */
export async function summarizeCall({ callId, trusted, call = null }) {
  // insertCall не вернул id: пустой транскрипт или БД не поднята — суммаризовать
  // нечего и негде.
  if (!callId) return 'noop'

  // Гейт по служебному ключу. resolveProfileId пускает любой анонимный device-id
  // без аутентификации, и сегодня подделанный POST стоит одной вставки в базу.
  // С выжимкой он стоил бы вызова Haiku на тексте, который прислал сам
  // злоумышленник, — ровно та дыра, которую уже закрыл voice/brain-роут.
  if (!trusted) {
    await markSummaryStatus(callId, 'skipped')
    return 'skipped'
  }
  if (!hasAnthropicKey()) {
    await markSummaryStatus(callId, 'skipped')
    return 'skipped'
  }

  const source = call || (await loadCallForSummary(callId))
  const transcript = Array.isArray(source?.transcript) ? source.transcript : []
  // «Алло? — Привет. — *сброс*»: суммаризовать нечего, LLM не трогаем.
  if (transcript.length < MIN_TURNS) {
    await markSummaryStatus(callId, 'skipped')
    return 'skipped'
  }

  const mode = typeof source.mode === 'string' ? source.mode : 'free'
  const started = Date.now()
  await markSummaryStatus(callId, 'pending')

  try {
    const known = source.deviceId
      ? await loadKnownMemory(source.deviceId)
      : { facts: [], topics: [] }

    const { systemPrompt, userMessage, schema } = buildSummaryPrompt({
      transcript,
      lang: source.lang,
      mode,
      level: source.level,
      knownFacts: known.facts,
      knownTopics: known.topics,
    })

    const raw = await structured({
      systemPrompt,
      userMessage,
      schema,
      model: SUMMARY_MODEL,
      maxOutputTokens: 2048,
      timeoutMs: SUMMARY_TIMEOUT_MS,
    })

    const summary = validateSummary(raw, { mode })
    if (isEmptySummary(summary)) {
      await markSummaryStatus(callId, 'failed')
      logSummary({ callId, mode, status: 'failed', reason: 'empty', ms: Date.now() - started })
      return 'failed'
    }

    await saveCallSummary(callId, summary, { withFacts: FACT_MODES.has(mode) })
    logSummary({
      callId,
      mode,
      status: 'done',
      facts: summary.facts.length,
      topics: summary.topics.length,
      newWords: summary.newWords.length,
      ms: Date.now() - started,
    })
    return 'done'
  } catch (err) {
    await markSummaryStatus(callId, 'failed')
    console.error('[callSummary] failed', err?.message || err)
    logSummary({ callId, mode, status: 'failed', ms: Date.now() - started })
    return 'failed'
  }
}

/**
 * Попутный подбор зависших выжимок — один звонок за проход.
 *
 * Планировщика в деплое нет и заводить его не хочется, а фоновую работу на своём
 * хостинге убивает рестарт контейнера и OOM. Значит это не вспомогательная мера,
 * а единственная защита выжимки от рестарта: без неё потерянная выжимка теряется
 * навсегда. Цена — один дешёвый индексируемый SELECT на звонок.
 */
export async function sweepStaleSummaries() {
  try {
    const staleId = await findStaleSummaryCallId()
    if (!staleId) return 'noop'
    return await summarizeCall({ callId: staleId, trusted: true })
  } catch (err) {
    console.error('[callSummary] sweep failed', err?.message || err)
    return 'failed'
  }
}
