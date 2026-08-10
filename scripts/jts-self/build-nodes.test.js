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

  it('стадия ровно из MIN_NODE_TASKS остаётся своим узлом', () => {
    const nodes = buildLessonNodes({ lesson, level: 'a0', stages: [stage('A', 4), stage('B', MIN_NODE_TASKS)] })
    expect(nodes).toHaveLength(2)
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
})
