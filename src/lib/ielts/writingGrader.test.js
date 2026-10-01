import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, normalizeAssessment, userMessage } from './writingGrader.js'

const text = 'The graph shows cycling. Northport rose sharply.'

describe('оценка Writing из банка', () => {
  it('критерии — к половине балла; выдуманные цитаты выбрасываются', () => {
    const a = normalizeAssessment(
      {
        taskResponse: 6.3,
        coherenceCohesion: 7,
        lexicalResource: 9.7,
        grammaticalRange: 5.75,
        errors: [
          { quote: 'rose sharply', issue: 'no figures', correction: 'rose from 4% to 19%', criterion: 'taskResponse' },
          { quote: 'not in the text', issue: 'invented', correction: 'x', criterion: 'lexicalResource' },
        ],
        rewrites: [{ original: 'The graph shows cycling.', improved: 'The line graph compares…' }, { original: 'made up', improved: 'y' }],
        feedback: 'Добавьте цифры.',
      },
      text,
    )
    expect(a.criteria).toEqual({ taskResponse: 6.5, coherenceCohesion: 7, lexicalResource: 9, grammaticalRange: 6 })
    expect(a.errors.map((e) => e.quote)).toEqual(['rose sharply'])
    expect(a.rewrites).toHaveLength(1)
  })

  it('неполный ответ модели — ошибка, а не band из воздуха', () => {
    expect(() => normalizeAssessment({ taskResponse: 6 }, text)).toThrow()
  })

  it('задание и работа уходят модели как данные в тегах; недобор слов назван в промпте', () => {
    const job = { taskKind: 'task1_academic', words: 108, minWords: 150, text, task: { question: 'Describe the graph.', chart: { type: 'pie', title: 'X', slices: [{ label: 'A', value: 50 }] } } }
    expect(userMessage(job)).toContain('<task>\nDescribe the graph.\n\n[Visual]\nPie chart: "X". A — 50.\n</task>')
    expect(userMessage(job)).toContain(`<response>\n${text}\n</response>`)
    expect(buildSystemPrompt(job, 'ru')).toContain('this response has 108')
    expect(buildSystemPrompt(job, 'kk')).toContain('in Kazakh')
  })
})
