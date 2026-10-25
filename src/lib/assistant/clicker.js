// Нажать кнопку, которую назвала Луна (21.10.2026). Номер — из снимка, по которому
// модель отвечала (screenSnapshot.snapshotWithRefs), а между снимком и нажатием прошли
// секунды: экран мог перерисоваться, кнопка — уйти или стать неактивной. Поэтому
// элемент по номеру жмём, только если он на месте, виден, активен и подписан так же;
// иначе ищем на экране кнопку с той же подписью — ровно одну. Опасную (clickPolicy.js)
// не жмём ни по номеру, ни по подписи.

import { forbiddenButton } from './clickPolicy.js'
import { PRESSABLE_SELECTOR, pressableLabel } from './screenSnapshot.js'
import { normCmd } from './voiceCommands.js'

function hidden(el) {
  const view = el.ownerDocument?.defaultView
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.hidden) return true
    try {
      const cs = view?.getComputedStyle?.(n)
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return true
    } catch {
      return false
    }
  }
  return false
}

function usable(el) {
  if (!el?.isConnected) return false
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false
  if (el.closest('[data-assistant-ignore]')) return false
  return !hidden(el)
}

// Кнопки экрана и окон-порталов, включая открытый Shadow DOM (снимок их тоже читает).
function candidates(root) {
  const doc = root?.ownerDocument
  if (!doc) return []
  const out = new Set()
  const visit = (node) => {
    for (const el of node.querySelectorAll(PRESSABLE_SELECTOR)) out.add(el)
    for (const el of node.querySelectorAll('*')) if (el.shadowRoot) visit(el.shadowRoot)
  }
  for (const scope of [root, ...doc.querySelectorAll('[data-assistant-overlay]')]) visit(scope)
  return [...out]
}

// Подпись для сверки; у кнопки-значка («×») слов нет — тогда сам значок.
const key = (s) => normCmd(s) || String(s ?? '').trim()

/** @returns {'pressed'|'missing'|'ambiguous'|'forbidden'} */
export function pressButton(action, { refs, root } = {}) {
  const want = key(action?.label)
  if (!want) return 'missing'
  const same = (el) => usable(el) && key(pressableLabel(el)) === want
  const byRef = refs?.get(Number(action.target))?.el
  let el = byRef && same(byRef) ? byRef : null
  if (!el) {
    const found = candidates(root).filter(same)
    if (found.length !== 1) return found.length ? 'ambiguous' : 'missing'
    el = found[0]
  }
  if (forbiddenButton(el, pressableLabel(el))) return 'forbidden'
  el.click()
  return 'pressed'
}
