// Перенос клипа с одного скелета на другой — для бегуна Word Rush. Без
// внешних зависимостей, как glb.js рядом.
//
// Зачем (01.10.2026): клипы прыжка, подката и спотыкания Meshy отдал только
// на новом риге той же модели, а новый риг негоден — сетка урезана до 250
// треугольников (была 10 392), у кистей нет весов, кости позвоночника
// перепутаны (`neck` растёт из бёдер). Склейка по именам (addAnimation) тут
// не годится: у скелетов разные оси костей и даже разная цепочка, и
// локальные повороты одного на другом выворачивают суставы.
//
// Поэтому переносим не локальные повороты, а мировой поворот кости
// относительно её позы покоя: обе модели — одна и та же фигура в одной позе
// покоя, значит «бедро повернулось на столько-то в мире» одинаково значит для
// обоих скелетов, как бы ни были направлены их локальные оси:
//   Q_цель(t) = Q_источник(t) · Q_источник_покой⁻¹ · Q_цель_покой
// и обратно в локальный через мировой поворот родителя цели.

// Кватернионы glTF — [x, y, z, w].
function qmul(a, b) {
  const [ax, ay, az, aw] = a
  const [bx, by, bz, bw] = b
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

const qinv = ([x, y, z, w]) => [-x, -y, -z, w]

function qnorm(q) {
  const l = Math.hypot(...q) || 1
  return q.map((v) => v / l)
}

function slerp(a, b, k) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
  const s = d < 0 ? -1 : 1
  d *= s
  if (d > 0.9995) return qnorm(a.map((v, i) => v + (s * b[i] - v) * k))
  const th = Math.acos(d)
  const sa = Math.sin((1 - k) * th) / Math.sin(th)
  const sb = (s * Math.sin(k * th)) / Math.sin(th)
  return a.map((v, i) => v * sa + b[i] * sb)
}

const COMPONENTS = { SCALAR: 1, VEC3: 3, VEC4: 4 }

function readFloats(glb, index) {
  const acc = glb.json.accessors[index]
  if (acc.componentType !== 5126) throw new Error('retarget: в анимации ждём float-аксессоры')
  const n = COMPONENTS[acc.type]
  const bv = glb.json.bufferViews[acc.bufferView]
  const stride = bv.byteStride || n * 4
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const out = new Float32Array(acc.count * n)
  for (let i = 0; i < acc.count; i++) {
    for (let k = 0; k < n; k++) out[i * n + k] = glb.bin.readFloatLE(base + i * stride + k * 4)
  }
  return out
}

// Значение дорожки в момент t: LINEAR — интерполяция (повороты сферическая),
// STEP — последний ключ не позже t. До первого ключа и после последнего —
// крайние значения, как в three.js.
function sampler(glb, s, path) {
  const times = readFloats(glb, s.input)
  const values = readFloats(glb, s.output)
  const n = path === 'rotation' ? 4 : 3
  const at = (i) => Array.from(values.subarray(i * n, i * n + n))
  return (t) => {
    if (t <= times[0]) return at(0)
    const last = times.length - 1
    if (t >= times[last]) return at(last)
    let i = 0
    while (times[i + 1] < t) i++
    if (s.interpolation === 'STEP') return at(i)
    const k = (t - times[i]) / (times[i + 1] - times[i])
    if (path === 'rotation') return slerp(at(i), at(i + 1), k)
    return at(i).map((v, c) => v + (values[(i + 1) * n + c] - v) * k)
  }
}

function parents(json) {
  const out = new Array(json.nodes.length).fill(-1)
  json.nodes.forEach((n, i) => (n.children || []).forEach((c) => (out[c] = i)))
  return out
}

const restRot = (node) => node.rotation || [0, 0, 0, 1]

// Мировые повороты всех узлов при локальных `local(i)`. Масштаб узлов
// (Armature у Meshy — 0.01, равномерный) поворот не меняет.
function worldRotations(json, parent, local) {
  const out = new Array(json.nodes.length)
  const visit = (i) => {
    if (out[i]) return out[i]
    const q = local(i)
    out[i] = parent[i] < 0 ? q : qmul(visit(parent[i]), q)
    return out[i]
  }
  json.nodes.forEach((_, i) => visit(i))
  return out
}

function appendFloats(glb, data, type, withRange) {
  const json = glb.json
  const offset = (glb.bin.length + 3) & ~3
  const bytes = Buffer.alloc(data.length * 4)
  data.forEach((v, i) => bytes.writeFloatLE(v, i * 4))
  glb.bin = Buffer.concat([glb.bin, Buffer.alloc(offset - glb.bin.length), bytes])
  json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length })
  const acc = { bufferView: json.bufferViews.length - 1, componentType: 5126, count: data.length / COMPONENTS[type], type }
  // У входа (времён) min/max обязательны по спецификации glTF.
  if (withRange) Object.assign(acc, { min: [Math.min(...data)], max: [Math.max(...data)] })
  json.accessors.push(acc)
  return json.accessors.length - 1
}

