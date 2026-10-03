import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { readGlb, writeGlb } = require('./glb.js')
const { retargetAnimation, qmul, qinv } = require('./retarget.js')

const axis = (x, y, z, deg) => {
  const h = (deg * Math.PI) / 360
  return [x * Math.sin(h), y * Math.sin(h), z * Math.sin(h), Math.cos(h)]
}

// Скелет-цепочка: nodes = [{ name, rotation?, translation?, parent? }],
// tracks = [{ node, path, values }] на общих временах [0, 1].
function makeRig(nodes, tracks = []) {
  const times = [0, 1]
  const chunks = [times, ...tracks.map((t) => t.values)]
  const bin = Buffer.alloc(4 * chunks.flat().length)
  let at = 0
  const bufferViews = []
  const accessors = []
  chunks.forEach((c, i) => {
    c.forEach((v, k) => bin.writeFloatLE(v, at + k * 4))
    bufferViews.push({ buffer: 0, byteOffset: at, byteLength: c.length * 4 })
    const type = i === 0 ? 'SCALAR' : tracks[i - 1].path === 'rotation' ? 'VEC4' : 'VEC3'
    accessors.push({ bufferView: i, componentType: 5126, count: c.length / { SCALAR: 1, VEC3: 3, VEC4: 4 }[type], type })
    at += c.length * 4
  })
  const json = {
    asset: { version: '2.0' },
    nodes: nodes.map(({ name, rotation, translation }) => ({ name, ...(rotation && { rotation }), ...(translation && { translation }) })),
    skins: [{ joints: nodes.map((_, i) => i) }],
    buffers: [{ byteLength: bin.length }],
    bufferViews,
    accessors,
    animations: [
      {
        name: 'clip',
        samplers: tracks.map((_, i) => ({ input: 0, output: i + 1 })),
        channels: tracks.map((t, i) => ({ sampler: i, target: { node: t.node, path: t.path } })),
      },
    ],
  }
  nodes.forEach((n, i) => {
    if (n.parent === undefined) return
    const p = json.nodes[n.parent]
    p.children = [...(p.children || []), i]
  })
  return readGlb(writeGlb({ json, bin }))
}

function floats(glb, index) {
  const acc = glb.json.accessors[index]
  const bv = glb.json.bufferViews[acc.bufferView]
  const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[acc.type]
  return Array.from({ length: acc.count * n }, (_, i) => glb.bin.readFloatLE((bv.byteOffset || 0) + i * 4))
}

// Ключ `frame` дорожки узла `node` (path) в последней анимации.
function key(glb, node, path, frame) {
  const anim = glb.json.animations.at(-1)
  const ch = anim.channels.find((c) => c.target.node === node && c.target.path === path)
  const out = floats(glb, anim.samplers[ch.sampler].output)
  const n = path === 'rotation' ? 4 : 3
  return out.slice(frame * n, frame * n + n)
}

// Повороты равны с точностью до знака: q и −q — один поворот.
function expectSameRotation(a, b) {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])
  expect(d).toBeCloseTo(1, 5)
}

describe('retargetAnimation', () => {
  // Источник: бёдра и рука с одними осями; цель — та же фигура, но оси костей
  // повёрнуты иначе и есть лишняя концевая кость.
  const restS = { hips: [0, 0, 0, 1], arm: axis(0, 0, 1, 90) }
  const restT = { hips: axis(0, 1, 0, 90), arm: axis(1, 0, 0, 30), end: axis(0, 0, 1, 15) }
  const delta = axis(1, 0, 0, 45)
  // Рука источника поворачивается в мире на `delta` за секунду.
  const armAt1 = qmul(qmul(delta, restS.arm), [0, 0, 0, 1])
  const source = () =>
    makeRig(
      [
        { name: 'Hips', rotation: restS.hips, translation: [0, 90, 0] },
        { name: 'Arm', rotation: restS.arm, parent: 0 },
      ],
      [
        { node: 1, path: 'rotation', values: [...restS.arm, ...armAt1] },
        { node: 0, path: 'translation', values: [0, 90, 0, 0, 70, 30] },
      ],
    )
  const target = () =>
    makeRig([
      { name: 'Hips', rotation: restT.hips, translation: [0, 93, -4] },
      { name: 'Limb', rotation: restT.arm, parent: 0 },
      { name: 'end', rotation: restT.end, parent: 1 },
    ])

  it('мировой поворот кости цели повторяет мировой поворот источника относительно покоя', () => {
    const t = retargetAnimation(target(), source(), 0, 'jump', { map: { Limb: 'Arm' } })
    expect(t.json.animations.at(-1).name).toBe('jump')
    // Кадр 0 — поза покоя цели.
    expectSameRotation(key(t, 1, 'rotation', 0), restT.arm)
    // Кадр 1: мир руки цели = delta · покой в мире (родитель не двигался).
    const world = qmul(key(t, 0, 'rotation', 1), key(t, 1, 'rotation', 1))
    expectSameRotation(world, qmul(delta, qmul(restT.hips, restT.arm)))
  })

  it('кость без пары держит локальный покой, корень переносит смещение', () => {
    const t = retargetAnimation(target(), source(), 0, 'jump', { map: { Limb: 'Arm' } })
    expectSameRotation(key(t, 2, 'rotation', 1), restT.end)
    // Источник опустил бёдра на 20 и сдвинул на 30 — цель от своей позы покоя.
    const p = key(t, 0, 'translation', 1)
    expect(p[0]).toBeCloseTo(0, 5)
    expect(p[1]).toBeCloseTo(73, 5)
    expect(p[2]).toBeCloseTo(26, 5)
  })

  it('кость из карты, которой нет в источнике, — ошибка, а не тихий покой', () => {
    expect(() => retargetAnimation(target(), source(), 0, 'jump', { map: { Limb: 'Nope' } })).toThrow(/Nope/)
  })

  it('соседние ключи в одной полусфере', () => {
    const t = retargetAnimation(target(), source(), 0, 'jump', { map: { Limb: 'Arm' } })
    const a = key(t, 1, 'rotation', 0)
    const b = key(t, 1, 'rotation', 1)
    expect(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]).toBeGreaterThan(0)
    expectSameRotation(qmul(qinv(a), a), [0, 0, 0, 1])
  })
})
