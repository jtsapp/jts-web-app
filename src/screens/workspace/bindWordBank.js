// B2 Navigate click-to-place: `.wbank .wchip` then `input.gap`.
// Course JS (`bindAll` in the B2 export) is stripped; this is that handler
// for info/practice HTML after extract.
//
// Convert used to emit the bank and the paragraph as sibling nodes, so extract
// dumped them as two info blocks. Each block bound its own handler with a
// private `held` — the chip lit up (`.on`) in one root, the gap click ran in
// the other with `held === null`. Shared `held` plus a scan of `.wchip.on` in
// the grouped card (`.lw-card` / `.csr-info`) makes split markup work too.
//
// Live lesson: each gap gets a stable `data-question-id` (`{prefix}-gap-{i}`)
// so fills travel on the same step-progress channel as practice answers, and
// the teacher's pointer can land on a single blank rather than the whole card.

import { clearWordBankGrades, gradeWordBankInRoot } from './wordBankCheck.js'

const BANK = '.wbank, .wordbank'
const CHIP = '.wchip'
const GAP = 'input.gap, textarea.gap'
// Chip/gap scope: `.task` keeps a split bank+paragraph as one exercise.
const CARD = '.lw-card, .csr-info, .lw-practice, .csr-practice, .task, [data-task]'
// Live ids live on the grouped card, not the inner `.task` (that node has no data-qid).
const LIVE = '.lw-card, .csr-info, .lw-practice, .csr-practice'
// Gap ids are numbered across the whole step so teacher and student share
// the same keys even when info-grouping splits the bank and the paragraph.
const STEP = '.lw-content, .csr-body'

let held = null

function chipWord(chip) {
  return (chip.getAttribute('data-w') || chip.textContent || '').trim()
}

function cardOf(el) {
  return el?.closest?.(CARD) || el
}

function liveHeld(fromEl) {
  if (held && held.isConnected && held.classList.contains('on') && !held.classList.contains('used')) {
    return held
  }
  const chip = cardOf(fromEl)?.querySelector?.(`${CHIP}.on:not(.used)`)
  held = chip || null
  return held
}

function usedChipFor(gap, word) {
  const scope = cardOf(gap)
  return [...(scope?.querySelectorAll?.(CHIP) || [])].find(
    (c) => c.classList.contains('used') && chipWord(c) === word,
  )
}

function sizeGap(el) {
  const sample = el.value || (el.getAttribute('data-answer') || '').split('|')[0] || ''
  const ch = Math.min(22, Math.max(8, sample.length + 2))
  el.style.width = `${ch}ch`
}

function prepareGaps(root, clickPlace) {
  root.querySelectorAll(GAP).forEach((el) => {
    if (clickPlace) {
      el.setAttribute('readonly', '')
      el.setAttribute('autocomplete', 'off')
      el.style.pointerEvents = 'auto'
      el.style.cursor = 'pointer'
      sizeGap(el)
    } else {
      el.removeAttribute('readonly')
      el.style.cursor = ''
    }
  })
  root.querySelectorAll(CHIP).forEach((el) => {
    if (el.tagName === 'BUTTON') el.setAttribute('type', 'button')
  })
}

/**
 * Упражнение «расставь слова из банка» — а не «впиши сам».
 *
 * Банк в своей карточке — вопросов нет. Сложность в том, что курс отдаёт банк и
 * абзац с пропусками двумя блоками, и группировка их не всегда склеивает: банк
 * оказывается отдельной карточкой, а пропуски — соседней.
 *
 * Раньше поэтому искали банк по всему ШАГУ, и любой банк переводил в режим
 * расстановки все поля шага. Если в шаге стояло законченное упражнение с банком,
 * то в соседнем («впиши одно слово: much, many, few…») поля становились readonly,
 * а чипов для них не было вовсе — вписать было нечем. Отсюда «упр не работает,
 * невозможно вписать».
 *
 * Признак «банк наш» — у его карточки НЕТ своих пропусков. Есть свои — это
 * законченное соседнее упражнение, и его чипы к нашим полям отношения не имеют.
 */
function cardHasWordBank(root) {
  const from = root.querySelector(GAP) || root.querySelector(BANK) || root
  const card = from?.closest?.(LIVE) || from?.closest?.(CARD) || root
  if (card?.querySelector?.(BANK)) return true

  const step = from?.closest?.(STEP)
  if (!step) return false
  return [...step.querySelectorAll(BANK)].some((bank) => {
    const bankCard = bank.closest(LIVE) || bank.closest(CARD) || bank
    return bankCard !== card && !bankCard.querySelector(GAP)
  })
}

function liveCard(el) {
  return el?.closest?.(LIVE) || null
}

function liveScope(root) {
  const from = root.querySelector(GAP) || root
  const live = liveCard(from)
  if (live) return live
  const card = cardOf(from)
  if (card?.matches?.(GAP)) return root
  return card || root
}

function stepScope(root) {
  const from = root.querySelector(GAP) || root
  const scoped = from?.closest?.(STEP) || liveScope(root)
  if (scoped?.matches?.(GAP)) return root
  return scoped || root
}

function cardPrefix(root, prefix) {
  if (prefix) return prefix
  const live = liveCard(root.querySelector(GAP) || root)
  return live?.getAttribute?.('data-question-id')
    || live?.getAttribute?.('data-qid')
    || 'wbank'
}