// `map` — «кость цели → кость источника»; кость, которой в карте нет, ищется
// в источнике по тому же имени. Не нашлась — держит локальную позу покоя и
// просто едет за родителем (концевые кости вроде head_end).
// `root` — корень: ему кроме поворота переносится и смещение (в пространстве
// общего родителя Armature), остальные кости держат свою длину.
function retargetAnimation(target, source, index, name, { map = {}, root = 'Hips' } = {}) {
  const anim = source.json.animations?.[index]
  if (!anim) throw new Error(`retarget: нет анимации #${index}`)
  const tj = target.json
  const sj = source.json
  const tParent = parents(tj)
  const sParent = parents(sj)
  const sByName = new Map(sj.nodes.map((n, i) => [n.name, i]))
  const joints = tj.skins[0].joints

  const pairs = new Map()
  for (const j of joints) {
    const want = map[tj.nodes[j].name] ?? tj.nodes[j].name
    if (sByName.has(want)) pairs.set(j, sByName.get(want))
    else if (map[tj.nodes[j].name]) throw new Error(`retarget: кости «${want}» нет в источнике`)
  }
  const rootT = tj.nodes.findIndex((n) => n.name === root)
  const rootS = pairs.get(rootT)
  if (rootT < 0 || rootS === undefined) throw new Error(`retarget: корня «${root}» нет в одном из скелетов`)

  const tracks = new Map()
  let times = new Set()
  for (const c of anim.channels) {
    if (c.target.node === undefined || c.target.path === 'scale') continue
    const s = anim.samplers[c.sampler]
    tracks.set(`${c.target.node}.${c.target.path}`, sampler(source, s, c.target.path))
    readFloats(source, s.input).forEach((t) => times.add(t))
  }
  times = [...times].sort((a, b) => a - b)

  const sRest = worldRotations(sj, sParent, (i) => restRot(sj.nodes[i]))
  const tRest = worldRotations(tj, tParent, (i) => restRot(tj.nodes[i]))
  const sRootRest = sj.nodes[rootS].translation || [0, 0, 0]
  const tRootRest = tj.nodes[rootT].translation || [0, 0, 0]

  const rot = new Map(joints.map((j) => [j, []]))
  const pos = []
  for (const t of times) {
    const sWorld = worldRotations(sj, sParent, (i) => tracks.get(`${i}.rotation`)?.(t) ?? restRot(sj.nodes[i]))
    const tWorld = new Array(tj.nodes.length)
    const worldOf = (i) => {
      if (tWorld[i]) return tWorld[i]
      const p = tParent[i] < 0 ? [0, 0, 0, 1] : worldOf(tParent[i])
      const s = pairs.get(i)
      tWorld[i] = s === undefined ? qmul(p, restRot(tj.nodes[i])) : qmul(qmul(sWorld[s], qinv(sRest[s])), tRest[i])
      return tWorld[i]
    }
    for (const j of joints) {
      const p = tParent[j] < 0 ? [0, 0, 0, 1] : worldOf(tParent[j])
      let q = qnorm(qmul(qinv(p), worldOf(j)))
      // Соседние ключи — в одной полусфере, иначе интерполяция крутит сустав
      // длинной дорогой через полный оборот.
      const prev = rot.get(j).at(-1)
      if (prev && prev[0] * q[0] + prev[1] * q[1] + prev[2] * q[2] + prev[3] * q[3] < 0) q = q.map((v) => -v)
      rot.get(j).push(q)
    }
    const sp = tracks.get(`${rootS}.translation`)?.(t) ?? sRootRest
    pos.push(sp.map((v, c) => v - sRootRest[c] + tRootRest[c]))
  }

  tj.accessors ||= []
  tj.bufferViews ||= []
  tj.animations ||= []
  const input = appendFloats(target, times, 'SCALAR', true)
  const samplers = []
  const channels = []
  const add = (node, path, data, type) => {
    samplers.push({ input, output: appendFloats(target, data, type, false), interpolation: 'LINEAR' })
    channels.push({ sampler: samplers.length - 1, target: { node, path } })
  }
  for (const j of joints) add(j, 'rotation', rot.get(j).flat(), 'VEC4')
  add(rootT, 'translation', pos.flat(), 'VEC3')
  tj.animations.push({ name, samplers, channels })
  target.bin = Buffer.concat([target.bin, Buffer.alloc(((target.bin.length + 3) & ~3) - target.bin.length)])
  tj.buffers[0].byteLength = target.bin.length
  return target
}

module.exports = { retargetAnimation, qmul, qinv, slerp }
