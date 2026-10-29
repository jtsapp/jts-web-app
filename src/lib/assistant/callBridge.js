// Звонок Луне — сторона браузера (16.10.2026). Агент LiveKit слушает ученика и
// говорит голосом Луны, а ответ на каждую реплику пишет браузер — тем же
// /api/assistant/chat, что и окно (экран, контекст ученика, метки действий).
// Почему так, а не мозгом агента, — шапка agent/assistant_call.py.
//
// Протокол (менять парой с agent/assistant_call.py):
//   агент → браузер  luna.ask    {id, text, opening[, pending]}  ответ «ok» сразу
//   агент → браузер  luna.commit {id}                 черновик стал ходом
//   браузер → агент  luna.reply  {id, text[, t]} … {id, end: true[, silent: true]}
//   агент → браузер  luna.cancel {id[, drop]}         ученик перебил; drop — ход не начался
//   браузер → агент  luna.say    {text}               сказать текст (пусто — замолчать)
//
// pending — упреждающая генерация (16.10.2026, «скорость как в Speaking
// Buddy»): агент спрашивает, ещё не решив, что ученик договорил. Ответ надо
// начинать готовить сразу — ради этого всё и затевалось, — но в окне такой ход
// не показывают до luna.commit: ученик мог продолжить фразу, и тогда агент
// пришлёт cancel с drop, а в переписке не должно остаться ни обрывка вопроса,
// ни ответа на него.

import { spellNumbersRu } from './numbersRu.js'
import { phraseLang } from './phraseLang.js'

export const ASK = 'luna.ask'
export const COMMIT = 'luna.commit'
export const REPLY = 'luna.reply'
export const CANCEL = 'luna.cancel'
export const SAY = 'luna.say'

const RPC_TIMEOUT_MS = 5000

function parse(payload) {
  try {
    const msg = JSON.parse(payload || '')
    return msg && typeof msg === 'object' ? msg : null
  } catch {
    return null
  }
}

/** Фраза для голоса Луны. Gemini у агента говорит с en-US, как и в окне
 *  (/api/assistant/speak): русские цифры он читает по-английски («zero
 *  percent») — поэтому числа русской фразы уходят словами. Текст на экране
 *  остаётся с цифрами. */
export function callSpeech(phrase) {
  const text = String(phrase ?? '').trim()
  return phraseLang(text) === 'ru' ? spellNumbersRu(text) : text
}

/**
 * Обработчики RPC агента. onAsk({id, text, opening, pending, agent}) зовётся без
 * ожидания: агент ждёт только «принял», сам ответ идёт фразами отдельно.
 * onCommit(id) — черновик (pending) стал ходом; onCancel(id, {drop}).
 * @returns {() => void} снять обработчики (конец звонка)
 */
export function attachCallBridge(room, { onAsk, onCancel, onCommit }) {
  room.registerRpcMethod(ASK, async (data) => {
    const msg = parse(data.payload)
    if (!msg || !msg.id) return 'bad'
    onAsk({
      id: String(msg.id),
      text: String(msg.text || ''),
      opening: Boolean(msg.opening),
      pending: Boolean(msg.pending),
      agent: data.callerIdentity,
    })
    return 'ok'
  })
  room.registerRpcMethod(COMMIT, async (data) => {
    const msg = parse(data.payload)
    if (msg?.id) onCommit?.(String(msg.id))
    return 'ok'
  })
  room.registerRpcMethod(CANCEL, async (data) => {
    const msg = parse(data.payload)
    if (msg?.id) onCancel(String(msg.id), { drop: Boolean(msg.drop) })
    return 'ok'
  })
  return () => {
    room.unregisterRpcMethod(ASK)
    room.unregisterRpcMethod(COMMIT)
    room.unregisterRpcMethod(CANCEL)
  }
}

/**
 * Отправитель фраз одного ответа. Фразы уходят строго по очереди — следующая
 * после подтверждения прежней, иначе агент мог бы сказать их не в том порядке.
 * Агент недоступен — молча: звонок кончается сам, а ронять из-за этого чат незачем.
 * end({ silent: true }) — ответ сняли нарочно («Новый чат»): агент на конец без
 * единой фразы говорит «не получилось», и silent его от этого удерживает.
 * timing(t) — замеры браузера: уходят полем `t` с первой фразой, и агент пишет
 * их в строку LATENCY luna (по ней и видно, где в звонке теряется время).
 */
export function createReplySender(room, agent, id) {
  let chain = Promise.resolve()
  let ended = false
  let timing = null
  let sentText = false
  const send = (body) => {
    chain = chain
      .then(() =>
        room.localParticipant.performRpc({
          destinationIdentity: agent,
          method: REPLY,
          payload: JSON.stringify({ id, ...body }),
          responseTimeout: RPC_TIMEOUT_MS,
        }),
      )
      .catch(() => {})
    return chain
  }
  return {
    timing(t) {
      if (!sentText && t && typeof t === 'object') timing = t
    },
    phrase(text) {
      const t = String(text ?? '').trim()
      if (!t || ended) return
      send(!sentText && timing ? { text: t, t: timing } : { text: t })
      sentText = true
    },
    end({ silent = false } = {}) {
      if (ended) return chain
      ended = true
      return send(silent ? { end: true, silent: true } : { end: true })
    },
  }
}

/** Сказать в звонке или, с пустым текстом, замолчать (кнопка «Перебить», «Новый чат»).
 *  С текстом её звал прежний тур «от Луны» — шаги вслух (убран 28.10.2026); агент текст
 *  по-прежнему произносит. */
export function sayInCall(room, agent, text) {
  if (!room || !agent) return Promise.resolve()
  return room.localParticipant
    .performRpc({
      destinationIdentity: agent,
      method: SAY,
      payload: JSON.stringify({ text: String(text ?? '') }),
      responseTimeout: RPC_TIMEOUT_MS,
    })
    .catch(() => {})
}
