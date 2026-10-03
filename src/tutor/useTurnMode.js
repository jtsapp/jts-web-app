'use client'

// Переключатель «Рация | Свободно» прямо в звонке.
//
// Раньше режим жил только в «Управлении тьютором» и фиксировался на старте
// звонка. Шумное место обнаруживается уже в разговоре, поэтому выбор вынесен на
// экран звонка, а агент меняет режим на лету — RPC set_turn_mode
// (`_set_turn_mode` в agent/agent.py отвечает самим режимом).
//
// Выбор пишется в ту же настройку, что и тумблер в «Управлении», — сразу, ДО
// ответа агента: даже если этот воркер переключаться не умеет (он катится
// отдельно от веба, `lk agent deploy`), следующий звонок начнётся в выбранном
// режиме. Ученику тогда честно пишем «со следующего звонка», а кнопку не
// перекрашиваем: агент продолжает жить в старом режиме, и экран не должен
// обещать другое.

import { useCallback, useEffect, useRef, useState } from 'react'
import { setPushToTalk } from '../lib/pushToTalk.js'

const NOTICE_MS = 4000

/** Ответ агента подтверждает переключение, только если вернул ровно этот режим. */
export function turnModeAccepted(requested, response) {
  return typeof response === 'string' && response === requested
}

export function useTurnMode({ initialPtt, room, agentIdentity }) {
  const [ptt, setPtt] = useState(Boolean(initialPtt))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const busyRef = useRef(false)
  const noticeTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const showLater = useCallback(() => {
    setNotice('later')
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), NOTICE_MS)
  }, [])

  const choose = useCallback(
    async (nextPtt) => {
      if (busyRef.current || nextPtt === ptt) return
      setPushToTalk(nextPtt)
      const lp = room?.localParticipant
      if (!lp || !agentIdentity) {
        showLater()
        return
      }
      busyRef.current = true
      setBusy(true)
      const mode = nextPtt ? 'ptt' : 'auto'
      let ok = false
      try {
        const res = await lp.performRpc({
          destinationIdentity: agentIdentity,
          method: 'set_turn_mode',
          payload: mode,
          responseTimeout: 4000,
        })
        ok = turnModeAccepted(mode, res)
      } catch {
        // UNSUPPORTED_METHOD — старый воркер или рубильник PUSH_TO_TALK=off;
        // таймаут — плохая сеть. Во всех случаях агент остался в прежнем режиме.
        ok = false
      }
      if (ok) {
        // Рация держит микрофон включённым весь звонок (лишнее отрезает агент),
        // а в «Свободно» ученик мог его выключить — тогда кнопка рации
        // говорила бы в заглушённый трек.
        if (nextPtt) void lp.setMicrophoneEnabled(true)
        setPtt(nextPtt)
        setNotice('')
      } else {
        showLater()
      }
      busyRef.current = false
      setBusy(false)
    },
    [ptt, room, agentIdentity, showLater]
  )

  return { ptt, busy, notice, choose }
}
