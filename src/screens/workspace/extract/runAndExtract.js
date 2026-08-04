// Renders a lesson's HTML in a hidden, sandboxed iframe and extracts the
// workspace JSON once rendering has settled. Ported from the web-admin runner
// (floor + quiet-extend + cap settle strategy).
import { extractLiveLesson } from './extractLiveLesson.js'

// Never extract before this floor — lessons build content from inline JS, some
// deferred via setTimeout; extracting during the quiet gap before a deferred
// build fires would miss it.
const MIN_SETTLE_MS = 1200
// Past the floor, extract once the DOM has been quiet this long, so a heavy
// lesson that keeps building runs to completion instead of being cut off.
const QUIET_MS = 350
// Hard cap: a lesson with an always-running timer never goes quiet, so extract
// whatever rendered rather than waiting forever.
const MAX_SETTLE_MS = 4000
// Overall budget: iframe load + settle + extraction.
const OVERALL_TIMEOUT_MS = 8000

export function runAndExtract(htmlText) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.width = '800px'
    iframe.style.height = '600px'
    iframe.style.left = '-99999px'
    iframe.style.top = '0'
    iframe.style.visibility = 'hidden'
    iframe.sandbox.add('allow-scripts', 'allow-same-origin')

    let settled = false
    let floorReached = false
    let domQuiet = false
    let quietTimer
    let floorTimer
    let maxSettleTimer
    let observer

    const cleanup = () => {
      clearTimeout(quietTimer)
      clearTimeout(floorTimer)
      clearTimeout(maxSettleTimer)
      if (observer) observer.disconnect()
      clearTimeout(overallTimer)
      iframe.remove()
    }

    const finish = (result) => {
      if (settled) return
      settled = true
      cleanup()
      if (result instanceof Error) reject(result)
      else resolve(result)
    }

    const overallTimer = setTimeout(() => finish(new Error('Не удалось обработать HTML урока')), OVERALL_TIMEOUT_MS)

    const extractNow = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc) throw new Error('Пустой документ урока')
        finish(extractLiveLesson(doc))
      } catch {
        finish(new Error('Не удалось извлечь структуру урока'))
      }
    }

    iframe.addEventListener('load', () => {
      const doc = iframe.contentDocument
      if (!doc) {
        finish(new Error('Пустой документ урока'))
        return
      }

      const onQuiet = () => {
        domQuiet = true
        if (floorReached) extractNow()
      }
      const armQuietTimer = () => {
        domQuiet = false
        clearTimeout(quietTimer)
        quietTimer = setTimeout(onQuiet, QUIET_MS)
      }

      observer = new MutationObserver(armQuietTimer)
      observer.observe(doc.body, { childList: true, subtree: true, attributes: true, characterData: true })

      floorTimer = setTimeout(() => {
        floorReached = true
        // If the DOM already went quiet before the floor, extract now; otherwise
        // the pending quiet timer fires once mutations actually stop.
        if (domQuiet) extractNow()
      }, MIN_SETTLE_MS)
      maxSettleTimer = setTimeout(extractNow, MAX_SETTLE_MS)
      armQuietTimer()
    })

    document.body.appendChild(iframe)
    iframe.srcdoc = htmlText
  })
}
