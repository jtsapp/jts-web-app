// Оракул: порядок элементов и вердикты грейдера сверяются с эталоном, который
// посчитал САМ прототип (scripts/extract-workbook.js → __fixtures__/oracle-<level>.json).
// Красный тест здесь = порт разъехался с исходником, и студент видит не тот
// воркбук, что автор курса. Чинить порт, а не эталон.
//
// Сверяются ВСЕ пять уровней: они не «одно и то же с другими словами» —
// у каждого свой набор типов и свой судья набранного ответа, и разъехаться
// они могут поодиночке.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  shuffle, numericLadder, optOrder, typeOk, orderOk,
  bankWords, tableAnswers, tableCells, orderTiles, sortOrder, seqOrder, memoDeck,
  dropPicks, slotCount, taskOf, isFree, stageOf, gapsIn, memoOrder,
  transTiles, clozeBank, subsetAct,
} from './engine.js'
import { nrmFor, matcherFor } from './match.js'
import { createActState, hit, slip, actDone, actScore, revealRest } from './actCtl.js'

const ROOT = process.cwd()
const LEVELS = ['a0', 'a1', 'a2', 'b1', 'b2']

function loadLevel(level) {
  const dir = path.join(ROOT, 'public', 'practice', 'workbook', level)
  const oracle = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__', 'oracle-' + level + '.json'), 'utf8'))
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
  const nums = Object.keys(index.lessons).map(Number).sort((a, b) => a - b)
  const lessons = new Map(
    nums.map((n) => [n, JSON.parse(fs.readFileSync(path.join(dir, 'lesson-' + n + '.json'), 'utf8'))])
  )
  const allActs = nums.flatMap((n) => lessons.get(n).acts.map((a, i) => ({ n, i, a })))
  return { oracle, index, meta, nums, lessons, allActs }
}

const DATA = Object.fromEntries(LEVELS.map((l) => [l, loadLevel(l)]))

/** Тот же вывод, что кладёт в эталон экстрактор, но посчитанный ПОРТОМ. */
function portOracle(a, where) {
  const o = { where, t: a.t }
  switch (a.t) {
    case 'choose':
    case 'odd':
    case 'label':
    case 'respond':
    case 'quiz':
      o.orders = a.items.map((it, i) => optOrder(a, it, i))
      o.right = o.orders.map((ord, i) => ord.indexOf(a.items[i].a))
      break
    case 'tf':
      o.orders = a.items.map(() => [0, 1])
      o.right = a.items.map((it) => (it.a ? 0 : 1))
      break
    case 'bank':
    case 'match':
    case 'chat':
      o.bank = bankWords(a)
      break
    case 'cloze':
      o.bank = clozeBank(a)
      break
    case 'table':
      o.answers = tableAnswers(a)
      o.bank = bankWords(a)
      break
    case 'order':
      o.tiles = a.items.map((_, i) => orderTiles(a, i))
      break
    case 'trans':
      o.tiles = a.items.map((_, i) => transTiles(a, i))
      break
    case 'sort':
      o.order = sortOrder(a)
      break
    case 'seq':
      o.order = seqOrder(a)
      break
    case 'memo':
      o.order = memoOrder(a)
      break
    case 'drop':
      o.picks = dropPicks(a).map((p) => ({ li: p.li, pi: p.pi, order: p.order }))
      break
    case 'type':
    case 'ttrans':
    case 'wform':
    case 'chain':
      o.grade = null // вердикты сверяются отдельно, ниже
      break
    case 'listen':
    case 'read':
    case 'rule':
    case 'model':
    case 'worked':
    case 'video':
      o.task = portOracle(a.task, where + '>task')
      break
    default:
      break
  }
  return o
}

