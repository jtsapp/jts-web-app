// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { bindWordBank, applyWordBankAnswers, restampWordBankHtml } from './bindWordBank.js'

function mount() {
  const root = document.createElement('div')
  root.innerHTML = `
    <div class="task" data-task>
      <div class="wbank">
        <button class="wchip" data-w="hit it off">hit it off</button>
        <button class="wchip" data-w="awkward">awkward</button>
      </div>
      <div class="row"><span class="body">
        we <input class="gap gap-lg" data-answer="hit it off"> completely
        those <input class="gap" data-answer="awkward"> pauses
      </span></div>
    </div>`
  document.body.appendChild(root)
  const unbind = bindWordBank(root)
  return { root, unbind }
}

describe('bindWordBank', () => {
  it('places a chip into a gap and returns it when the gap is clicked again', () => {
    const { root, unbind } = mount()
    const [hit, awkward] = root.querySelectorAll('.wchip')
    const [first, second] = root.querySelectorAll('input.gap')

    hit.click()
    expect(hit.classList.contains('on')).toBe(true)
    first.click()
    expect(first.value).toBe('hit it off')
    expect(hit.classList.contains('used')).toBe(true)
    expect(hit.classList.contains('on')).toBe(false)

    awkward.click()
    second.click()
    expect(second.value).toBe('awkward')

    first.click()
    expect(first.value).toBe('')
    expect(hit.classList.contains('used')).toBe(false)

    unbind()
    root.remove()
  })

  it('does not type into the gap — fields stay readonly', () => {
    const { root, unbind } = mount()
    const gap = root.querySelector('input.gap')
    expect(gap.readOnly).toBe(true)
    unbind()
    root.remove()
  })

  it('places a chip from a sibling info block into a gap in this one', () => {
    const card = document.createElement('div')
    card.className = 'lw-card lw-info'
    const bankRoot = document.createElement('div')
    bankRoot.innerHTML = `<div class="wbank"><button class="wchip" data-w="louder">louder</button></div>`
    const gapRoot = document.createElement('div')
    gapRoot.innerHTML = `<div class="row"><span class="body">be <input class="gap" data-answer="louder">.</span></div>`
    card.append(bankRoot, gapRoot)
    document.body.appendChild(card)
    const unbindBank = bindWordBank(bankRoot)
    const unbindGap = bindWordBank(gapRoot)

    bankRoot.querySelector('.wchip').click()
    expect(bankRoot.querySelector('.wchip').classList.contains('on')).toBe(true)
    gapRoot.querySelector('input.gap').click()
    expect(gapRoot.querySelector('input.gap').value).toBe('louder')
    expect(bankRoot.querySelector('.wchip').classList.contains('used')).toBe(true)

    unbindBank()
    unbindGap()
    card.remove()
  })

  it('tags gaps from the grouped live card, not the inner .task', () => {
    const card = document.createElement('div')
    card.className = 'csr-info'
    card.setAttribute('data-qid', 'block-5')
    card.innerHTML = `
      <div class="csr-html">
        <div class="task" data-task>
          <div class="wbank"><button class="wchip" data-w="45">45</button></div>
          <input class="gap">
        </div>
      </div>`
    document.body.appendChild(card)
    const root = card.querySelector('.csr-html')
    const unbind = bindWordBank(root)
    expect(root.querySelector('input.gap').getAttribute('data-question-id')).toBe('block-5-gap-0')
    unbind()
    card.remove()
  })

  it('gives split bank/gap roots the same live ids from the parent card', () => {
    const card = document.createElement('div')
    card.className = 'lw-card lw-info'
    card.setAttribute('data-question-id', 'block-4')
    const bankRoot = document.createElement('div')
    bankRoot.innerHTML = `<div class="wbank"><button class="wchip" data-w="respect">respect</button></div>`
    const gapRoot = document.createElement('div')
    gapRoot.innerHTML = `<input class="gap"><input class="gap">`
    card.append(bankRoot, gapRoot)
    document.body.appendChild(card)
    const unbindBank = bindWordBank(bankRoot)
    const unbindGap = bindWordBank(gapRoot)
    const gaps = [...gapRoot.querySelectorAll('input.gap')]
    expect(gaps.map((g) => g.getAttribute('data-question-id'))).toEqual(['block-4-gap-0', 'block-4-gap-1'])
    const onChange = vi.fn()
    unbindGap()
    const rebindGap = bindWordBank(gapRoot, { onChange })
    bankRoot.querySelector('.wchip').click()
    gaps[1].click()
    expect(onChange).toHaveBeenCalledWith('block-4-gap-1', 'respect')
    unbindBank()
    rebindGap()
    card.remove()
  })

  it('emits onChange with the live gap id when a chip is placed or cleared', () => {
    const card = document.createElement('div')
    card.className = 'lw-card lw-info'
    card.setAttribute('data-question-id', 'block-3')
    card.innerHTML = `
      <div class="wbank"><button class="wchip" data-w="negative">negative</button></div>
      <input class="gap">`
    document.body.appendChild(card)
    const onChange = vi.fn()
    const unbind = bindWordBank(card, { onChange })
    const chip = card.querySelector('.wchip')
    const gap = card.querySelector('input.gap')
    chip.click()
    gap.click()
    expect(onChange).toHaveBeenCalledWith('block-3-gap-0', 'negative')
    gap.click()
    expect(onChange).toHaveBeenCalledWith('block-3-gap-0', '')
    unbind()
    card.remove()
  })

  it('applyWordBankAnswers paints values, used chips, and the live gap', () => {
    const card = document.createElement('div')
    card.className = 'lw-card lw-info'
    card.setAttribute('data-question-id', 'block-3')
    card.innerHTML = `
      <div class="wbank">
        <button class="wchip" data-w="45">45</button>
        <button class="wchip" data-w="negative">negative</button>
      </div>
      <input class="gap">
      <input class="gap">`
    document.body.appendChild(card)
    bindWordBank(card, { prefix: 'block-3' })
    applyWordBankAnswers(card, { 'block-3-gap-1': 'negative' }, 'block-3-gap-1', { sync: true, prefix: 'block-3' })
    const [first, second] = card.querySelectorAll('input.gap')
    expect(first.value).toBe('')
    expect(second.value).toBe('negative')
    expect(second.classList.contains('lw-q--live-here')).toBe(true)
    expect(card.querySelector('[data-w="negative"]').classList.contains('used')).toBe(true)
    expect(card.querySelector('[data-w="45"]').classList.contains('used')).toBe(false)
    card.remove()
  })

  it('does not empty filled gaps when answers omit those keys', () => {
    const { root, unbind } = mount()
    const [hit] = root.querySelectorAll('.wchip')
    const [first] = root.querySelectorAll('input.gap')
    hit.click()
    first.click()
    expect(first.value).toBe('hit it off')
    applyWordBankAnswers(root, {}, null, { sync: true, clearMissing: false })
    expect(first.value).toBe('hit it off')
    unbind()
    root.remove()
  })

  it('does not paint sibling gaps from a bank-only root', () => {
    const card = document.createElement('div')
    card.className = 'lw-card lw-info'
    card.setAttribute('data-question-id', 'block-4')
    const bankRoot = document.createElement('div')
    bankRoot.innerHTML = `<div class="wbank"><button class="wchip" data-w="louder">louder</button></div>`
    const gapRoot = document.createElement('div')
    gapRoot.innerHTML = `<input class="gap">`
    card.append(bankRoot, gapRoot)
    document.body.appendChild(card)
    bindWordBank(bankRoot, { prefix: 'block-4' })
    bindWordBank(gapRoot, { prefix: 'block-4' })
    gapRoot.querySelector('input.gap').value = 'louder'
    applyWordBankAnswers(bankRoot, {}, null, { sync: true, clearMissing: true, prefix: 'block-4' })
    expect(gapRoot.querySelector('input.gap').value).toBe('louder')
    card.remove()
  })

  it('numbers split bank/paragraph gaps across the step, not per card', () => {
    const step = document.createElement('div')
    step.className = 'lw-content'
    const bankCard = document.createElement('div')
    bankCard.className = 'lw-card lw-info'
    bankCard.setAttribute('data-question-id', 'block-4')
    bankCard.innerHTML = `<div class="wbank"><button class="wchip" data-w="negative">negative</button></div>`
    const gapCard = document.createElement('div')
    gapCard.className = 'lw-card lw-info'
    gapCard.setAttribute('data-question-id', 'block-5')
    gapCard.innerHTML = `<input class="gap"><input class="gap"><input class="gap">`
    step.append(bankCard, gapCard)
    document.body.appendChild(step)
    const unbindBank = bindWordBank(bankCard, { prefix: 'step-s3' })
    const unbindGap = bindWordBank(gapCard, { prefix: 'step-s3' })
    const gaps = [...gapCard.querySelectorAll('input.gap')]
    expect(gaps.map((g) => g.getAttribute('data-question-id'))).toEqual([
      'step-s3-gap-0', 'step-s3-gap-1', 'step-s3-gap-2',
    ])
    const onChange = vi.fn()
    unbindGap()
    const rebind = bindWordBank(gapCard, { prefix: 'step-s3', onChange })
    bankCard.querySelector('.wchip').click()
    gaps[2].click()
    expect(onChange).toHaveBeenCalledWith('step-s3-gap-2', 'negative')
    unbindBank()
    rebind()
    step.remove()
  })

  it('restampWordBankHtml keeps filled gaps until the markup is actually wiped', () => {
    const root = document.createElement('div')
    const html = '<input class="gap"><input class="gap">'
    const stamp = { current: '' }
    expect(restampWordBankHtml(root, html, 'step-1', stamp)).toBe(true)
    root.querySelector('input.gap').value = 'kept'
    expect(restampWordBankHtml(root, html, 'step-1', stamp)).toBe(false)
    expect(root.querySelector('input.gap').value).toBe('kept')
    root.innerHTML = ''
    expect(restampWordBankHtml(root, html, 'step-1', stamp)).toBe(true)
    expect(root.querySelectorAll('input.gap')).toHaveLength(2)
    root.remove()
  })

  it('rebind after unbind still accepts chip clicks', () => {
    const { root, unbind } = mount()
    unbind()
    const again = bindWordBank(root)
    const chip = root.querySelector('.wchip')
    chip.click()
    expect(chip.classList.contains('on')).toBe(true)
    again()
    root.remove()
  })

  it('paints an empty string into a gap even when clearMissing is false', () => {
    const { root, unbind } = mount()
    const gap = root.querySelector('input.gap')
    const id = gap.getAttribute('data-question-id')
    applyWordBankAnswers(root, { [id]: 'hit it off' }, null, { sync: true, clearMissing: false })
    expect(gap.value).toBe('hit it off')
    applyWordBankAnswers(root, { [id]: '' }, null, { sync: true, clearMissing: false })
    expect(gap.value).toBe('')
    unbind()
    root.remove()
  })

  it('после checked красит верные/неверные пропуски по data-answer', () => {
    const { root, unbind } = mount()
    const [first, second] = root.querySelectorAll('input.gap')
    const id0 = first.getAttribute('data-question-id')
    const id1 = second.getAttribute('data-question-id')
    applyWordBankAnswers(
      root,
      { [id0]: 'hit it off', [id1]: 'wrong' },
      null,
      { sync: true, clearMissing: false, checked: true },
    )
    expect(first.classList.contains('is-correct')).toBe(true)
    expect(second.classList.contains('is-wrong')).toBe(true)
    applyWordBankAnswers(root, { [id0]: 'hit it off', [id1]: 'wrong' }, null, {
      sync: true,
      clearMissing: false,
      checked: false,
    })
    expect(first.classList.contains('is-correct')).toBe(false)
    expect(second.classList.contains('is-wrong')).toBe(false)
    unbind()
    root.remove()
  })
})