/** Stamp every gap in the step (or live card, in tests) with a live-trackable id. */
export function tagWordBankGaps(root, prefix) {
  const card = stepScope(root)
  const p = cardPrefix(root, prefix)
  const gaps = [...card.querySelectorAll(GAP)]
  gaps.forEach((gap, i) => {
    const id = `${p}-gap-${i}`
    gap.setAttribute('data-question-id', id)
    gap.setAttribute('data-qid', id)
  })
  return gaps
}

function paintChips(card) {
  const filled = [...card.querySelectorAll(GAP)].map((g) => g.value).filter(Boolean)
  card.querySelectorAll(CHIP).forEach((chip) => {
    const at = filled.indexOf(chipWord(chip))
    const used = at >= 0
    if (used) filled.splice(at, 1)
    chip.classList.toggle('used', used)
    if (used) chip.classList.remove('on')
  })
}

function setGapWord(gap, word) {
  const next = word == null ? '' : String(word)
  if (gap.value !== next) {
    gap.value = next
    if (next) gap.setAttribute('data-chip', next)
    else gap.removeAttribute('data-chip')
    sizeGap(gap)
  }
}

/**
 * Put `html` into `root` only when the markup/prefix changed, or when a
 * parent re-render wiped the gaps (React `dangerouslySetInnerHTML` and
 * Angular `[innerHTML]` both replace the subtree and drop input values).
 * Returns true if the DOM was replaced and must be rebound.
 */
export function restampWordBankHtml(root, html, prefix, stampRef) {
  if (!root) return false
  const stamp = `${prefix ?? ''}::${html ?? ''}`
  const expectGaps = typeof html === 'string' && /\bclass=["'][^"']*\bgap\b/.test(html)
  const wiped = expectGaps && !root.querySelector(GAP)
  const empty = !!html && !root.firstChild
  if (stampRef.current === stamp && !wiped && !empty) return false
  root.innerHTML = html || ''
  stampRef.current = stamp
  return true
}

/**
 * Paint gap values from the live answers map and mark the live gap.
 * `sync` false — only the live outline (teacher sandbox with no student yet).
 * `clearMissing` false — do not empty a gap whose key is not in `answers`
 * (a stale `{}` snapshot must not wipe chips the student just placed).
 *
 * Values are written only on gaps inside `root`. Tagging still uses the
 * grouped live card so split bank/paragraph keep one id series; a bank-only
 * info block must not paint (and clear) the paragraph's blanks.
 */
export function applyWordBankAnswers(root, answers = {}, liveGapId = null, { sync = true, prefix, clearMissing = true, checked = false } = {}) {
  if (!root) return
  tagWordBankGaps(root, prefix)
  const card = liveScope(root)
  const live = liveGapId == null ? '' : String(liveGapId)
  root.querySelectorAll(GAP).forEach((gap) => {
    const id = gap.getAttribute('data-question-id') || gap.getAttribute('data-qid')
    if (sync) {
      const raw = id && answers ? answers[id] : undefined
      if (raw !== undefined) setGapWord(gap, raw == null ? '' : raw)
      else if (clearMissing) setGapWord(gap, '')
    }
    const on = live !== '' && id === live
    gap.classList.toggle('lw-q--live-here', on)
    gap.classList.toggle('is-live-here', on)
  })
  paintChips(card)
  if (checked) gradeWordBankInRoot(root)
  else clearWordBankGrades(root)
}

export function bindWordBank(root, options = {}) {
  if (!root) return () => {}

  const opts = options
  const clickPlace = cardHasWordBank(root)
  prepareGaps(root, clickPlace)
  tagWordBankGaps(root, opts.prefix)

  const onClick = (e) => {
    const chip = e.target?.closest?.(CHIP)
    if (chip && root.contains(chip)) {
      e.preventDefault()
      e.stopPropagation()
      if (opts.readOnly) return
      if (chip.classList.contains('used')) return
      const bank = chip.closest(BANK) || cardOf(chip)
      bank.querySelectorAll(CHIP).forEach((c) => {
        if (c !== chip) c.classList.remove('on')
      })
      chip.classList.toggle('on')
      held = chip.classList.contains('on') ? chip : null
      return
    }

    const gap = e.target?.closest?.(GAP)
    if (!gap || !root.contains(gap)) return
    e.preventDefault()
    e.stopPropagation()

    const id = gap.getAttribute('data-question-id') || gap.getAttribute('data-qid')
    opts.onFocus?.(id)
    if (!clickPlace) return

    try {
      gap.focus({ preventScroll: true })
    } catch {
      gap.focus()
    }

    if (opts.readOnly) return

    if (gap.value) {
      const word = gap.value
      const back = usedChipFor(gap, word)
      if (back) back.classList.remove('used')
      setGapWord(gap, '')
      opts.onChange?.(id, '')
      return
    }

    const pick = liveHeld(gap)
    if (!pick) return
    const word = chipWord(pick)
    setGapWord(gap, word)
    pick.classList.add('used')
    pick.classList.remove('on')
    held = null
    opts.onChange?.(id, word)
  }

  const onInput = (e) => {
    if (clickPlace) return
    const gap = e.target?.closest?.(GAP)
    if (!gap || !root.contains(gap)) return
    const id = gap.getAttribute('data-question-id') || gap.getAttribute('data-qid')
    opts.onChange?.(id, gap.value)
  }

  // capture: tap-translate on the same root must not eat the gap click first
  root.addEventListener('click', onClick, true)
  root.addEventListener('input', onInput, true)
  return () => {
    root.removeEventListener('click', onClick, true)
    root.removeEventListener('input', onInput, true)
    if (held && root.contains(held)) held = null
  }
}
