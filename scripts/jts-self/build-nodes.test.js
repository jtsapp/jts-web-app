import { describe, it, expect } from 'vitest'
import { buildLessonNodes, buildReviewNode, lessonType, MIN_NODE_TASKS } from './build-nodes.js'

const lesson = { no: 1, unit: 1, title: 'Coffee — yes.', tracks: { t1: 'a0_1.mp3' }, html: '' }
const choice = (n) => ({ kind: 'choice', prompt: `q${n}`, options: ['a', 'b'], correct: 0, why: '' })
const stage = (name, count) => ({ name, blocks: Array.from({ length: count }, (_, i) => choice(i)) })

describe('buildLessonNodes', () => {
  it('одна стадия — один узел, код и заголовок из урока и стадии', () => {
    const [node] = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Warm-up', 4)] })
    expect(node).toMatchObject({ code: 'L01-1', title: 'Coffee — yes. · Warm-up', unit: 1 })
    expect(node.tasks).toHaveLength(4)
  })

  it('стадии нумеруются подряд и сохраняют порядок', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Warm-up', 4), stage('Grammar', 5)] })
    expect(nodes.map((n) => n.code)).toEqual(['L01-1', 'L01-2'])
    expect(nodes.map((n) => n.title)).toEqual(['Coffee — yes. · Warm-up', 'Coffee — yes. · Grammar'])
  })

  it('короткая стадия не даёт узла — уходит в предыдущий', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Warm-up', 4), stage('Riddles', 1)] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].tasks).toHaveLength(5)
  })

  it('короткая стадия в начале уходит в следующий узел', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Intro', 1), stage('Grammar', 4)] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].code).toBe('L01-1')
    expect(nodes[0].tasks).toHaveLength(5)
  })

  it('заголовок узла после склейки ведущей короткой стадии называет содержательную стадию, а не приклеенный огрызок', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Intro', 1), stage('Grammar', 5)] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].title).toBe('Coffee — yes. · Grammar')
    expect(nodes[0].tasks).toHaveLength(6)
  })

  it('урок из одной короткой стадии всё равно даёт один узел короче порога, а не пропадает с тропы', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Riddles', 2)] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].tasks).toHaveLength(2)
  })

  it('несколько коротких стадий, суммарно не дотягивающих до порога, дают один короткий узел, а не пропадают', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Intro', 1), stage('Riddles', 1)] })
    expect(nodes).toHaveLength(1)
    expect(nodes[0].tasks).toHaveLength(2)
  })

  it('стадия ровно из MIN_NODE_TASKS остаётся своим узлом', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('A', 4), stage('B', MIN_NODE_TASKS)] })
    expect(nodes).toHaveLength(2)
  })

  // Находка ревью: на выпущенных уровнях A2–C1 sec выглядит как
  // «2. Vocabulary · …», и плеер рисует из номера отдельный чип (splitSec).
  // Без номера чип не рендерился никогда, и верх карточки урока у A0/A1
  // отличался от остальных уровней.
  it('кикер задания нумерован по месту стадии в уроке, как на выпущенных уровнях', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Warm-up', 3), stage('Vocabulary', 3)] })
    expect(nodes[0].tasks[0].sec).toBe('1. Warm-up')
    expect(nodes[1].tasks[0].sec).toBe('2. Vocabulary')
  })

  it('номер стадии считается по исходному уроку, а не по узлам тропы', () => {
    // Первая стадия короткая — своего узла не даёт, но нумерация стадий от
    // этого не съезжает: студент видит номер стадии урока.
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('Intro', 1), stage('Grammar', 4)] })
    expect(nodes[0].tasks.map((t) => t.sec)).toEqual(['1. Intro', '2. Grammar', '2. Grammar', '2. Grammar', '2. Grammar'])
  })

  it('стадия без названия не даёт кикера с голым номером', () => {
    const [node] = buildLessonNodes({ lesson, level: 'a0', stages: [stage('', 3)] })
    expect(node.tasks[0].sec).toBe('')
  })

  it('причина отбраковки блока доходит до вызывающего', () => {
    const dropped = []
    buildLessonNodes({
      lesson,
      level: 'a0',
      stages: [{ name: 'Warm-up', blocks: [choice(1), { kind: 'info', html: '' }] }],
      onDrop: (reason) => dropped.push(reason),
    })
    expect(dropped).toEqual(['info-empty'])
  })

  it('урок без единого задания не даёт узлов', () => {
    expect(buildLessonNodes({ lesson, level: 'a0', stages: [{ name: 'Wrap', blocks: [] }] })).toEqual([])
  })

  it('номер урока дополняется нулём до двух знаков', () => {
    const [node] = buildLessonNodes({ lesson: { ...lesson, no: 7 }, level: 'a0', stages: [stage('A', 3)] })
    expect(node.code).toBe('L07-1')
  })
})

describe('buildReviewNode', () => {
  it('юнит-тест — один узел R0N без разбиения по стадиям', () => {
    const node = buildReviewNode({
      review: { no: 1, unit: 1, title: 'Unit Test · Unit 1', html: '' },
      level: 'a0',
      stages: [stage('Unit Test', 8)],
    })
    expect(node).toMatchObject({ code: 'R01', title: 'Unit Test · Unit 1', unit: 1 })
    expect(node.tasks).toHaveLength(8)
  })

  it('кикер заданий юнит-теста нумерован так же, как в уроке', () => {
    const node = buildReviewNode({
      review: { no: 1, unit: 1, title: 'Unit Test · Unit 1', html: '' },
      level: 'a0',
      stages: [stage('Unit Test', 2), stage('Speaking', 1)],
    })
    expect(node.tasks.map((t) => t.sec)).toEqual(['1. Unit Test', '1. Unit Test', '2. Speaking'])
  })
})

describe('lessonType', () => {
  it('узел юнит-теста — final', () => {
    expect(lessonType('R01', [{ type: 'choice' }])).toBe('final')
  })

  it('иначе — по первому заданию узла', () => {
    expect(lessonType('L01-5', [{ type: 'listen' }])).toBe('audio')
    expect(lessonType('L01-1', [{ type: 'info' }])).toBe('info')
    expect(lessonType('L01-2', [{ type: 'gap' }])).toBe('choice')
    expect(lessonType('L01-3', [])).toBe('choice')
  })

  it('watch и video группируются как video', () => {
    expect(lessonType('L01-6', [{ type: 'watch' }])).toBe('video')
    expect(lessonType('L01-7', [{ type: 'video' }])).toBe('video')
  })

  it('ведущий info не определяет тип, если дальше есть содержательное задание — тропа не должна быть одноцветной', () => {
    // Методически каждая стадия открывается инструкцией: info в начале —
    // это норма, а не признак того, что узел «инфо-узел».
    expect(lessonType('L01-1', [{ type: 'info' }, { type: 'choice' }])).toBe('choice')
    expect(lessonType('L01-2', [{ type: 'info' }, { type: 'info' }, { type: 'listen' }])).toBe('audio')
  })

  it('узел целиком из info-заданий остаётся честным info', () => {
    expect(lessonType('L01-3', [{ type: 'info' }, { type: 'info' }])).toBe('info')
  })
})
