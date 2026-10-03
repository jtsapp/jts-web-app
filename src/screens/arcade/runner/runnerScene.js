// Мир «Word Rush» на three.js: дорога в три полосы, сумеречный город, ворота
// с английскими словами и бегун. Модуль грузится динамическим импортом только
// с экрана игры: three.js не должен попадать в общий бандл приложения.
//
// Сцена правил не знает. Каждый кадр RunnerGame отдаёт снимок — дорожку,
// ряд, исход прохода, скорость — и сцена его только рисует. Правила живут в
// src/practice/arcade/runner/engine.js и проверяются тестами без WebGL.
//
// Бегун — модель Higgsfield (Meshy image→3D с авто-ригом): сетка, риг и бег —
// первой выгрузки, прыжок, подкат и спотыкание перенесены на её скелет с
// другого рига (scripts/retarget-runner-clips.js → runner-v3.glb; почему не
// склейка по именам — там же). Препятствия — тоже модели, вписанные в
// размер из правил. Монеты и молния турбо — кодом. Ворота и город строятся кодом: неоновая трубка светится
// без постобработки и перекрашивается одним color.setHex, а дома — одинаковые
// боксы с окнами, которые переезжают вперёд, когда уходят за камеру.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { INVULN, JUMP_TIME, LANES, SLIDE_TIME, SPAWN } from '../../../practice/arcade/runner/engine.js'
import { KINDS } from '../../../practice/arcade/runner/obstacles.js'