describe.each(LEVELS)('движок воркбука — сверка с прототипом (%s)', (level) => {
  const { oracle, allActs } = DATA[level]

  it('эталон покрывает все экраны уровня', () => {
    expect(oracle.acts.length).toBe(allActs.length)
    expect(oracle.acts.map((o) => o.where)).toEqual(allActs.map(({ n, i }) => n + '.' + i))
  })

  it('порядок вариантов, банков и плиток совпадает с прототипом', () => {
    allActs.forEach(({ n, i, a }, k) => {
      const want = oracle.acts[k]
      const got = portOracle(a, n + '.' + i)
      // grade сверяется отдельным тестом — здесь его нет ни в одной ветке
      const strip = (o) => JSON.parse(JSON.stringify(o, (key, v) => (key === 'grade' ? undefined : v)))
      expect(strip(got), 'экран ' + n + '.' + i + ' (' + a.t + ')').toEqual(strip(want))
    })
  })

  it('грейдер набранного ответа судит как прототип', () => {
    let rows = 0
    allActs.forEach(({ n, i, a }, k) => {
      const want = oracle.acts[k]
      const grade = want.grade || (want.task && want.task.grade)
      if (!grade) return
      const task = taskOf(a)
      grade.forEach((itemRows, ii) => {
        const where = 'экран ' + n + '.' + i + ' пункт ' + ii
        // У цепочки на пункт приходится по строке на каждый шаг, у остальных —
        // просто список вводов.
        if (task.t === 'chain') {
          itemRows.forEach((stepRows, si) => {
            stepRows.forEach((row) => {
              expect(typeOk(task.items[ii].steps[si], row.in, level), where + '.' + si + ': «' + row.in + '»').toBe(row.ok)
              rows++
            })
          })
          return
        }
        itemRows.forEach((row) => {
          expect(typeOk(task.items[ii], row.in, level), where + ': «' + row.in + '»').toBe(row.ok)
          rows++
        })
      })
    })
    // Корпус не должен схлопнуться в ноль при рефакторинге экстрактора
    expect(rows).toBeGreaterThan(500)
  })
})

describe.each(LEVELS)('инварианты уровня (%s)', (level) => {
  const { allActs, meta, index } = DATA[level]

  it('каждый экран судим или свободен, и знает свою стадию', () => {
    allActs.forEach(({ n, i, a }) => {
      const where = 'экран ' + n + '.' + i + ' (' + a.t + ')'
      if (isFree(a)) expect(slotCount(a), where).toBe(0)
      else expect(slotCount(a), where).toBeGreaterThan(0)
      expect(stageOf(a), where).toBeTruthy()
    })
  })

  it('сборка предложения складывается из своих же плиток', () => {
    allActs.forEach(({ n, i, a }) => {
      if (a.t !== 'order' && a.t !== 'trans') return
      a.items.forEach((it, k) => {
        const tiles = a.t === 'order' ? orderTiles(a, k) : transTiles(a, k)
        expect(orderOk(it, it.a.split(' ')), 'экран ' + n + '.' + i + '/' + k).toBe(true)
        expect(tiles.slice().sort()).toEqual(it.w.slice().sort())
      })
    })
  })

  it('в банке хватает слов на все пропуски', () => {
    allActs.forEach(({ n, i, a }) => {
      const task = taskOf(a)
      if (['bank', 'match', 'table', 'chat'].includes(task.t)) {
        expect(bankWords(task).length, 'экран ' + n + '.' + i).toBeGreaterThanOrEqual(slotCount(a))
      }
      if (task.t === 'cloze') {
        expect(clozeBank(task).length, 'экран ' + n + '.' + i).toBeGreaterThanOrEqual(slotCount(a))
      }
    })
  })

  it('таблица режется на ячейки без потери пропусков', () => {
    allActs.forEach(({ a }) => {
      if (a.t !== 'table') return
      const gaps = tableCells(a).flat().filter((c) => c.gap).map((c) => c.gap)
      expect(gaps).toEqual(tableAnswers(a))
    })
  })

  it('повторный расчёт даёт тот же порядок', () => {
    allActs.forEach(({ n, i, a }) => {
      expect(JSON.stringify(portOracle(a, n + '.' + i))).toBe(JSON.stringify(portOracle(a, n + '.' + i)))
    })
  })

  it('разбор ошибок сужает только то, что уровень разрешает сузить', () => {
    expect(Array.isArray(meta.subsettable), 'meta.subsettable').toBe(true)
    allActs.forEach(({ a }) => {
      const cut = subsetAct(a, [0], meta.subsettable)
      if (!meta.subsettable.includes(a.t) || !a.items) {
        expect(cut).toBe(a)
        return
      }
      expect(cut.items.length).toBe(1)
      expect(cut.items[0]).toEqual(a.items[0])
    })
  })

  it('каталог знает каждый урок ровно одного юнита', () => {
    const seen = new Set()
    index.units.forEach((u) => {
      u.ls.concat(u.rev == null ? [] : [u.rev]).forEach((n) => {
        expect(index.lessons[n], 'урок ' + n).toBeTruthy()
        expect(seen.has(n), 'урок ' + n + ' в двух юнитах').toBe(false)
        seen.add(n)
      })
    })
    expect(seen.size).toBe(Object.keys(index.lessons).length)
  })
})

