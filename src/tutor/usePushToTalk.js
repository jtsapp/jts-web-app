'use client'

// Рация в звонке. Пока ученик держит кнопку микрофона (или пробел на десктопе),
// эфир его; отпустил — ход закрывается СРАЗУ, а не после окна тишины.
//
// Решает про ход агент, не клиент: сюда уходят три RPC — start_turn, end_turn и
// cancel_turn (имена как в рецепте push-to-talk у LiveKit). Микрофон при этом
// остаётся включённым весь звонок, и это намеренно: глушить трек на каждое
// нажатие — значит резать первый слог на разжатии и хвост фразы на отпускании,
// потому что медиа и данные идут разными путями с разной задержкой. Всё, что
// прилетело между ходами, агент выбрасывает сам (input.set_audio_enabled).
//
// Агент катится ОТДЕЛЬНО от веба (`lk agent deploy`), поэтому воркер, который
// про рацию ещё не знает, ответит UNSUPPORTED_METHOD. Тогда переходим на
// запасной путь — мьют трека между нажатиями: рация как способ говорить
// останется, но ход будет закрывать всё тот же VAD по тишине, то есть
// ускорения не будет. Ученику про это не сообщаем, разница только в скорости.

import { useCallback, useEffect, useRef, useState } from 'react'
import { RpcError } from 'livekit-client'
import { holdVerdict, isPushToTalkKey } from './pushToTalk.js'

// Коды, после которых повторять бессмысленно: адресат такого метода не умеет.
// Таймауты и обрывы сюда НЕ входят — они разовые, и из-за одного плохого
// пакета терять быстрый режим на весь звонок не надо.
const DEAD_CODES = new Set([
  RpcError.ErrorCode.UNSUPPORTED_METHOD,
  RpcError.ErrorCode.UNSUPPORTED_SERVER,
  RpcError.ErrorCode.UNSUPPORTED_VERSION,
])

export function usePushToTalk({ enabled, room, agentIdentity }) {
  const [holding, setHolding] = useState(false)
  // Держим в ref, а не только в стейте: press/release зовутся из обработчиков
  // окна, и им нужно текущее значение, а не то, что было на рендере.
  const holdingRef = useRef(false)
  const startedAtRef = useRef(0)
  // Запасной путь включён — агент про рацию не знает, глушим трек сами.
  const mutedModeRef = useRef(false)

  const setMic = useCallback(
    (on) => {
      const lp = room?.localParticipant
      if (lp) void lp.setMicrophoneEnabled(on)
    },
    [room]
  )

  const rpc = useCallback(
    async (method) => {
      const lp = room?.localParticipant
      if (!lp || !agentIdentity) return false
      try {
        await lp.performRpc({
          destinationIdentity: agentIdentity,
          method,
          payload: '',
          responseTimeout: 4000,
        })
        return true
      } catch (err) {
        if (DEAD_CODES.has(err?.code)) {
          mutedModeRef.current = true
          console.warn('[ptt] агент не знает про рацию — переходим на мьют трека', err?.message)
        }
        return false
      }
    },
    [room, agentIdentity]
  )

  const press = useCallback(() => {
    if (!enabled || holdingRef.current) return
    holdingRef.current = true
    startedAtRef.current = Date.now()
    setHolding(true)
    if (mutedModeRef.current) {
      setMic(true)
      return
    }
    void rpc('start_turn').then(() => {
      // Провалились в запасной путь прямо на этом нажатии — микрофон и так
      // горячий, доводить нечего.
    })
  }, [enabled, rpc, setMic])

  const release = useCallback(() => {
    if (!holdingRef.current) return
    holdingRef.current = false
    setHolding(false)
    const held = Date.now() - startedAtRef.current
    if (mutedModeRef.current) {
      setMic(false)
      return
    }
    void rpc(holdVerdict(held)).then(() => {
      // Сюда попадаем и когда RPC только что признал агента старым: тогда
      // закрываем эфир мьютом, иначе микрофон остался бы открытым навсегда.
      if (mutedModeRef.current) setMic(false)
    })
  }, [rpc, setMic])

  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (e) => {
      if (!isPushToTalkKey(e)) return
      // Без этого пробел скроллит страницу и заодно «кликает» сфокусированную
      // кнопку — то есть одно нажатие срабатывало бы дважды.
      e.preventDefault()
      press()
    }
    const onKeyUp = (e) => {
      if (!isPushToTalkKey(e)) return
      e.preventDefault()
      release()
    }
    // Ушли со вкладки или из окна с зажатой клавишей — keyup не придёт уже
    // никогда, и рация залипла бы открытой до конца звонка.
    const bail = () => release()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', bail)
    document.addEventListener('visibilitychange', bail)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', bail)
      document.removeEventListener('visibilitychange', bail)
    }
  }, [enabled, press, release])

  // Обработчики для кнопки. Именно pointer-, а не touch-/mouse-: одна пара на
  // палец и мышь. setPointerCapture нужен, чтобы отпускание поймалось, даже
  // если палец съехал с кнопки, — на телефоне это обычное дело.
  const pointerHandlers = enabled
    ? {
        onPointerDown: (e) => {
          // Гасит фокус, выделение подписи и синтетический click.
          e.preventDefault()
          e.currentTarget.setPointerCapture?.(e.pointerId)
          press()
        },
        onPointerUp: release,
        onPointerCancel: release,
        onLostPointerCapture: release,
        // Долгий тап на телефоне иначе открывает меню «копировать» поверх
        // кнопки — ровно посреди реплики.
        onContextMenu: (e) => e.preventDefault(),
      }
    : null

  return { holding, pointerHandlers }
}
