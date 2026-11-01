'use client'

import { useEffect } from 'react'
import { markUnitDone } from './grammar/grammarProgress.js'
import { createPracticeUnitCredit, parseTaskCheckedMessage } from './practiceUnitCredit.js'

/**
 * Засчитывает юниты «Практики», решённые в уроке, что открыт в рамке `frameRef`
 * (см. practiceUnitCredit.js). Верит только своей рамке: postMessage может
 * прислать кто угодно. `enabled = false` — рамка не ученика (преподаватель ведёт
 * урок): его проверки — не работа ученика.
 */
export default function usePracticeUnitCredit(frameRef, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined
    const credit = createPracticeUnitCredit(markUnitDone)
    const onMessage = (event) => {
      const frameWindow = frameRef.current?.contentWindow
      if (!frameWindow || event.source !== frameWindow) return
      const checked = parseTaskCheckedMessage(event.data)
      if (checked) credit.onChecked(checked)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [frameRef, enabled])
}
