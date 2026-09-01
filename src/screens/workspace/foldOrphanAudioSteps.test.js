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

describe('foldOrphanAudioSteps — дорожка встаёт к своему заданию', () => {
  const audioBlock = (file) => ({
    type: 'info',
    html: `<p class="track"><b>${file}</b><br><audio src="../audio/${file}"></audio></p>`,
  })

  it('две дорожки расходятся по своим упражнениям, а не ложатся обе в конец', () => {
    const steps = foldOrphanAudioSteps([
      {
        id: 's2',
        order: 1,
        title: 'Listening',
        blocks: [
          { type: 'info', html: '<p>Listen to Track 1.3 and answer.</p>' },
          { type: 'info', html: '<p>Now listen to Track 1.4 and compare.</p>' },
          { type: 'info', html: '<p>Discuss in pairs.</p>' },
        ],
      },
      {
        id: 's-audio',
        order: 2,
        title: 'Audio',
        blocks: [audioBlock('Track_1.3.mp3'), audioBlock('Track_1.4.mp3')],
      },
    ])

    const html = steps[0].blocks.map((b) => b.html)
    expect(html[0]).toContain('Track 1.3 and answer')
    expect(html[1]).toContain('<audio')
    expect(html[1]).toContain('Track_1.3.mp3')
    expect(html[2]).toContain('Track 1.4 and compare')
    expect(html[3]).toContain('Track_1.4.mp3')
    expect(html[4]).toContain('Discuss in pairs')
  })

  it('номер через подчёркивание в имени файла тоже находит задание', () => {
    const steps = foldOrphanAudioSteps([
      {
        id: 's2',
        order: 1,
        title: 'Practice',
        blocks: [
          { type: 'info', html: '<p>Track 7.2 — listen.</p>' },
          { type: 'info', html: '<p>Homework.</p>' },
        ],
      },
      { id: 's-audio', order: 2, title: 'Audio', blocks: [audioBlock('Track_7_2.mp3')] },
    ])

    expect(steps[0].blocks[1].html).toContain('Track_7_2.mp3')
    expect(steps[0].blocks[2].html).toContain('Homework')
  })

  it('задание дорожку не называет — плеер остаётся в конце шага, как раньше', () => {
    const steps = foldOrphanAudioSteps([
      {
        id: 's2',
        order: 1,
        title: 'Listening',
        blocks: [{ type: 'info', html: '<p>Listen and answer.</p>' }],
      },
      { id: 's-audio', order: 2, title: 'Audio', blocks: [audioBlock('Unit1.mp3')] },
    ])

    expect(steps[0].blocks).toHaveLength(2)
    expect(steps[0].blocks[1].html).toContain('Unit1.mp3')
  })
})
