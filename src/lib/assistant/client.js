// Клиент помощника: один вопрос → потоковый ответ кусками через onDelta.

import { createServiceTailFilter } from './actions.js'

export class AssistantError extends Error {
  /** @param {'auth'|'rate'|'cooldown'|'unavailable'|'network'} kind */
  constructor(kind, { retryAfterSec } = {}) {
    super(kind)
    this.kind = kind
    this.retryAfterSec = retryAfterSec ?? null
  }
}

/**
 * @param {{ token: string, messages: {role: string, content: string}[],
 *           screen: {id: string|null, text: string}, lang: string,
 *           errors?: {at?: number, message?: string, source?: string, url?: string, stack?: string}[],
 *           pageUrl?: string, userAgent?: string, bugReported?: boolean, voice?: boolean, call?: string,
 *           onDelta: (text: string) => void, signal?: AbortSignal,
 *           onResponse?: (r: {serverTiming: string}) => void }} args
 *   onResponse — ответ пошёл: заголовок Server-Timing роута (замеры звонка Луне)
 * @returns {Promise<{ text: string, offtopic: boolean, reported: boolean,
 *                     action: {kind: 'open'|'tour'|'click', target: string, now: boolean, label?: string}|null }>}
 *   весь видимый ответ; offtopic — сервер ответил стандартным отказом;
 *   reported — поломку записали в БД; action — Луна предлагает открыть раздел,
 *   провести тур или нажать кнопку экрана (actions.js; у click — подпись кнопки).
 *   Оба — хвост стрима, ученику не показывается.
 */
export async function askAssistant({ token, messages, screen, lang, errors, pageUrl, userAgent, bugReported, voice, call, onDelta, onResponse, signal }) {
  let res
  try {
    res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages, screen, lang, errors, pageUrl, userAgent,
        bugReported: Boolean(bugReported),
        // голосовой вопрос — ответ прочитают вслух, он должен быть короче (prompt.js, VOICE_MARK)
        voice: Boolean(voice),
        // вопрос из звонка Луне — комната звонка: роут даст ему квоту звонка (callUsage.js)
        ...(call ? { call } : {}),
      }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new AssistantError('network')
  }

  if (res.status === 401) throw new AssistantError('auth')
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}))
    throw new AssistantError(body.error === 'offtopic_cooldown' ? 'cooldown' : 'rate', {
      retryAfterSec: body.retryAfterSec,
    })
  }
  if (!res.ok || !res.body) throw new AssistantError('unavailable')
  onResponse?.({ serverTiming: res.headers.get('server-timing') || '' })
  const offtopic = res.headers.get('x-assistant-offtopic') === '1'
  const reportedHeader = res.headers.get('x-assistant-reported') === '1'
  const flag = createServiceTailFilter()

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  const emit = (chunk) => {
    const out = flag.push(chunk)
    if (out) {
      full += out
      onDelta?.(out)
    }
  }
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      if (chunk) emit(chunk)
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new AssistantError('network')
  }
  const rest = decoder.decode()
  if (rest) emit(rest)
  const tail = flag.flush()
  if (tail) {
    full += tail
    onDelta?.(tail)
  }
  return { text: full, offtopic, reported: reportedHeader || flag.reported, action: offtopic ? null : flag.action }
}
