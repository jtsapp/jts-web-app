// Чтение, запись и склейка анимаций GLB без внешних зависимостей — как
// zip.js рядом. Нужен одному сценарию: собрать бегуна Word Rush из четырёх
// выгрузок Meshy (бег, прыжок, подкат, спотыкание). Каждая — та же модель с
// тем же ригом и своим клипом; сетку и скелет берём из одной, клипы — из всех.
// Тянуть ради этого @gltf-transform/core не стали.

const MAGIC = 0x46546c67 // 'glTF'
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

const pad4 = (n) => (n + 3) & ~3

function readGlb(buf) {
  if (buf.readUInt32LE(0) !== MAGIC) throw new Error('glb: это не GLB-файл')
  const total = buf.readUInt32LE(8)
  let json = null
  let bin = Buffer.alloc(0)
  for (let at = 12; at < total; ) {
    const len = buf.readUInt32LE(at)
    const type = buf.readUInt32LE(at + 4)
    const data = buf.subarray(at + 8, at + 8 + len)
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8'))
    else if (type === BIN_CHUNK) bin = Buffer.from(data)
    at += 8 + len
  }
  if (!json) throw new Error('glb: нет JSON-чанка')
  return { json, bin }
}

function writeGlb({ json, bin }) {
  const text = Buffer.from(JSON.stringify(json), 'utf8')
  const jsonLen = pad4(text.length)
  const binLen = pad4(bin.length)
  const total = 12 + 8 + jsonLen + (bin.length ? 8 + binLen : 0)
  const out = Buffer.alloc(total)
  out.writeUInt32LE(MAGIC, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  out.writeUInt32LE(jsonLen, 12)
  out.writeUInt32LE(JSON_CHUNK, 16)
  // Формат требует добивать JSON пробелами, а BIN — нулями (их даёт alloc).
  out.fill(0x20, 20, 20 + jsonLen)
  text.copy(out, 20)
  if (bin.length) {
    const at = 20 + jsonLen
    out.writeUInt32LE(binLen, at)
    out.writeUInt32LE(BIN_CHUNK, at + 4)
    bin.copy(out, at + 8)
  }
  return out
}

function keepAnimation(glb, index, name) {
  const anim = glb.json.animations?.[index]
  if (!anim) throw new Error(`glb: нет анимации #${index}`)
  // Сироты-аксессоры выброшенных клипов уберёт `gltf-transform prune`.
  glb.json.animations = [{ ...anim, name }]
  return glb
}

function addAnimation(target, source, index, name) {
  const anim = source.json.animations?.[index]
  if (!anim) throw new Error(`glb: нет анимации #${index}`)
  const t = target.json
  t.accessors ||= []
  t.bufferViews ||= []
  t.animations ||= []
  const byName = new Map((t.nodes || []).map((n, i) => [n.name, i]))
  let bin = target.bin
  const views = new Map()
  const accessors = new Map()

  const copyView = (vi) => {
    if (views.has(vi)) return views.get(vi)
    const bv = source.json.bufferViews[vi]
    const start = bv.byteOffset || 0
    const offset = pad4(bin.length)
    bin = Buffer.concat([bin, Buffer.alloc(offset - bin.length), source.bin.subarray(start, start + bv.byteLength)])
    const copy = { buffer: 0, byteOffset: offset, byteLength: bv.byteLength }
    if (bv.byteStride) copy.byteStride = bv.byteStride
    t.bufferViews.push(copy)
    views.set(vi, t.bufferViews.length - 1)
    return views.get(vi)
  }
  const copyAccessor = (ai) => {
    if (accessors.has(ai)) return accessors.get(ai)
    const acc = source.json.accessors[ai]
    if (acc.sparse) throw new Error('glb: разреженные аксессоры в анимации не поддержаны')
    t.accessors.push({ ...acc, bufferView: copyView(acc.bufferView) })
    accessors.set(ai, t.accessors.length - 1)
    return accessors.get(ai)
  }

  const samplers = anim.samplers.map((s) => ({ ...s, input: copyAccessor(s.input), output: copyAccessor(s.output) }))
  const channels = anim.channels
    .filter((c) => c.target.node !== undefined)
    .map((c) => {
      const bone = source.json.nodes[c.target.node]?.name
      const node = byName.get(bone)
      // Кости нет — риг другой, и клип дёргал бы не те суставы.
      if (node === undefined) throw new Error(`glb: кости «${bone}» нет в базовой модели — скелеты разные`)
      return { ...c, target: { ...c.target, node } }
    })
  t.animations.push({ name, samplers, channels })
  bin = Buffer.concat([bin, Buffer.alloc(pad4(bin.length) - bin.length)])
  t.buffers[0].byteLength = bin.length
  target.bin = bin
  return target
}

module.exports = { readGlb, writeGlb, keepAnimation, addAnimation }
