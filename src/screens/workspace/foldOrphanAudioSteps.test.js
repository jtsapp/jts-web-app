import { describe, it, expect } from 'vitest'
import { foldOrphanAudioSteps } from './foldOrphanAudioSteps.js'

describe('foldOrphanAudioSteps', () => {
  it('склеивает хвостовой Audio в Practice и убирает отдельный шаг', () => {
    const steps = foldOrphanAudioSteps([
      { id: 's1', order: 1, title: 'Warm-up', blocks: [{ type: 'info', html: '<p>Hi</p>' }] },
      { id: 's3', order: 2, title: 'Practice', tag: 'Practice', blocks: [{ type: 'info', html: '<p>Q</p>' }] },
      { id: 's7', order: 3, title: 'You can now…', blocks: [{ type: 'checklist', items: ['a'] }] },
      {
        id: 's-audio',
        order: 4,
        title: 'Audio',
        blocks: [{ type: 'info', html: '<p class="track"><b>Track_1.3.mp3</b><audio src="../audio/Track_1.3.mp3"></audio></p>' }],
      },
    ])

    expect(steps.map((s) => s.title)).toEqual(['Warm-up', 'Practice', 'You can now…'])
    expect(steps[1].blocks).toHaveLength(2)
    expect(steps[1].blocks[1].html).toContain('Track_1.3.mp3')
    expect(steps.map((s) => s.order)).toEqual([1, 2, 3])
  })

  it('не трогает обычные шаги без хвостового Audio', () => {
    const input = [
      { id: 's1', order: 1, title: 'Listening', blocks: [{ type: 'info', html: '<audio src="a.mp3"></audio>' }] },
    ]
    expect(foldOrphanAudioSteps(input)).toEqual(input)
  })
})
