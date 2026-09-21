// @vitest-environment jsdom
// Общее устройство (класс, семья): после «Выйти» следующий ученик не должен
// получить чужой прогресс. clearLocalPractice этого не покрывает — он чистит
// только модули практики, а прогресс уроков, навыки и недельный снимок жили
// мимо него.
import { describe, it, expect, beforeEach } from 'vitest'
import { clearAccountLeftovers } from './accountLeftovers.js'

beforeEach(() => localStorage.clear())

describe('clearAccountLeftovers', () => {
  it('стирает прогресс уроков всех уровней', () => {
    for (const lv of ['a0', 'a1', 'a2', 'b1', 'b2', 'c1']) localStorage.setItem(`jts-${lv}-done`, '["L1","L2"]')
    clearAccountLeftovers()
    for (const lv of ['a0', 'a1', 'a2', 'b1', 'b2', 'c1']) expect(localStorage.getItem(`jts-${lv}-done`)).toBeNull()
  })

  it('стирает навыки: и зеркало, и неотправленные дельты', () => {
    localStorage.setItem('jts_skill_stats', '{"grammar":{"done":5,"firstTry":4}}')
    localStorage.setItem('jts_skill_stats_pending', '{"grammar":{"done":1,"firstTry":1}}')
    clearAccountLeftovers()
    expect(localStorage.getItem('jts_skill_stats')).toBeNull()
    expect(localStorage.getItem('jts_skill_stats_pending')).toBeNull()
  })

  it('стирает недельный снимок уровня', () => {
    localStorage.setItem('jts_level_progress_week', '{"percent":40,"at":1}')
    clearAccountLeftovers()
    expect(localStorage.getItem('jts_level_progress_week')).toBeNull()
  })

  it('не трогает чужие ключи: язык, устройство, сторонние *-done', () => {
    localStorage.setItem('jts_device_id', 'dev-1')
    localStorage.setItem('jts-lang', 'kk')
    localStorage.setItem('jts-tutor-1-done', 'x')
    clearAccountLeftovers()
    expect(localStorage.getItem('jts_device_id')).toBe('dev-1')
    expect(localStorage.getItem('jts-lang')).toBe('kk')
    expect(localStorage.getItem('jts-tutor-1-done')).toBe('x')
  })
})
