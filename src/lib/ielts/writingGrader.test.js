import { describe, it, expect, vi } from 'vitest'
import { buildCoachPrompt, buildExercisesPrompt, buildMiniPrompt, buildSystemPrompt, miniUserMessage, normalizeMini, coachWriting, exercisesWriting, findQuote, lengthOf, normalizeAssessment, normalizeCoach, normalizeExercises, userMessage, normalizeDetails } from './writingGrader.js'

const text = 'The graph shows cycling. Northport rose sharply.'

describe('оценка Writing из банка', () => {
  it('критерии — к половине балла; ненайденная цитата — общее замечание, без исправления — выброшена', () => {
    const a = normalizeAssessment(
      {
        taskResponse: 6.3,
        coherenceCohesion: 7,
        lexicalResource: 9.7,
        grammaticalRange: 5.75,
        errors: [
          { quote: 'rose sharply', issue: 'no figures', correction: 'rose from 4% to 19%', criterion: 'taskResponse' },
          { quote: 'not in the text', issue: 'invented', correction: 'x', criterion: 'lexicalResource' },
          { quote: 'also invented', issue: 'no fix', correction: '', criterion: 'lexicalResource' },
        ],
        rewrites: [{ original: 'The graph shows cycling.', improved: 'The line graph compares…' }, { original: 'made up', improved: 'y' }],
        feedback: 'Добавьте цифры.',
      },
      text,
    )
    expect(a.criteria).toEqual({ taskResponse: 6.5, coherenceCohesion: 7, lexicalResource: 9, grammaticalRange: 6 })
    expect(a.errors.map((e) => [e.quote, e.quoteFound])).toEqual([['rose sharply', true], ['not in the text', false]])
    // старый формат (issue/correction) заполнен для прежних экранов
    expect(a.errors[0]).toMatchObject({ why: 'no figures', issue: 'no figures', fix: 'rose from 4% to 19%', correction: 'rose from 4% to 19%', para: 1 })
    expect(a.rewrites).toHaveLength(1)
    // флаги без ответа модели — «нарушения нет»
    expect(a).toMatchObject({ onTopic: true, overviewPresent: null, introCopied: false })
  })

  it('неполный ответ модели — ошибка, а не band из воздуха', () => {
    expect(() => normalizeAssessment({ taskResponse: 6 }, text)).toThrow()
  })

  it('задание и работа уходят модели как данные в тегах; недобор слов назван в промпте', () => {
    const job = { taskKind: 'task1_academic', words: 108, minWords: 150, text, task: { question: 'Describe the graph.', chart: { type: 'pie', title: 'X', slices: [{ label: 'A', value: 50 }] } } }
    expect(userMessage(job)).toContain('<task>\nDescribe the graph.\n\n[Visual]\nPie chart: "X". A — 50.\n</task>')
    expect(userMessage(job)).toContain(`<response>\n${text}\n</response>`)
    expect(buildSystemPrompt(job, 'ru')).toContain('This response has 108 words')
    expect(buildSystemPrompt(job, 'kk')).toContain('in Kazakh')
  })
})

describe('новый формат разбора (ТЗ §9.3)', () => {
  const essay = "People don't recycle enough.\n\nGovernments  must act — now. It is the main responsability."

  it('цитата ищется без учёта кавычек, тире, пробелов и регистра; в ошибку идёт исходный кусок', () => {
    expect(findQuote(essay, 'People don’t recycle')).toBe("People don't recycle")
    expect(findQuote(essay, 'governments must act - now')).toBe('Governments  must act — now')
    expect(findQuote(essay, '"the main responsability."')).toBe('the main responsability.')
    expect(findQuote(essay, 'nothing like this')).toBeNull()
  })

  it('ошибки: абзац по тексту, тип и правило; флаги ограничений', () => {
    const a = normalizeAssessment({
      taskResponse: 6, coherenceCohesion: 6, lexicalResource: 5.5, grammaticalRange: 6,
      onTopic: false, overviewPresent: 'no', introCopied: true,
      errors: [{ quote: 'main responsability', para: 1, criterion: 'lexicalResource', type: 'spelling', why: 'Опечатка.', fix: 'main responsibility', rule: 'responsibility — с i' }],
    }, essay)
    expect(a.errors[0]).toMatchObject({ quote: 'main responsability', quoteFound: true, para: 2, type: 'spelling', rule: 'responsibility — с i' })
    expect(a).toMatchObject({ onTopic: false, overviewPresent: false, introCopied: true })
  })

  it('промпт: число скопированных слов, флаги, подпись GRA и язык объяснений', () => {
    const job = { taskKind: 'task1_academic', words: 160, minWords: 150, text: 'The graph below shows the number of visitors. It rose.', task: { question: 'The graph below shows the number of visitors to a city zoo between 2015 and 2023.' } }
    expect(lengthOf(job)).toEqual({ words: 160, copied: 8, effectiveWords: 152 })
    expect(lengthOf({ ...job, copied: 20, effectiveWords: 140 })).toEqual({ words: 160, copied: 20, effectiveWords: 140 })
    const p = buildSystemPrompt(job, 'kk')
    expect(p).toContain('about 8 of them are copied')
    expect(p).toContain('Grammatical Range and Accuracy')
    expect(p).toContain('overviewPresent: "yes" if the report has a clear overview')
    expect(p).toContain('in Kazakh only')
    expect(buildSystemPrompt({ ...job, taskKind: 'task2' }, 'ru')).toContain('"not_applicable"')
  })
})

