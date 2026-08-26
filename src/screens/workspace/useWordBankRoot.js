import { useLayoutEffect, useRef } from 'react'
import { applyWordBankAnswers, bindWordBank, restampWordBankHtml } from './bindWordBank.js'

/**
 * Own the word-bank DOM: React must not write innerHTML on every parent
 * render (polls / chat), or uncontrolled gaps go blank while `answers`
 * still holds the fills. Stamp markup only when it changed or was wiped,
 * then paint from `liveRef.current.answers`.
 *
 * Bind lives in the same layout effect as the stamp, with cleanup that
 * nulls the unbind handle: React Strict Mode runs that cleanup and then
 * the effect again — if we skipped rebinding (stamp already matched),
 * chips and gaps stopped receiving clicks.
 */
export function useWordBankRoot(rootRef, html, prefix, liveRef) {
  const stampRef = useRef('')
  const unbindRef = useRef(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const replaced = restampWordBankHtml(root, html, prefix, stampRef)
    if (replaced || !unbindRef.current) {
      unbindRef.current?.()
      unbindRef.current = bindWordBank(root, {
        prefix,
        get readOnly() { return !!liveRef.current.readOnly },
        onChange: (id, value) => { if (id) liveRef.current.onAnswer?.(id, value) },
      })
    }
    applyWordBankAnswers(root, liveRef.current.answers, liveRef.current.liveQuestionId, {
      sync: true,
      prefix,
      clearMissing: false,
      checked: !!liveRef.current.checked,
    })
    return () => {
      unbindRef.current?.()
      unbindRef.current = null
    }
  }, [html, prefix, liveRef])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    applyWordBankAnswers(root, liveRef.current.answers, liveRef.current.liveQuestionId, {
      sync: true,
      prefix,
      clearMissing: false,
      checked: !!liveRef.current.checked,
    })
  })
}
