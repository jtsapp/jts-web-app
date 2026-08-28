// Оракул: порядок элементов и вердикты грейдера сверяются с эталоном, который
// посчитал САМ прототип (scripts/extract-workbook.js → __fixtures__/oracle-a0.json).
// Красный тест здесь = порт разъехался с исходником, и студент видит не тот
// воркбук, что автор курса. Чинить порт, а не эталон.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  shuffle, numericLadder, optOrder, nrm, typeOk, orderOk,
  bankWords, tableAnswers, tableCells, orderTiles, sortOrder, seqOrder, memoDeck,
  dropPicks, slotCount, taskOf, isFree, stageOf, gapsIn, memoOrder,
} from './engine.js'
import { createActState, hit, slip, actDone, actScore, revealRest } from './actCtl.js'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'public', 'practice', 'workbook', 'a0')
const oracle = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__', 'oracle-a0.json'), 'utf8'))
const index = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf8'))

const lessonNums = Object.keys(index.lessons).map(Number).sort((a, b) => a - b)
const lessons = new Map(
  lessonNums.map((n) => [n, JSON.parse(fs.readFileSync(path.join(DATA, 'lesson-' + n + '.json'), 'utf8'))])
)
const allActs = lessonNums.flatMap((n) => lessons.get(n).acts.map((a, i) => ({ n, i, a })))

/** Тот же вывод, что кладёт в эталон экстрактор, но посчитанный ПОРТОМ. */
function portOracle(a, where) {
  const o = { where, t: a.t }
  switch (a.t) {
    case 'choose':
    case 'odd':
    case 'label':
    case 'respond':
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
    case 'table':
      o.answers = tableAnswers(a)
      o.bank = bankWords(a)
      break
    case 'order':
      o.tiles = a.items.map((_, i) => orderTiles(a, i))
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
      o.grade = null // вердикты сверяются отдельно, ниже
      break
    case 'listen':
    case 'read':
      o.task = portOracle(a.task, where + '>task')
      break
    default:
      break
  }
  return o
}

describe('движок воркбука — сверка с прототипом', () => {
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
        itemRows.forEach((row) => {
          expect(typeOk(task.items[ii], row.in), 'экран ' + n + '.' + i + ' пункт ' + ii + ': «' + row.in + '»').toBe(row.ok)
          rows++
        })
      })
    })
    // Корпус не должен схлопнуться в ноль при рефакторинге экстрактора
    expect(rows).toBeGreaterThan(500)
  })
})

describe('инварианты уровня A0', () => {
  it('каждый экран судим или свободен, и знает свою стадию', () => {
    allActs.forEach(({ n, i, a }) => {
      const where = 'экран ' + n + '.' + i
      if (isFree(a)) expect(slotCount(a), where).toBe(0)
      else expect(slotCount(a), where).toBeGreaterThan(0)
      expect(stageOf(a), where).toBeTruthy()
    })
  })

  it('order собирается из своих же плиток', () => {
    allActs.forEach(({ n, i, a }) => {
      if (a.t !== 'order') return
      a.items.forEach((it, k) => {
        const tiles = orderTiles(a, k)
        expect(orderOk(it, it.a.split(' ')), 'экран ' + n + '.' + i + '/' + k).toBe(true)
        expect(tiles.slice().sort()).toEqual(it.w.slice().sort())
      })
    })
  })

  it('в банке хватает слов на все пропуски', () => {
    allActs.forEach(({ n, i, a }) => {
      const task = taskOf(a)
      if (!['bank', 'match', 'table', 'chat'].includes(task.t)) return
      expect(bankWords(task).length, 'экран ' + n + '.' + i).toBeGreaterThanOrEqual(slotCount(a))
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
    expect(nrm('  Don’t   GO. ')).toBe("don't go")
    expect(nrm('well-known')).toBe('well known')
    expect(nrm('«quote»')).toBe('quote')
    expect(nrm('cat')).not.toBe(nrm('cats'))
  })

  it('gapsIn считает пропуски', () => {
    expect(gapsIn('I ___ coffee')).toBe(1)
    expect(gapsIn('___ and ___')).toBe(2)
    expect(gapsIn('no gaps')).toBe(0)
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
})
