import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { lessonSteps } = require('./steps.js')
const { CUE_FIXES, cueFixer } = require('./cue-fixes.js')

const ROOT = path.join(import.meta.dirname, '..', '..')
const UP = '\u{1F44D}' // 👍
const DOWN = '\u{1F44E}' // 👎

const PER_ITEM = { mcq: 'mcq', gap: 'gap' }
const ctx = { lang: 'ru', level: 'a0', clip: () => null, img: () => null, wordAudio: () => null }
const steps = (groups, extra = {}) => lessonSteps({ key: '1', no: 1, groups }, PER_ITEM, { ...ctx, ...extra })

// Жалоба из чата учителей (A0, урок 1): «I ___ rain.» с ответом «like» —
// «Неверный ответ». Курс ставит над такими заданиями знак (cue: like /
// dislike), а экстрактор его выкидывал; знак вернули руками прямо в данные
// (ad0cadd1), и первая же пересборка стёрла бы его снова. Теперь знак
// переносит экстрактор.
describe('selfstudy/steps — знак «да / нет» из поля cue', () => {
  it('выбор слова: знак первым в строке задания', () => {
    const [like, dislike] = steps([
      {
        t: 'mcq',
        stage: 'vocab',
        items: [
          { art: 'coffee', cue: 'like', line: 'I <u></u> coffee.', opts: ['like', "don't like", 'favourite'], a: 0 },
          { art: 'rain', cue: 'dislike', line: 'I <u></u> rain.', opts: ["don't like", 'favourite', 'like'], a: 0 },
        ],
      },
    ])
    expect(like.prompt).toBe(`${UP} I ___ coffee.`)
    expect(dislike.prompt).toBe(`${DOWN} I ___ rain.`)
  })

  // Строки у задания нет: в курсе предмет — картинка (art), которую плеер не
  // рисует. Без предмета на экране оставались два предложения и ни слова о том,
  // какое выбрать.
  it('выбор предложения без строки: знак и предмет из ответа', () => {
    const [music, rain, cats] = steps([
      {
        t: 'mcq',
        stage: 'prac',
        items: [
          { art: 'music', cue: 'like', opts: ['I like music.', "I don't like music."], a: 0 },
          { art: 'rain', cue: 'dislike', opts: ['I like rain.', "I don't like rain."], a: 1 },
          { art: 'cat', cue: 'like', opts: ["I don't like cats.", 'I like cats.'], a: 1 },
        ],
      },
    ])
    expect([music.prompt, rain.prompt, cats.prompt]).toEqual([`${UP} music`, `${DOWN} rain`, `${UP} cats`])
  })

  it('«впиши пропуск»: знак встаёт перед левой половиной', () => {
    const [gap] = steps([{ t: 'gap', stage: 'prac', items: [{ cue: 'dislike', line: 'I ___ Mondays.', bank: ['like', "don't like"], a: "don't like" }] }])
    expect(gap.before).toBe(`${DOWN} I`)
    expect(gap.after).toBe('Mondays.')
  })

  // «Tea is my ___ drink.» решается грамматикой, а не вкусом: знак там лишний.
  it('cue: favourite знака не даёт, задание без cue не трогается', () => {
    const [fav, plain] = steps([
      {
        t: 'mcq',
        stage: 'vocab',
        items: [
          { cue: 'favourite', line: 'Tea is my <u></u> drink.', opts: ['favourite', 'like'], a: 0 },
          { line: 'I <u></u> from the UK.', opts: ['am', 'is'], a: 0 },
        ],
      },
    ])
    expect(fav.prompt).toBe('Tea is my ___ drink.')
    expect(plain.prompt).toBe('I ___ from the UK.')
  })
})

describe('selfstudy/cue-fixes — знак там, где файл курса его не ставит', () => {
  it('правка находит задание по уроку и строке и ставит знак', () => {
    const cues = cueFixer('a1')
    const [step] = steps([{ t: 'gap', stage: 'prac', items: [{ line: 'I ___ at university in 2015.', bank: ['was', 'were', "wasn't"], a: 'was' }] }], {
      cueFix: (sc) => cues.cue('1', sc),
    })
    expect(step.before).toBe(`${UP} I`)
    expect(cues.unused()).toEqual([])
  })

  // Файл курса поменялся — правка не нашла задания. Сборка должна это увидеть,
  // а не выпустить задание без знака молча.
  it('правка, не нашедшая задания, попадает в unused', () => {
    const cues = cueFixer('a1')
    cues.cue('2', { line: 'I ___ at university in 2015.' })
    expect(cues.unused()).toHaveLength(1)
  })

  // Сторож данных: если уровень пересоберут старым экстрактором или правку
  // потеряют, знак пропадёт из шагов — и тест это поймает.
  const sign = { yes: UP, no: DOWN }
  for (const [level, fixes] of Object.entries(CUE_FIXES)) {
    for (const fix of fixes) {
      it(`${level}, урок ${fix.lesson}: «${fix.line}» — в данных со знаком ${sign[fix.cue]}`, () => {
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/course', level, `steps-${fix.lesson}.json`), 'utf8'))
        // Строка задания на экране: у пропуска — половинки вокруг «___», у
        // выбора — prompt. Пропуск в файле курса бывает и <u></u>.
        const shown = (s) => (s.type === 'gap' ? `${s.before || ''} ___ ${s.after || ''}` : s.prompt || '').replace(/\s+/g, ' ').trim()
        const line = fix.line.replace(/<u><\/u>/g, '___')
        const found = data.steps.filter((s) => shown(s).endsWith(line))
        expect(found).toHaveLength(1)
        expect(shown(found[0])).toBe(`${sign[fix.cue]} ${line}`)
      })
    }
  }
})