describe('примитивы', () => {
  it('shuffle детерминирован и не теряет элементов', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(a, 42)).toEqual(shuffle(a, 42))
    expect(shuffle(a, 42).slice().sort()).toEqual(a)
    expect(shuffle(a, 42)).not.toEqual(shuffle(a, 43))
    // исходный массив не трогаем
    shuffle(a, 42)
    expect(a).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('числовая лесенка не перемешивается', () => {
    expect(numericLadder(['1', '2', '3'])).toBe(true)
    expect(numericLadder(['3', '2'])).toBe(false)
    expect(numericLadder(['cat', 'dog'])).toBe(false)
    const act = { seed: 7, items: [{ o: ['1', '2', '3'], a: 0, q: 'how many?' }] }
    expect(optOrder(act, act.items[0], 0)).toEqual([0, 1, 2])
  })

  it('nrm прощает набор, но не слово', () => {
    const nrm = nrmFor('a0')
    expect(nrm('  Don’t   GO. ')).toBe("don't go")
    expect(nrm('well-known')).toBe('well known')
    expect(nrm('«quote»')).toBe('quote')
    expect(nrm('cat')).not.toBe(nrm('cats'))
  })

  it('судья уровня прощает ровно то, что прощал его прототип', () => {
    // A0 знает только про набор: полная форма — это уже другой ответ.
    expect(matcherFor('a0')("I haven't seen him", ["I haven't seen him"])).toBe(true)
    expect(matcherFor('a0')('I have not seen him', ["I haven't seen him"])).toBe(false)
    // A1 прощает потерянный апостроф и британское написание.
    expect(matcherFor('a1')('dont go', ["don't go"])).toBe(true)
    expect(matcherFor('a1')('practice', ['practise'])).toBe(true)
    // A2 — по списку пар, но не там, где без апострофа выходит другое слово.
    expect(matcherFor('a2')('color', ['colour'])).toBe(true)
    expect(matcherFor('a2')('were', ["we're"])).toBe(false)
    // B1/B2 раскрывают сокращения, и «he is got» остаётся ошибкой.
    expect(matcherFor('b1')('I have not seen him', ["I haven't seen him"])).toBe(true)
    expect(matcherFor('b1')('he is got a car', ["he's got a car"])).toBe(false)
    expect(matcherFor('b2')('we will be there', ["we'll be there"])).toBe(true)
    // Пустой ввод не верен никогда и ни на одном уровне.
    LEVELS.forEach((l) => expect(matcherFor(l)('   ', ['x']), l).toBe(false))
  })

  it('gapsIn считает пропуски', () => {
    expect(gapsIn('I ___ coffee')).toBe(1)
    expect(gapsIn('___ and ___')).toBe(2)
    expect(gapsIn('no gaps')).toBe(0)
  })

  it('memoDeck раскладывает по две карточки на пару', () => {
    const act = { t: 'memo', seed: 5, pairs: [['a', 'аа', 'аа'], ['b', 'бб', 'бб']] }
    const deck = memoDeck(act)
    expect(deck.length).toBe(4)
    expect(deck.filter((c) => c.side === 'word').length).toBe(2)
  })
})

describe('счётчик экрана', () => {
  const act = { t: 'choose', items: [{ o: ['a', 'b'], a: 0 }, { o: ['a', 'b'], a: 1 }] }

  it('балл — доля верных с первой попытки, а не доля решённых', () => {
    let s = createActState(act)
    expect(s.total).toBe(2)
    s = hit(s, 0, true)
    s = slip(s)
    s = hit(s, 1, false)
    expect(actDone(s)).toBe(true)
    expect(actScore(s)).toBe(50)
    expect(s.missed).toEqual([1])
    expect(s.wrong).toBe(1)
  })

  it('повторный вердикт по решённому месту ничего не меняет', () => {
    let s = createActState(act)
    s = hit(s, 0, true)
    const again = hit(s, 0, false)
    expect(again).toEqual(s)
  })

  it('свободный экран пройден сразу и стоит 100', () => {
    const free = createActState({ t: 'write', write: { q: 'x' } })
    expect(free.free).toBe(true)
    expect(actDone(free)).toBe(true)
    expect(actScore(free)).toBe(100)
  })

  it('«показать ответы» закрывает остаток как ошибки', () => {
    let s = createActState(act)
    s = hit(s, 0, true)
    s = revealRest(s)
    expect(actDone(s)).toBe(true)
    expect(s.missed).toEqual([1])
    expect(actScore(s)).toBe(50)
  })

  it('цепочка считает шаги, а не пункты', () => {
    const chain = {
      t: 'chain',
      items: [
        { from: 'x', steps: [{ cue: '1', a: 'a' }, { cue: '2', a: 'b' }] },
        { from: 'y', steps: [{ cue: '1', a: 'c' }, { cue: '2', a: 'd' }] },
      ],
    }
    expect(createActState(chain).total).toBe(4)
  })
})
