// @vitest-environment jsdom
// Мир Сказок — оверлей в body, вне обёртки экрана. Снимок помощника по сайту читает такие окна, только если корень
// помечен data-assistant-overlay; без пометки помощник на вопрос из сказки описывал Практику под ней. Движок здесь
// подменён разметкой из абзаца и кнопки выхода — проверяем саму обёртку.
import { describe, it, expect, vi } from 'vitest'

vi.mock('./engine.js', () => ({
  createTaleWorld: () => ({ TALES: [{ id: 'snow' }], loadFor: () => false, chooseTale: () => {} }),
}))
vi.mock('./markup.js', () => ({ MARKUP: '<p>Choose your hero</p><button id="btnLeave">Library</button>' }))
vi.mock('./styles.js', () => ({ CSS_BASE: '', CSS_SHELL: '' }))
vi.mock('../../api.js', () => ({ saveStudentVocab: vi.fn() }))

import { openTaleWorld } from './taleWorld.js'
import { snapshotScreen } from '../../lib/assistant/screenSnapshot.js'

describe('мир Сказок в снимке помощника', () => {
  it('открытый оверлей читается первым и подписан, закрытый — пропадает из снимка', () => {
    const screenRoot = document.createElement('div')
    screenRoot.textContent = 'Практика'
    document.body.appendChild(screenRoot)

    let exited = false
    openTaleWorld('snow', { onExit: () => (exited = true) })
    expect(document.getElementById('taleworld').getAttribute('data-assistant-overlay')).toBe('мир сказок')

    const snap = snapshotScreen(screenRoot)
    expect(snap).toContain('[поверх экрана открыто: мир сказок]')
    expect(snap).toContain('Choose your hero')
    expect(snap.indexOf('Choose your hero')).toBeLessThan(snap.indexOf('Практика'))

    // Выход «в библиотеку» прячет оверлей — помощник снова видит только экран.
    document.getElementById('btnLeave').click()
    expect(exited).toBe(true)
    const after = snapshotScreen(screenRoot)
    expect(after).not.toContain('мир сказок')
    expect(after).toBe('Практика')
  })
})
