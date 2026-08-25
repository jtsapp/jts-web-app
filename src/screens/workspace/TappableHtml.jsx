import { useEffect, useMemo, useRef } from 'react'
import { wordFromTap } from '../../lib/wordTranslate.js'
import { wrapTapWords } from './wrapTapWords.js'
import { bindWordBank } from './bindWordBank.js'

// HTML урока с тап-переводом. Слова оборачиваются как в info-блоке живого
// урока; в переводчик уходит одно тапнутое слово, не весь блок.
export default function TappableHtml({ html, onWord, className, as: As = 'div' }) {
  const tappable = useMemo(() => (onWord ? wrapTapWords(html) : html), [html, onWord])
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    return bindWordBank(root)
  }, [tappable])

  useEffect(() => {
    const root = ref.current
    if (!root || !onWord) return undefined
    const onClick = (e) => {
      if (e.target?.tagName !== 'SPAN' || !e.target.classList.contains('lw-tap-w')) return
      e.stopPropagation()
      onWord(wordFromTap(e.target), e.target)
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [tappable, onWord])

  if (!html) return null
  return <As className={className} ref={ref} dangerouslySetInnerHTML={{ __html: tappable }} />
}
