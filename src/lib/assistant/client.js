// Клиент помощника: один вопрос → потоковый ответ кусками через onDelta.

import { createReportedFlagFilter } from './report.js'

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
 *           pageUrl?: string, userAgent?: string, bugReported?: boolean,
 *           onDelta: (text: string) => void, signal?: AbortSignal }} args
 * @returns {Promise<{ text: string, offtopic: boolean, reported: boolean }>}
 *   весь видимый ответ; offtopic — сервер ответил стандартным отказом;
 *   reported — поломку записали в БД (хвост стрима, ученику не показывается)
 */
export async function askAssistant({ token, messages, screen, lang, errors, pageUrl, userAgent, bugReported, onDelta, signal }) {
  let res
  try {
    res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages, screen, lang, errors, pageUrl, userAgent, bugReported: Boolean(bugReported) }),
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
  const offtopic = res.headers.get('x-assistant-offtopic') === '1'
  const reportedHeader = res.headers.get('x-assistant-reported') === '1'
  const flag = createReportedFlagFilter()

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
  return { text: full, offtopic, reported: reportedHeader || flag.reported }
}
