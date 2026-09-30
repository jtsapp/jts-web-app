import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { readGlb, writeGlb, keepAnimation, addAnimation } = require('./glb.js')
const { parseRef } = require('../merge-runner-clips.js')

// Крошечный GLB: узлы-кости и одна анимация вращения последней кости.
function makeGlb(nodes, values, name = 'Armature|clip') {
  const times = [0, 1]
  const bin = Buffer.alloc(4 * (times.length + values.length))
  times.forEach((v, i) => bin.writeFloatLE(v, i * 4))
  values.forEach((v, i) => bin.writeFloatLE(v, (times.length + i) * 4))
  const json = {
    asset: { version: '2.0' },
    nodes: nodes.map((n) => ({ name: n })),
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: times.length * 4 },
      { buffer: 0, byteOffset: times.length * 4, byteLength: values.length * 4 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: times.length, type: 'SCALAR' },
      { bufferView: 1, componentType: 5126, count: values.length / 4, type: 'VEC4' },
    ],
    animations: [
      { name, samplers: [{ input: 0, output: 1 }], channels: [{ sampler: 0, target: { node: nodes.length - 1, path: 'rotation' } }] },
    ],
  }
  return readGlb(writeGlb({ json, bin }))
}

const floatsOf = (glb, accessor) => {
  const acc = glb.json.accessors[accessor]
  const bv = glb.json.bufferViews[acc.bufferView]
  const out = []
  for (let i = 0; i < bv.byteLength / 4; i++) out.push(glb.bin.readFloatLE((bv.byteOffset || 0) + (acc.byteOffset || 0) + i * 4))
  return out
}

describe('glb', () => {
  it('запись и чтение сходятся, длины кратны четырём', () => {
    const glb = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0.5, 0, 1])
    const buf = writeGlb(glb)
    expect(buf.readUInt32LE(0)).toBe(0x46546c67)
    expect(buf.length % 4).toBe(0)
    expect(buf.readUInt32LE(8)).toBe(buf.length)
    const back = readGlb(buf)
    expect(back.json.nodes).toEqual([{ name: 'Hips' }])
    expect(floatsOf(back, 1)).toEqual([0, 0, 0, 1, 0, 0.5, 0, 1])
  })

  it('keepAnimation оставляет одну анимацию под новым именем', () => {
    const glb = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    glb.json.animations.push({ ...glb.json.animations[0], name: 'other' })
    keepAnimation(glb, 1, 'run')
    expect(glb.json.animations.map((a) => a.name)).toEqual(['run'])
  })

  it('addAnimation переносит клип на кости базы по имени', () => {
    const base = keepAnimation(makeGlb(['Root', 'Hips', 'Spine'], [0, 0, 0, 1, 0, 0, 0, 1]), 0, 'run')
    const jump = makeGlb(['Hips', 'Spine'], [0.1, 0.2, 0.3, 0.9, 0.4, 0.5, 0.6, 0.7])
    addAnimation(base, jump, 0, 'jump')
    const added = base.json.animations[1]
    expect(added.name).toBe('jump')
    // Spine — в источнике узел 1, в базе узел 2.
    expect(added.channels[0].target).toEqual({ node: 2, path: 'rotation' })
    expect(floatsOf(base, added.samplers[0].output)).toEqual([0.1, 0.2, 0.3, 0.9, 0.4, 0.5, 0.6, 0.7].map(Math.fround))
    expect(floatsOf(base, added.samplers[0].input)).toEqual([0, 1])
    for (const bv of base.json.bufferViews) expect((bv.byteOffset || 0) % 4).toBe(0)
    expect(base.json.buffers[0].byteLength).toBe(base.bin.length)
    const back = readGlb(writeGlb(base))
    expect(back.json.animations.map((a) => a.name)).toEqual(['run', 'jump'])
  })

  it('кость, которой нет в базе, — ошибка: скелеты разные', () => {
    const base = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    const other = makeGlb(['mixamorig:Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    expect(() => addAnimation(base, other, 0, 'jump')).toThrow(/скелеты разные/)
  })

  it('нет анимации с таким номером — ошибка', () => {
    const glb = makeGlb(['Hips'], [0, 0, 0, 1, 0, 0, 0, 1])
    expect(() => keepAnimation(glb, 3, 'run')).toThrow(/#3/)
  })
})

describe('parseRef', () => {
  it('номер анимации после двоеточия, путь Windows не ломается', () => {
    expect(parseRef('C:\\tmp\\run.glb')).toEqual({ file: 'C:\\tmp\\run.glb', index: 0 })
    expect(parseRef('C:\\tmp\\run.glb:2')).toEqual({ file: 'C:\\tmp\\run.glb', index: 2 })
    expect(parseRef('jump.glb')).toEqual({ file: 'jump.glb', index: 0 })
  })
})
