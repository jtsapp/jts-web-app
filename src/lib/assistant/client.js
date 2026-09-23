// Клиент помощника: один вопрос → потоковый ответ кусками через onDelta.

export class AssistantError extends Error {
  /** @param {'auth'|'rate'|'unavailable'|'network'} kind */
  constructor(kind, { retryAfterSec } = {}) {
    super(kind)
    this.kind = kind
    this.retryAfterSec = retryAfterSec ?? null
  }
}

/**
 * @param {{ token: string, messages: {role: string, content: string}[],
 *           screen: {id: string|null, text: string}, lang: string,
 *           onDelta: (text: string) => void, signal?: AbortSignal }} args
 * @returns {Promise<string>} весь ответ
 */
export async function askAssistant({ token, messages, screen, lang, onDelta, signal }) {
  let res
  try {
    res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages, screen, lang }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new AssistantError('network')
  }

  if (res.status === 401) throw new AssistantError('auth')
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}))
    throw new AssistantError('rate', { retryAfterSec: body.retryAfterSec })
  }
  if (!res.ok || !res.body) throw new AssistantError('unavailable')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      if (chunk) {
        full += chunk
        onDelta?.(chunk)
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new AssistantError('network')
  }
  const tail = decoder.decode()
  if (tail) {
    full += tail
    onDelta?.(tail)
  }
  return full
}
