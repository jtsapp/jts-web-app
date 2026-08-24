// B2 Navigate click-to-place: `.wbank .wchip` then `input.gap`.
// Course JS (`bindAll` in the B2 export) is stripped; this is that handler
// for info/practice HTML after extract. Scope is the rendered root so two
// banks on one step do not share a held chip.

const BANK = '.wbank, .wordbank'
const CHIP = '.wchip'
const GAP = 'input.gap, textarea.gap'

function chipWord(chip) {
  return (chip.getAttribute('data-w') || chip.textContent || '').trim()
}

function scopeOf(el, root) {
  return el.closest('.task, [data-task], .opentask') || root
}

function bankOf(scope, root) {
  return scope.querySelector(BANK) || root.querySelector(BANK) || root
}

function sizeGap(el) {
  const sample = el.value || (el.getAttribute('data-answer') || '').split('|')[0] || ''
  const ch = Math.min(22, Math.max(8, sample.length + 2))
  el.style.width = `${ch}ch`
}

export function bindWordBank(root) {
  if (!root) return () => {}

  let held = null

  root.querySelectorAll(GAP).forEach((el) => {
    el.setAttribute('readonly', '')
    el.setAttribute('autocomplete', 'off')
    sizeGap(el)
  })
  root.querySelectorAll(CHIP).forEach((el) => {
    if (el.tagName === 'BUTTON') el.setAttribute('type', 'button')
  })

  const onClick = (e) => {
    const chip = e.target?.closest?.(CHIP)
    if (chip && root.contains(chip)) {
      e.preventDefault()
      e.stopPropagation()
      if (chip.classList.contains('used')) return
      const bank = chip.closest(BANK) || root
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

    const scope = scopeOf(gap, root)
    const bank = bankOf(scope, root)

    if (gap.value) {
      const word = gap.value
      const back = [...bank.querySelectorAll(CHIP)].find(
        (c) => c.classList.contains('used') && chipWord(c) === word,
      )
      if (back) back.classList.remove('used')
      gap.value = ''
      gap.removeAttribute('data-chip')
      sizeGap(gap)
      return
    }

    if (!held) return
    const word = chipWord(held)
    gap.value = word
    gap.setAttribute('data-chip', word)
    held.classList.add('used')
    held.classList.remove('on')
    held = null
    sizeGap(gap)
  }

  root.addEventListener('click', onClick)
  return () => {
    root.removeEventListener('click', onClick)
    held = null
  }
}