const BASE = '/arcade/runner'
const LANE_W = 2.4
const laneX = (lane) => (lane - (LANES - 1) / 2) * LANE_W
const ROAD_W = LANE_W * LANES + 1.2
const ROAD_LEN = 220
const ROAD_TILE = 8
const BLOCK = 10
const BLOCKS = 16
const RECYCLE_Z = 16
// Плитка окон на фасаде — 12 единиц мира, то есть окно полтора на полтора.
const WINDOW_TILE = 12
const GATE_W = LANE_W - 0.35
const GATE_H = 3.3
const RUNNER_HEIGHT = 1.8
// Подскок на промахе мимо ворот — кодом, как было; удар о препятствие играет
// свой клип (stumble).
const MISS_HOP = 0.6
// Дуга прыжка поверх клипа: Jump_Run подпрыгивает невысоко, а барьер должен
// читаться перепрыгнутым, а не пройденным насквозь. 0.7 не читались прыжком
// (жалоба владельца 01.10.2026) — теперь бегун поднимается выше шлагбаума.
const JUMP_ARC = 1.5
const FADE = 0.1
// Размер препятствия на сцене — из правил: барьер ниже дуги прыжка, автобус
// выше всего. Шлагбаум проходят и подкатом, и прыжком, поэтому перекладина
// (верхняя четверть модели) — между лежащим бегуном и дугой прыжка; на 1.7
// перепрыгнутый шлагбаум выглядел бы пройденным насквозь. Длина вдоль
// дороги — из движка (KINDS), иначе удар случался бы «в воздухе».
const OBSTACLE_SIZE = {
  barrier: { w: LANE_W - 0.5, h: 0.9 },
  boom: { w: LANE_W - 0.2, h: 1.25 },
  bus: { w: LANE_W - 0.3, h: 2.9 },
}
// На дороге разом — подход к текущему ряду и хвост прошлого: до четырёх
// одного вида. Не хватит экземпляра — препятствие стало бы невидимым, а удар
// о невидимое нечестен.
const POOL = 4
// Монет на дороге разом — две цепочки подхода и хвост прошлого.
const COIN_POOL = 24
const COIN_Y = 0.9
// Монета над барьером — на высоте дуги, где её берёт прыжок.
const COIN_HIGH_Y = COIN_Y + JUMP_ARC * 0.8
// Турбо: насколько расширяется угол камеры и сколько линий скорости.
const BOOST_FOV = 9
const STREAKS = 36
const BOOST_TONE = 0x5ff2ff
const POSES = ['run', 'jump', 'slide', 'stumble']
const SKY = 0x1c0d45
const FOG = 0x2d1570
const TONE = { idle: 0xb78bff, hit: 0x33e08a, miss: 0xff4d6d }
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`

export async function loadRunnerAssets() {
  const loader = new GLTFLoader()
  const [runner, barrier, boom, bus, skyline] = await Promise.all([
    loader.loadAsync(`${BASE}/runner-v3.glb`),
    // Препятствия обязательны, как и бегун: без модели препятствие невидимо,
    // а удар о невидимое нечестен — лучше честно не стартовать.
    loader.loadAsync(`${BASE}/barrier.glb`),
    loader.loadAsync(`${BASE}/boom.glb`),
    loader.loadAsync(`${BASE}/bus.glb`),
    // Панорама — украшение: без неё остаётся небо цветом, игра не ломается.
    new THREE.TextureLoader().loadAsync(`${BASE}/skyline.webp`).catch(() => null),
    // Надписи рисуются шрифтом страницы на canvas — без ожидания первые
    // таблички выходили бы системным шрифтом.
    document.fonts?.load('800 64px Manrope').catch(() => null),
  ])
  return { runner, skyline, obstacles: { barrier, boom, bus } }
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function roadTexture() {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#261d45'
    ctx.fillRect(0, 0, w, h)
    const px = (x) => ((x + ROAD_W / 2) / ROAD_W) * w
    // Края дороги — сплошной неон, между полосами — пунктир.
    ctx.fillStyle = '#c59bff'
    ctx.fillRect(px(-ROAD_W / 2 + 0.25) - 3, 0, 6, h)
    ctx.fillRect(px(ROAD_W / 2 - 0.25) - 3, 0, 6, h)
    ctx.fillStyle = 'rgba(214, 196, 255, 0.75)'
    for (let i = 1; i < LANES; i++) ctx.fillRect(px(laneX(i) - LANE_W / 2) - 2, h * 0.1, 4, h * 0.45)
  })
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, ROAD_LEN / ROAD_TILE)
  return texture
}

// Плитка фасада 8×8 окон. Тёплый свет в основном, изредка сиреневый и
// голубой: пёстрые окна на всю стену превращали город в конфетти.
function windowsTexture(seed) {
  let a = seed
  const rnd = () => (a = (a * 16807) % 2147483647) / 2147483647
  const lit = ['#ffd79a', '#ffd79a', '#ffc98a', '#d7c4ff', '#9fe8ff']
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#140a33'
    ctx.fillRect(0, 0, w, h)
    const cell = w / 8
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = rnd() < 0.38 ? lit[Math.floor(rnd() * lit.length)] : '#231650'
        ctx.fillRect(x * cell + 9, y * cell + 8, cell - 18, cell - 14)
      }
    }
  })
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

// Коробка дома с развёрткой в мировых единицах: окна одного размера на любой
// высоте. Общая коробка 1×1×1 со scale растягивала плитку по стене — у
// высоких домов окна выходили вытянутыми, у низких сплющенными.
function houseGeometry(width, height, depth) {
  const geo = new THREE.BoxGeometry(width, height, depth)
  const uv = geo.attributes.uv
  // Грани BoxGeometry по порядку: ±x, ±y, ±z — по четыре вершины.
  const faces = [
    [depth, height], [depth, height],
    [width, depth], [width, depth],
    [width, height], [width, height],
  ]
  faces.forEach(([u, v], face) => {
    for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, (uv.getX(i) * u) / WINDOW_TILE, (uv.getY(i) * v) / WINDOW_TILE)
  })
  return geo
}

const SIGN_W = 512
const SIGN_H = 220
const signFont = (px) => `800 ${px}px Manrope, system-ui, sans-serif`

// Кегль таблички: одной строкой, пока буквы крупные; фраза, не влезшая
// крупно, — двумя строками по пробелу ближе к середине; иначе одна строка
// мельче. Ширину таблички растить нельзя — соседние налезут друг на друга,
// поэтому читаемость берём высотой букв.
function layoutSign(ctx, text, maxW) {
  const fits = (lines, px) => {
    ctx.font = signFont(px)
    return lines.every((l) => ctx.measureText(l).width <= maxW)
  }
  for (let px = 128; px >= 76; px -= 4) if (fits([text], px)) return { lines: [text], px }
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index)
  if (spaces.length) {
    const mid = text.length / 2
    const cut = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a))
    const lines = [text.slice(0, cut), text.slice(cut + 1)]
    for (let px = 96; px >= 40; px -= 4) if (fits(lines, px)) return { lines, px }
  }
  for (let px = 72; px > 28; px -= 4) if (fits([text], px)) return { lines: [text], px }
  return { lines: [text], px: 28 }
}

// Табличка над воротами: тёмная плашка с неоновой рамкой.
function drawSign(canvas, text, tone) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(8, 8, w - 16, h - 16, 34)
  else ctx.rect(8, 8, w - 16, h - 16)
  ctx.fillStyle = 'rgba(20, 8, 52, 0.94)'
  ctx.fill()
  ctx.lineWidth = 9
  ctx.strokeStyle = tone
  ctx.stroke()
  const { lines, px } = layoutSign(ctx, text, w - 56)
  ctx.font = signFont(px)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const step = px * 1.05
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 + 4 + (i - (lines.length - 1) / 2) * step))
}

// Портал из одной трубки — прямоугольная арка со скруглёнными углами, как на
// картинке игры: левая стойка → верх → правая стойка.
function portalCurve(width, height, radius) {
  const hw = width / 2
  const v = (x, y) => new THREE.Vector3(x, y, 0)
  const path = new THREE.CurvePath()
  path.add(new THREE.LineCurve3(v(-hw, 0), v(-hw, height - radius)))
  path.add(new THREE.QuadraticBezierCurve3(v(-hw, height - radius), v(-hw, height), v(-hw + radius, height)))
  path.add(new THREE.LineCurve3(v(-hw + radius, height), v(hw - radius, height)))
  path.add(new THREE.QuadraticBezierCurve3(v(hw - radius, height), v(hw, height), v(hw, height - radius)))
  path.add(new THREE.LineCurve3(v(hw, height - radius), v(hw, 0)))
  return path
}

function makeGate(anisotropy) {
  const signHeight = (LANE_W - 0.2) * (SIGN_H / SIGN_W)
  const group = new THREE.Group()
  const curve = portalCurve(GATE_W, GATE_H, 0.45)
  const core = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 120, 0.08, 8, false),
    new THREE.MeshBasicMaterial({ color: TONE.idle }),
  )
  // Мягкое свечение вокруг трубки — вторая, толще и полупрозрачная.
  const glow = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 120, 0.22, 8, false),
    new THREE.MeshBasicMaterial({
      color: TONE.idle,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  const canvas = document.createElement('canvas')
  canvas.width = SIGN_W
  canvas.height = SIGN_H
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  // Надпись без тумана: слово читается, пока сами ворота ещё в дымке, —
  // на Very Hard иначе не хватало бы времени прочесть.
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(LANE_W - 0.2, signHeight),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false }),
  )
  sign.position.y = GATE_H + 0.25 + signHeight / 2
  group.add(core, glow, sign)
  return { group, core, glow, canvas, texture, text: '' }
}

function paint(gate, text, tone) {
  gate.text = text
  gate.core.material.color.setHex(tone)
  gate.glow.material.color.setHex(tone)
  drawSign(gate.canvas, text, hex(tone))
  gate.texture.needsUpdate = true
}

// Какой кусок клипа Meshy играть в позе и что делать с высотой бёдер. Клипы
// длиннее позы и сняты не под неё (разобрано по ключам бёдер 01.10.2026):
// - Jump_Run (2.1 с) начинается уже в воздухе, в 0.1–0.3 с — присед
//   приземления, дальше обычный бег. Берём присед и выход из него, а бёдра
//   держим на высоте бега: присед читается поджатыми в полёте ногами, высоту
//   даёт дуга JUMP_ARC.
// - slide_light (1.57 с) — весь подкат: опускание, скольжение, подъём.
// - sliding_stumble (11.4 с) — бег, падение с 3.4 с, лёжа, подъём. Берём
//   только начало падения; бёдра в этом клипе почему-то на 45 см выше бега —
//   опускаем их к высоте бега.
const CUTS = {
  jump: { from: 0.08, to: 0.6, hips: 'pin' },
  slide: { from: 0.03, to: 1.5, hips: 'keep' },
  stumble: { from: 3.4, to: 4.25, hips: 'keep' },
}

// Кусок клипа [from, to] в секундах, время с нуля. Дорожка без ключей в
// куске (постоянная) сохраняет своё первое значение.
function segment(clip, from, to) {
  const tracks = clip.tracks.map((track) => {
    const size = track.getValueSize()
    const times = []
    const values = []
    track.times.forEach((t, i) => {
      if (t < from || t > to) return
      times.push(t - from)
      for (let k = 0; k < size; k++) values.push(track.values[i * size + k])
    })
    if (!times.length) {
      times.push(0)
      values.push(...track.values.slice(0, size))
    }
    return new track.constructor(track.name, times, values)
  })
  return new THREE.AnimationClip(clip.name, to - from, tracks)
}

// Бёдра клипов Meshy уезжают вперёд (подкат — на 6.5 м) и вбок — бегун
// «уезжал» бы с дорожки: гасим горизонталь к первому кадру. Высоту ставим к
// высоте бега `baseY`: 'pin' — держим ровно на ней, 'keep' — сдвигаем, сохраняя
// движение (опускание в подкате). Ищем именно Hips: дорожка `.position` есть
// у каждой кости, и первая попавшаяся — не корень.
function anchorHips(clip, baseY, hips) {
  const track = clip.tracks.find((t) => t.name === 'Hips.position')
  if (!track) return clip
  const v = track.values
  const [x0, y0, z0] = [v[0], v[1], v[2]]
  for (let i = 0; i < v.length; i += 3) {
    v[i] = x0
    v[i + 1] = hips === 'pin' ? baseY : v[i + 1] - y0 + baseY
    v[i + 2] = z0
  }
  return clip
}

// Модель из image→3D стоит как получилось: разворачиваем длинной стороной
// куда надо (автобус — вдоль дороги, барьер и шлагбаум — поперёк) и вписываем
// в размер из правил, стоящей на земле и по центру своего отрезка дороги.
function fitObstacle(gltf, kind) {
  const model = gltf.scene
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  if ((kind === 'bus') !== size.z > size.x) {
    model.rotation.y = Math.PI / 2
    model.updateMatrixWorld(true)
    box.setFromObject(model)
    box.getSize(size)
  }
  const center = box.getCenter(new THREE.Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)
  const holder = new THREE.Group()
  holder.add(model)
  const { w, h } = OBSTACLE_SIZE[kind]
  holder.scale.set(w / (size.x || 1), h / (size.y || 1), KINDS[kind].len / (size.z || 1))
  return holder
}

function makeCoin() {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.07, 28),
    new THREE.MeshStandardMaterial({ color: 0xffc21a, emissive: 0xff9a00, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.3 }),
  )
  // Ребром к дороге, лицом к камере: так кружок читается и вдали.
  coin.rotation.x = Math.PI / 2
  const holder = new THREE.Group()
  holder.add(coin)
  return holder
}

function glowTexture(rgb) {
  return canvasTexture(64, 64, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    g.addColorStop(0, `rgba(${rgb}, 0.9)`)
    g.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, w)
  })
}

// Молния — плоский зигзаг с толщиной и ореол позади: отличается от монеты и
// формой, и цветом, даже когда оба вдали — пятнышки.
function makeBolt(glow) {
  const shape = new THREE.Shape()
  const pts = [[0.12, 0.55], [-0.28, -0.02], [-0.02, -0.02], [-0.14, -0.55], [0.28, 0.08], [0.02, 0.08]]
  shape.moveTo(...pts[0])
  for (const p of pts.slice(1)) shape.lineTo(...p)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false })
  geo.center()
  const bolt = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: BOOST_TONE }))
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glow, color: BOOST_TONE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  )
  halo.scale.setScalar(1.6)
  const holder = new THREE.Group()
  holder.add(halo, bolt)
  return holder
}

function makeRunner(gltf) {
  const model = gltf.scene
  // Скиннинг двигает вершины уже после проверки видимости: без этого бегун
  // пропадал бы, когда его покоящаяся рамка уходит за край кадра.
  model.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false
  })
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.scale.setScalar(RUNNER_HEIGHT / (size.y || 1))
  box.setFromObject(model)
  model.position.x -= (box.min.x + box.max.x) / 2
  model.position.z -= (box.min.z + box.max.z) / 2
  model.position.y -= box.min.y
  const hero = new THREE.Group()
  hero.add(model)
  // Модель смотрит в камеру (+Z) — разворачиваем спиной, лицом к дороге.
  hero.rotation.y = Math.PI
  // Клип RunFast у Meshy — бег на месте (бёдра качаются на пару сантиметров,
  // вперёд не уезжают; проверено по ключам), поэтому корень не трогаем: едет
  // мир, а не бегун. Клипы названы по позам при склейке; одноклиповый файл
  // без имён — это бег: так сцена переживёт и модель без клипов поз (правила
  // от них не зависят).
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]))
  if (!clips.run && gltf.animations[0]) clips.run = gltf.animations[0]
  const runHips = clips.run?.tracks.find((t) => t.name === 'Hips.position')
  const baseY = runHips ? runHips.values[1] : 0
  const mixer = new THREE.AnimationMixer(model)
  const actions = {}
  for (const name of POSES) {
    let clip = clips[name]
    if (!clip) continue
    const cut = CUTS[name]
    if (cut) clip = anchorHips(segment(clip, cut.from, Math.min(cut.to, clip.duration)), baseY, cut.hips)
    const action = mixer.clipAction(clip)
    if (name !== 'run') {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    }
    actions[name] = action
  }
  actions.run?.play()
  return { hero, mixer, actions }
}

export function createRunnerScene(canvas, assets) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY)
  scene.fog = new THREE.Fog(FOG, 26, SPAWN + 30)
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400)

  scene.add(new THREE.HemisphereLight(0xc7b2ff, 0x2a1466, 1.5))
  const sun = new THREE.DirectionalLight(0xffc49a, 1.6)
  sun.position.set(4, 10, 6)
  scene.add(sun)

  if (assets.skyline) {
    assets.skyline.colorSpace = THREE.SRGBColorSpace
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 200),
      new THREE.MeshBasicMaterial({ map: assets.skyline, fog: false, depthWrite: false }),
    )
    sky.position.set(0, 55, -230)
    scene.add(sky)
  }

  const roadTex = roadTexture()
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85 }),
  )
  road.rotation.x = -Math.PI / 2
  road.position.z = -ROAD_LEN / 2 + 12
  scene.add(road)
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x3b2a66, roughness: 0.9 })
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(4.6, ROAD_LEN), walkMat)
    walk.rotation.x = -Math.PI / 2
    walk.position.set(side * (ROAD_W / 2 + 2.3), 0.02, -ROAD_LEN / 2 + 12)
    scene.add(walk)
  }

  // Город: боксы с окнами по обе стороны, переезжают вперёд за камерой.
  const houseMats = [11, 23, 37].map(
    (seed) =>
      new THREE.MeshStandardMaterial({
        color: 0x2a1858,
        emissive: 0xffffff,
        emissiveMap: windowsTexture(seed),
        emissiveIntensity: 0.9,
        roughness: 0.8,
      }),
  )
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2150 })
  const lampGeo = new THREE.SphereGeometry(0.2, 12, 8)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd79a })
  const props = []
  const reroll = (house) => {
    const width = 4 + Math.random() * 3
    const height = 7 + Math.random() * 16
    house.geometry.dispose()
    house.geometry = houseGeometry(width, height, 8)
    house.position.y = height / 2
    house.position.x = Math.sign(house.position.x) * (ROAD_W / 2 + 4.2 + width / 2)
    house.material = houseMats[Math.floor(Math.random() * houseMats.length)]
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < BLOCKS; i++) {
      const house = new THREE.Mesh(new THREE.BufferGeometry(), houseMats[0])
      house.position.set(side, 0, -i * BLOCK)
      house.userData.reroll = () => reroll(house)
      reroll(house)
      scene.add(house)
      props.push(house)
      if (i % 2 === 0) {
        const lamp = new THREE.Group()
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.y = 1.7
        const bulb = new THREE.Mesh(lampGeo, lampMat)
        bulb.position.y = 3.45
        lamp.add(pole, bulb)
        lamp.position.set(side * (ROAD_W / 2 + 0.6), 0, -i * BLOCK - BLOCK / 2)
        scene.add(lamp)
        props.push(lamp)
      }
    }
  }

  const anisotropy = renderer.capabilities.getMaxAnisotropy()
  const rowGroup = new THREE.Group()
  const gates = [0, 1, 2].map((lane) => {
    const gate = makeGate(anisotropy)
    gate.group.position.x = laneX(lane)
    rowGroup.add(gate.group)
    return gate
  })
  rowGroup.visible = false
  scene.add(rowGroup)

  // Препятствия — по пулу экземпляров на вид: меши не создаются посреди
  // забега, клоны делят геометрию и материалы шаблона.
  const pools = {}
  for (const kind of Object.keys(OBSTACLE_SIZE)) {
    const template = fitObstacle(assets.obstacles[kind], kind)
    pools[kind] = Array.from({ length: POOL }, () => {
      const item = template.clone()
      item.visible = false
      scene.add(item)
      return item
    })
  }

  const coins = Array.from({ length: COIN_POOL }, () => {
    const coin = makeCoin()
    coin.visible = false
    scene.add(coin)
    return coin
  })
  const glow = glowTexture('95, 242, 255')
  const bolts = [0, 1].map(() => {
    const bolt = makeBolt(glow)
    bolt.visible = false
    scene.add(bolt)
    return bolt
  })

  // Турбо: линии скорости по сторонам и ореол вокруг бегуна. Видны, пока
  // `boostFade` > 0, — он плавно растёт и гаснет, а не мигает со снимком.
  const streakMat = new THREE.MeshBasicMaterial({
    color: BOOST_TONE,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const streakGeo = new THREE.BoxGeometry(0.035, 0.035, 4)
  const streaks = new THREE.Group()
  const respawnStreak = (m, z) => {
    const side = Math.random() < 0.5 ? -1 : 1
    m.position.set(side * (1.2 + Math.random() * 4), 0.3 + Math.random() * 3.6, z)
  }
  for (let i = 0; i < STREAKS; i++) {
    const m = new THREE.Mesh(streakGeo, streakMat)
    respawnStreak(m, -60 + Math.random() * 66)
    streaks.add(m)
  }
  streaks.visible = false
  scene.add(streaks)

  const { hero, mixer, actions } = makeRunner(assets.runner)
  scene.add(hero)
  const aura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.5, 2.1, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: BOOST_TONE,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  aura.position.y = 1
  aura.visible = false
  hero.add(aura)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.03
  scene.add(shadow)

  let rowKey = null
  let lastSeq = 0
  let runnerX = laneX(1)
  let hop = 0
  // Клип, который играет бегун, и поза движка в прошлом кадре: клип
  // запускается на смене, а не каждый кадр.
  let shown = 'run'
  let poseKey = 'run'
  let hitKey = 0
  let stumbleLeft = 0
  let baseFov = 58
  let boostFade = 0
  let spin = 0

  // Новый клип стартует с начала, старый гаснет за FADE. `seconds` подгоняет
  // длину клипа под позу движка: клип Meshy длится сколько длится, а прыжок в
  // правилах — 0.7 с.
  function play(name, seconds) {
    const to = actions[name]
    if (!to) return
    const from = actions[shown]
    to.reset()
    if (seconds) to.timeScale = to.getClip().duration / seconds
    to.play()
    if (from && from !== to) from.crossFadeTo(to, FADE, false)
    shown = name
  }

  function reset() {
    rowKey = null
    lastSeq = 0
    runnerX = laneX(1)
    hop = 0
    poseKey = 'run'
    hitKey = 0
    stumbleLeft = 0
    boostFade = 0
    if (shown !== 'run') play('run')
    hero.visible = true
    rowGroup.visible = false
    for (const kind in pools) for (const item of pools[kind]) item.visible = false
    for (const item of [...coins, ...bolts]) item.visible = false
  }

  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    const aspect = w / h
    // На узком экране (телефон стоя) крайние ворота не влезают в обычный
    // угол обзора: камера отъезжает и расширяет угол ровно настолько, чтобы
    // три дорожки были видны у ног бегуна.
    const dist = aspect < 1 ? 7.5 : 5.4
    const halfW = LANE_W + 1.2
    const vHalf = Math.max(Math.tan(THREE.MathUtils.degToRad(29)), halfW / (dist * aspect))
    baseFov = THREE.MathUtils.radToDeg(2 * Math.atan(vHalf))
    camera.fov = baseFov + boostFade * BOOST_FOV
    camera.aspect = aspect
    camera.position.set(0, aspect < 1 ? 3.6 : 2.8, dist)
    // Стоя взгляд выше: иначе нижняя треть кадра — пустой асфальт под бегуном.
    camera.lookAt(0, aspect < 1 ? 3 : 1.5, -12)
    camera.updateProjectionMatrix()
  }

  function render(snap, dt) {
    const v = snap.moving ? snap.speed : 0
    roadTex.offset.y = (roadTex.offset.y + (v * dt) / ROAD_TILE) % 1
    for (const p of props) {
      p.position.z += v * dt
      if (p.position.z > RECYCLE_Z) {
        p.position.z -= BLOCKS * BLOCK
        p.userData.reroll?.()
      }
    }

    if (snap.row) {
      if (snap.row.n !== rowKey) {
        rowKey = snap.row.n
        snap.row.options.forEach((word, i) => paint(gates[i], word, TONE.idle))
      }
      rowGroup.visible = true
      rowGroup.position.z = -snap.row.z
    } else if (rowGroup.visible) {
      // Пройденный ряд уезжает за камеру уже без движка.
      rowGroup.position.z += v * dt
      if (rowGroup.position.z > 8) rowGroup.visible = false
    }

    const last = snap.last
    if (last && last.seq !== lastSeq) {
      lastSeq = last.seq
      paint(gates[last.correct], gates[last.correct].text, TONE.hit)
      if (!last.hit) {
        paint(gates[last.lane], gates[last.lane].text, TONE.miss)
        hop = MISS_HOP
      }
    }

    // Препятствия: экземпляры из пула по видам, лишние спрятаны.
    const used = { barrier: 0, boom: 0, bus: 0 }
    for (const o of snap.obstacles || []) {
      // Дальше точки появления ворот не рисуем: препятствие выезжает из тумана
      // там же, где ряд, а не висит пятном цвета тумана на фоне неба.
      if (o.z > SPAWN) continue
      const item = pools[o.kind]?.[used[o.kind]++]
      if (!item) continue
      item.position.set(laneX(o.lane), 0, -(o.z + o.len / 2))
      item.rotation.set(0, 0, 0)
      if (o.smashed) {
        // Снесённое турбо отлетает вверх и в сторону, кувыркаясь, — по
        // пройденному после удара пути, без своего таймера.
        const k = Math.min(1, -o.z / 8)
        const side = o.lane === 1 ? 1 : Math.sign(o.lane - 1)
        item.position.x += side * k * 3
        item.position.y = Math.sin(k * Math.PI * 0.8) * 3
        item.rotation.set(-k * 3, 0, side * k * 1.5)
      }
    }
    for (const kind in pools) {
      pools[kind].forEach((item, i) => {
        item.visible = i < used[kind]
      })
    }

    // Монеты и молнии — так же из пулов. Взятая монета взлетает и тает
    // по пройденному после взятия пути, а не исчезает рывком.
    spin += dt * 4
    let usedCoins = 0
    let usedBolts = 0
    for (const p of snap.pickups || []) {
      if (p.z > SPAWN || (p.taken && p.z < -1.5)) continue
      const item = p.kind === 'boost' ? bolts[usedBolts++] : coins[usedCoins++]
      if (!item) continue
      const lift = p.taken ? -p.z * 1.4 : 0
      const y = p.kind === 'boost' ? 1.1 : p.high ? COIN_HIGH_Y : COIN_Y
      item.position.set(laneX(p.lane), y + lift + Math.sin(spin + p.id) * 0.06, -p.z)
      item.rotation.y = spin + p.id
      item.scale.setScalar(p.taken ? Math.max(0.01, 1 + p.z / 1.5) : 1)
    }
    coins.forEach((c, i) => (c.visible = i < usedCoins))
    bolts.forEach((b, i) => (b.visible = i < usedBolts))

    // Турбо: ореол, линии скорости, шире угол и быстрее ноги.
    const boost = snap.boost || 0
    boostFade += ((boost > 0 ? 1 : 0) - boostFade) * (1 - Math.exp(-dt * (boost > 0 ? 10 : 4)))
    if (boostFade < 0.01 && boost <= 0) boostFade = 0
    streaks.visible = aura.visible = boostFade > 0
    if (boostFade > 0) {
      streakMat.opacity = 0.75 * boostFade
      aura.material.opacity = (0.22 + 0.1 * Math.sin(spin * 3)) * boostFade
      // Линии летят быстрее мира — так скорость видна и боковым зрением.
      for (const m of streaks.children) {
        m.position.z += v * dt * 1.6
        if (m.position.z > 8) respawnStreak(m, -60 - Math.random() * 10)
      }
      // Последняя секунда турбо мигает ореолом: видно, что кончается.
      if (boost > 0 && boost < 1) aura.visible = Math.floor(boost * 8) % 2 === 0
    }
    const fov = baseFov + boostFade * BOOST_FOV
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // Клипы. Удар важнее позы: спотыкание начинается в кадре удара, хотя
    // движок в том же кадре вернул позу в бег.
    if (snap.lastHit && snap.lastHit.n !== hitKey) {
      hitKey = snap.lastHit.n
      stumbleLeft = INVULN
      play('stumble', INVULN)
    }
    const pose = snap.pose || 'run'
    if (pose !== poseKey) {
      poseKey = pose
      if (pose === 'jump') play('jump', JUMP_TIME)
      else if (pose === 'slide') play('slide', SLIDE_TIME)
      else if (stumbleLeft <= 0) play('run')
    }
    if (stumbleLeft > 0 && snap.moving) {
      stumbleLeft -= dt
      if (stumbleLeft <= 0 && poseKey === 'run') play('run')
    }

    const dx = laneX(snap.lane) - runnerX
    runnerX += dx * (1 - Math.exp(-dt * 14))
    hero.position.x = runnerX
    hero.rotation.z = THREE.MathUtils.clamp(dx * 0.12, -0.3, 0.3)
    let hopY = 0
    if (hop > 0) {
      hop = Math.max(0, hop - dt)
      const k = Math.sin((1 - hop / MISS_HOP) * Math.PI)
      hopY = k * 0.35
      hero.rotation.x = k * 0.25
    } else {
      hero.rotation.x = 0
    }
    const arc = poseKey === 'jump' ? Math.sin(Math.PI * Math.min(1, snap.posePhase || 0)) * JUMP_ARC : 0
    hero.position.y = hopY + arc
    // Неуязвимость видна миганием, как в аркадах: сквозь препятствия бегун
    // проходит, и без мигания это выглядело бы багом.
    hero.visible = !(snap.invuln > 0) || Math.floor(snap.invuln * 10) % 2 === 0
    shadow.position.x = runnerX
    shadow.scale.setScalar(1 - Math.min(0.5, arc * 0.6))
    // Темп бега — от скорости забега; клипы поз идут своим темпом из play().
    if (actions.run) actions.run.timeScale = (0.75 + 0.35 * (snap.speedMul || 1)) * (1 + 0.3 * boostFade)
    mixer.update(snap.moving ? dt : 0)
    camera.position.x = runnerX * 0.35
    renderer.render(scene, camera)
  }

  // Без явного освобождения каждый заход на экран оставлял бы в памяти
  // видеокарты текстуры и буферы прошлого — телефон начинал тормозить.
  function dispose() {
    mixer.stopAllAction()
    scene.traverse((o) => {
      o.geometry?.dispose()
      const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const m of materials) {
        for (const value of Object.values(m)) if (value?.isTexture) value.dispose()
        m.dispose()
      }
    })
    // Материалы домов — отдельно: тот, что сейчас не выпал ни одному дому,
    // обход сцены не найдёт. Повторный dispose у уже найденных безвреден.
    houseMats.forEach((m) => {
      m.emissiveMap?.dispose()
      m.dispose()
    })
    renderer.dispose()
    renderer.forceContextLoss()
  }

  return { render, resize, reset, dispose }
}
