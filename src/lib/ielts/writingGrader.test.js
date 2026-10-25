import { describe, it, expect, vi } from 'vitest'
import { buildCoachPrompt, buildSystemPrompt, coachWriting, normalizeAssessment, normalizeCoach, userMessage, normalizeDetails } from './writingGrader.js'

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

describe('normalizeDetails', () => {
  it('оставляет разбор по критериям, абзацам и только те слова, что есть в работе', () => {
    const d = normalizeDetails({
      criteriaNotes: [{ criterion: 'taskResponse', why: 'Позиция ясна.', nextBand: 'Добавьте пример.' }, { criterion: 'nope', why: 'x', nextBand: '' }],
      paragraphs: [{ index: 1, role: 'introduction', comment: 'Тезис есть.' }, { index: 2, role: 'body', comment: '' }],
      vocabulary: [{ word: 'good', better: ['beneficial', 'valuable'], note: 'повтор' }, { word: 'nonexistent', better: ['x'], note: '' }],
      strengths: ['Чёткая структура'],
      nextSteps: ['a', 'b', 'c', 'd'],
    }, 'It is good for people. Good things happen.')
    expect(d.criteriaNotes).toEqual([{ criterion: 'taskResponse', why: 'Позиция ясна.', nextBand: 'Добавьте пример.' }])
    expect(d.paragraphs).toHaveLength(1)
    expect(d.vocabulary.map((v) => v.word)).toEqual(['good'])
    expect(d.nextSteps).toHaveLength(3)
  })
})

describe('«наставник» Writing: как развить эссе и улучшить по предложениям', () => {
  const text = 'Education is very important. It give people chance.\n\nFirstly, free education help poor students. They can study.\n\nIn conclusion, it is good.'
  const raw = {
    sentences: [
      { paragraph: 1, original: "It give people chance.", improved: "It gives people a chance to succeed.", why: "Согласование и артикль", criterion: "grammaticalRange" },
      // номер абзаца модель перепутала — берётся по тексту
      { paragraph: 1, original: "Firstly, free education help poor students.", improved: "Firstly, free education helps students from poor families.", why: "Согласование", criterion: "grammaticalRange" },
      { paragraph: 2, original: "Firstly, free education help poor students.", improved: "Дубль", why: "x", criterion: "lexicalResource" },
      { paragraph: 2, original: "A sentence the student never wrote.", improved: "Better.", why: "x", criterion: "lexicalResource" },
      { paragraph: 3, original: "In conclusion, it is good.", improved: "In conclusion, it is good.", why: "без изменений", criterion: "nonsense" },
    ],
    developmentTips: [
      { paragraph: 2, area: "examples", tip: "Добавьте пример.", example: "For instance, ..." },
      { paragraph: 9, area: "weird", tip: "Общий совет.", example: "" },
      { paragraph: 1, area: "ideas", tip: "", example: "x" },
    ],
    improvedEssay: ["Education matters.", "", "To conclude, it pays off."],
  }

  it("берёт только дословные предложения, абзац — по тексту, без дублей и «улучшений» без изменений", () => {
    const c = normalizeCoach(raw, text)
    expect(c.sentences.map((x) => [x.paragraph, x.original])).toEqual([[1, "It give people chance."], [2, "Firstly, free education help poor students."]])
    expect(c.sentences[0].criterion).toBe("grammaticalRange")
    expect(c.developmentTips).toEqual([
      { paragraph: 2, area: "examples", tip: "Добавьте пример.", example: "For instance, ..." },
      { paragraph: 0, area: "ideas", tip: "Общий совет.", example: "" },
    ])
    expect(c.improvedEssay).toEqual(["Education matters.", "To conclude, it pays off."])
  })

  it("промпт: язык пояснений, данные в тегах, без выдуманной статистики", () => {
    const p = buildCoachPrompt({ taskKind: "task2" }, "kk")
    expect(p).toContain("in Kazakh")
    expect(p).toContain("<response>")
    expect(p).toContain("Never invent statistics")
  })

  it("сбой или пустой ответ модели — null, а не исключение: оценка сохраняется без этих блоков", async () => {
    const job = { taskKind: "task2", text, task: {} }
    expect(await coachWriting({ run: vi.fn().mockRejectedValue(new Error("529")), model: "m", job, uiLang: "ru", timeoutMs: 1000 })).toBeNull()
    expect(await coachWriting({ run: vi.fn().mockResolvedValue({}), model: "m", job, uiLang: "ru", timeoutMs: 1000 })).toBeNull()
    const ok = await coachWriting({ run: vi.fn().mockResolvedValue(raw), model: "m", job, uiLang: "ru", timeoutMs: 1000 })
    expect(ok.sentences).toHaveLength(2)
  })
})
