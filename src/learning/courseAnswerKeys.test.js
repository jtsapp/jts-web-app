import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { answerMatches, normAnswer } from '../lib/answer-match.js'

// Ключи ответов выгруженного курса: проверяем, что задание вообще ПРОХОДИМО —
// что верный ответ плеер засчитает как верный.
//
// Повод из жизни: у прошлого поколения данных «собери предложение» не
// проходилось НИКОГДА (ответ лежал списком слов, плеер сравнивал фразу со
// строкой «I,like,coffee»), и 233 задания A0/A1 браковали любой ответ — см.
// fdd33d4. Ошибка была не видна ни линтеру, ни сборке: данные валидные, просто
// ни один ответ не подходил. Здесь та же сверка, что и в плеере
// (src/lib/answer-match.js), прогоняется по всем шагам всех уровней.
const ROOT = path.join(process.cwd(), 'public/course')
const LEVELS = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory()) : []

function stepsOf(level) {
  const dir = path.join(ROOT, level)
  const out = []
  for (const file of fs.readdirSync(dir).filter((f) => /^steps-.*\.json$/.test(f))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    for (const step of data.steps || []) out.push({ file, step })
  }
  return out
}

// Как плеер: слова банка выкладываются в порядке эталона, собранная строка
// сверяется с ответом (см. verdict() для order в CourseStepPlayer).
function buildInAnswerOrder(step) {
  const pool = (step.words || []).map((w) => ({ w, used: false }))
  const built = []
  for (const token of String(step.answer || '').split(/\s+/).filter(Boolean)) {
    const hit = pool.find((p) => !p.used && normAnswer(p.w) === normAnswer(token))
    if (!hit) return { built: null, leftovers: pool.filter((p) => !p.used).map((p) => p.w) }
    hit.used = true
    built.push(hit.w)
  }
  return { built: built.join(' '), leftovers: pool.filter((p) => !p.used).map((p) => p.w) }
}

describe.each(LEVELS)('ключи ответов курса %s', (level) => {
  const all = stepsOf(level)

  it('шагов в уровне достаточно, файлы читаются', () => {
    expect(all.length).toBeGreaterThan(0)
  })

  it('«собери предложение» проходится: из банка складывается ровно эталон', () => {
    const bad = []
    for (const { file, step } of all) {
      if (step.type !== 'order') continue
      const { built, leftovers } = buildInAnswerOrder(step)
      const ok = built !== null && leftovers.length === 0 && normAnswer(built) === normAnswer(step.answer)
      if (!ok) bad.push({ file, words: step.words, answer: step.answer, built, leftovers })
    }
    expect(bad).toEqual([])
  })

  it('у пропуска эталонный ответ сходится сам с собой', () => {
    const bad = []
    for (const { file, step } of all) {
      if (step.type !== 'gap') continue
      const answers = (step.answers || []).filter(Boolean)
      if (!answers.length) {
        bad.push({ file, reason: 'нет ответа', step: step.title })
        continue
      }
      const cue = `${step.before || ''} ${step.after || ''}`
      if (!answerMatches(answers[0], answers, cue)) bad.push({ file, answers, cue })
    }
    expect(bad).toEqual([])
  })

  it('у выбора ответ есть среди вариантов', () => {
    const bad = []
    for (const { file, step } of all) {
      if (step.type !== 'choice' && step.type !== 'listen') continue
      const options = step.options || []
      if (!options.length) continue // слушание без вопроса — не оценивается
      if (!options.includes(step.answer)) bad.push({ file, answer: step.answer, options })
    }
    expect(bad).toEqual([])
  })

  it('банк слов пропуска содержит верный ответ', () => {
    const bad = []
    for (const { file, step } of all) {
      if (step.type !== 'gap' || !(step.bank || []).length) continue
      const has = step.bank.some((w) => normAnswer(w) === normAnswer((step.answers || [])[0]))
      if (!has) bad.push({ file, bank: step.bank, answers: step.answers })
    }
    expect(bad).toEqual([])
  })

  it('у «найди ошибку» и колонок разметка на месте', () => {
    const bad = []
    for (const { file, step } of all) {
      if (step.type === 'mistake') {
        const n = (step.tokens || []).length
        if (!n || !(step.bad >= 0 && step.bad < n)) bad.push({ file, tokens: step.tokens, bad: step.bad })
      }
      if (step.type === 'cols') {
        const cols = (step.columns || []).length
        const wrong = (step.items || []).filter((it) => !(it.col >= 0 && it.col < cols))
        if (!cols || wrong.length) bad.push({ file, columns: step.columns, wrong })
      }
    }
    expect(bad).toEqual([])
  })

  it('у соединения пар правая половина есть у каждой пары', () => {
    const bad = []
    for (const { file, step } of all) {
      if (step.type !== 'match') continue
      const pairs = step.pairs || []
      const options = step.options || []
      const broken = pairs.filter((p) => !p.left || !p.right || !options.includes(p.right))
      if (!pairs.length || broken.length) bad.push({ file, broken, options })
    }
    expect(bad).toEqual([])
  })
})
