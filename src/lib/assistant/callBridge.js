// Звонок Луне — сторона браузера (16.10.2026). Агент LiveKit слушает ученика и
// говорит голосом Луны, а ответ на каждую реплику пишет браузер — тем же
// /api/assistant/chat, что и окно (экран, контекст ученика, метки действий).
// Почему так, а не мозгом агента, — шапка agent/assistant_call.py.
//
// Протокол (менять парой с agent/assistant_call.py):
//   агент → браузер  luna.ask    {id, text, opening}  ответ «ok» сразу
//   браузер → агент  luna.reply  {id, text} … {id, end: true[, silent: true]}
//   агент → браузер  luna.cancel {id}                 ученик перебил
//   браузер → агент  luna.say    {text}               шаг тура (пусто — замолчать)

import { spellNumbersRu } from './numbersRu.js'
import { phraseLang } from './phraseLang.js'

export const ASK = 'luna.ask'
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
 * Обработчики RPC агента. onAsk({id, text, opening, agent}) зовётся без
 * ожидания: агент ждёт только «принял», сам ответ идёт фразами отдельно.
 * @returns {() => void} снять обработчики (конец звонка)
 */
export function attachCallBridge(room, { onAsk, onCancel }) {
  room.registerRpcMethod(ASK, async (data) => {
    const msg = parse(data.payload)
    if (!msg || !msg.id) return 'bad'
    onAsk({
      id: String(msg.id),
      text: String(msg.text || ''),
      opening: Boolean(msg.opening),
      agent: data.callerIdentity,
    })
    return 'ok'
  })
  room.registerRpcMethod(CANCEL, async (data) => {
    const msg = parse(data.payload)
    if (msg?.id) onCancel(String(msg.id))
    return 'ok'
  })
  return () => {
    room.unregisterRpcMethod(ASK)
    room.unregisterRpcMethod(CANCEL)
  }
}

/**
 * Отправитель фраз одного ответа. Фразы уходят строго по очереди — следующая
 * после подтверждения прежней, иначе агент мог бы сказать их не в том порядке.
 * Агент недоступен — молча: звонок кончается сам, а ронять из-за этого чат незачем.
 * end({ silent: true }) — ответ сняли нарочно («Новый чат»): агент на конец без
 * единой фразы говорит «не получилось», и silent его от этого удерживает.
 */
export function createReplySender(room, agent, id) {
  let chain = Promise.resolve()
  let ended = false
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
    phrase(text) {
      const t = String(text ?? '').trim()
      if (t && !ended) send({ text: t })
    },
    end({ silent = false } = {}) {
      if (ended) return chain
      ended = true
      return send(silent ? { end: true, silent: true } : { end: true })
    },
  }
}

/** Сказать в звонке (шаг тура) или, с пустым текстом, замолчать. */
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

/** Озвучка тура в звонке — тот же интерфейс, что у createTourVoice (tourVoice.js),
 *  только шаг читает агент: второй голос через <audio> поверх звонка звучал бы
 *  одновременно с ним и попадал бы в микрофон. Предзагрузки нет — агент
 *  синтезирует потоком. */
export function createCallTourVoice(say) {
  return {
    say(phrases) {
      const text = (phrases || []).map(callSpeech).filter(Boolean).join(' ')
      if (text) say(text)
    },
    prefetch() {},
    stop() {
      say('')
    },
    dispose() {},
  }
}
