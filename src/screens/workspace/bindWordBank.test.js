// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { bindWordBank } from './bindWordBank.js'

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
})