describe('закрепление: упражнения по ошибкам', () => {
  const raw = { exercises: [
    { kind: 'choice', criterion: 'grammaticalRange', ask: 'Выберите верный вариант', text: '', options: ['The number of cars was high.', 'The number of cars were high.'], answer: 0, accepted: [], tokens: [], wrong: 0, explain: 'number — единственное число' },
    { kind: 'choice', criterion: 'grammaticalRange', ask: 'x', text: '', options: ['a', 'b'], answer: 5, accepted: [], tokens: [], wrong: 0, explain: '' },
    { kind: 'gap', criterion: 'lexicalResource', ask: 'Впишите слово', text: 'Governments have the main ___ for pollution.', options: [], answer: 0, accepted: ['responsibility'], tokens: [], wrong: 0, explain: 'Правописание' },
    { kind: 'gap', criterion: 'lexicalResource', ask: 'x', text: 'No gap here.', options: [], answer: 0, accepted: ['a'], tokens: [], wrong: 0, explain: '' },
    { kind: 'spot', criterion: 'grammaticalRange', ask: 'Найдите ошибку', text: '', options: [], answer: 0, accepted: ['was'], tokens: ['The', 'number', 'of', 'cars', 'were', 'high.'], wrong: 4, explain: 'Согласование' },
    { kind: 'spot', criterion: 'grammaticalRange', ask: 'x', text: '', options: [], answer: 0, accepted: [], tokens: ['a', 'b', 'c'], wrong: 1, explain: '' },
  ] }

  it('кривые отбрасываются, верные — раунды дрилла с id X1…', () => {
    const ex = normalizeExercises(raw)
    expect(ex.map((r) => [r.id, r.kind])).toEqual([['X1', 'choice'], ['X2', 'type'], ['X3', 'spot']])
    expect(ex[0]).toMatchObject({ key: 'A', criterion: 'grammaticalRange', ask: 'Выберите верный вариант', why: 'number — единственное число' })
    expect(ex[0].text).toBeUndefined()
    expect(ex[1]).toMatchObject({ text: 'Governments have the main ___ for pollution.', accept: ['responsibility'] })
    expect(ex[2]).toMatchObject({ wrong: 4, accept: ['was'] })
  })

  it('сбой модели — пустой список, а не исключение; промпт — язык объяснений', async () => {
    const job = { taskKind: 'task2', text: 'x', task: {} }
    expect(await exercisesWriting({ run: vi.fn().mockRejectedValue(new Error('529')), model: 'm', job, uiLang: 'ru', timeoutMs: 1 })).toEqual([])
    expect(await exercisesWriting({ run: vi.fn().mockResolvedValue(raw), model: 'm', job, uiLang: 'ru', timeoutMs: 1 })).toHaveLength(3)
    expect(buildExercisesPrompt(job, 'en')).toContain('ask and explain in English')
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

describe('мини-эссе: проверка по чек-листу раунда', () => {
  const round = { id: 'T2-MINI-001', kind: 'free', text: 'Write an introduction.', model: 'Some argue that…', checklist: [{ ru: 'Перефразировано', en: 'Paraphrased', kk: 'Басқаша айтылған' }, { ru: 'Есть позиция', en: 'Clear position', kk: 'Ұстаным бар' }] }

  it('вердикт — по каждому пункту чек-листа, пункт — как в раунде', () => {
    const r = normalizeMini({ verdict: [{ index: 2, ok: true, note: 'Позиция ясна.' }], summary: 'Хорошо.', better: 'Better.' }, round)
    expect(r.verdict).toEqual([
      { item: round.checklist[0], ok: false, note: '' },
      { item: round.checklist[1], ok: true, note: 'Позиция ясна.' },
    ])
    expect(r.better).toBe('Better.')
    expect(() => normalizeMini({ verdict: [], summary: '' }, round)).toThrow()
  })

  it('промпт: чек-лист, язык; данные — в тегах', () => {
    expect(buildMiniPrompt({ round, uiLang: 'kk' })).toContain('1. Paraphrased\n2. Clear position')
    expect(buildMiniPrompt({ round, uiLang: 'kk' })).toContain('in Kazakh')
    expect(miniUserMessage({ round, taskText: 'Task Q', text: 'My intro' })).toBe('<task>\nWrite an introduction.\n\nTask Q\n</task>\n\n<model>\nSome argue that…\n</model>\n\n<answer>\nMy intro\n</answer>')
  })
})
