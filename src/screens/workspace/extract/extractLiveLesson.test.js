// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { extractLiveLesson } from './extractLiveLesson.js'

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html')
}

const LESSON = `
<body>
  <header><span class="mk">A1</span></header>
  <section class="hero"><p class="kick">Unit 1 · A0 → A1</p><h1>Daily Routines</h1>
    <p class="goal">You will describe your day.</p></section>
  <div class="vocab"><div class="vhead"><h2>Словарь</h2></div><div>wake up</div></div>

  <section class="ex" id="do">
    <div class="ex-head"><span class="ex-num">1</span><h2>Do</h2><span class="ex-tag">Do</span></div>
    <div class="ex-body">
      <div class="mcq"><p class="q"><span class="num">1.</span> Capital of France? <button class="say">🔊</button></p>
        <div class="opt">London</div><div class="opt" data-correct="1">Paris</div></div>
    </div>
  </section>

  <section class="ex" id="match">
    <div class="ex-head"><span class="ex-num">2</span><h2>Match</h2><span class="ex-tag">Match</span></div>
    <div class="ex-body">
      <div class="listen"><span class="lb">🎧 3.21</span><audio src="audio/x.mp3"></audio></div>
      <div class="match">
        <div class="terms"><div class="mtile" data-key="a">run</div></div>
        <div class="defs"><div class="mtile" data-key="a">бежать</div></div>
      </div>
    </div>
  </section>

  <section class="ex" id="exit">
    <div class="ex-head"><span class="ex-num">3</span><h2>Write</h2><span class="ex-tag">Write</span></div>
    <div class="ex-body"><div class="exit-rows"><div class="exit-row"><span class="chunk">I like</span><input /></div></div></div>
  </section>
</body>`

describe('extractLiveLesson', () => {
  const json = extractLiveLesson(parse(LESSON))
  const step = (id) => json.steps.find((s) => s.id === id)

  it('reads level, unit and title', () => {
    expect(json.level).toBe('A1')
    expect(json.unit).toContain('Unit 1')
    expect(json.title).toBe('Daily Routines')
  })

  it('collects topics from .ex-tag and builds one step per .ex', () => {
    expect(json.topics.map((t) => t.title)).toEqual(['Do', 'Match', 'Write'])
    expect(json.steps.length).toBe(3)
  })

  it('prepends intro info blocks (goal / vocab) to the first step', () => {
    const titles = json.steps[0].blocks.filter((b) => b.type === 'info').map((b) => b.title)
    expect(titles).toContain('Цель')
    expect(titles).toContain('Словарь')
  })

  it('builds a choice question with the data-correct option as the answer', () => {
    const q = step('do').blocks.find((b) => b.type === 'practice').questions[0]
    expect(q.type).toBe('choice')
    expect(q.prompt).toBe('Capital of France?')
    expect(q.answer).toBe('Paris')
  })

  it('builds a match question joined by data-key', () => {
    const q = step('match').blocks.find((b) => b.type === 'practice').questions[0]
    expect(q.type).toBe('match')
    expect(q.pairs).toEqual([{ left: 'run', right: 'бежать' }])
  })

  it('keeps the listening-audio sibling as an info block before the practice block', () => {
    const blocks = step('match').blocks
    const infoIdx = blocks.findIndex((b) => b.type === 'info')
    const practiceIdx = blocks.findIndex((b) => b.type === 'practice')
    expect(infoIdx).toBeGreaterThanOrEqual(0)
    expect(infoIdx).toBeLessThan(practiceIdx)
    expect(blocks[infoIdx].html).toContain('audio')
  })

  it('builds an open gap question from .exit-row', () => {
    const q = step('exit').blocks.find((b) => b.type === 'practice').questions[0]
    expect(q.type).toBe('gap')
    expect(q.open).toBe(true)
    expect(q.gapBefore).toBe('I like')
  })
})
