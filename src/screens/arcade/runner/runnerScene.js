// Мир «Word Rush» на three.js: дорога в три полосы, сумеречный город, ворота
// с английскими словами и бегун. Модуль грузится динамическим импортом только
// с экрана игры: three.js не должен попадать в общий бандл приложения.
//
// Сцена правил не знает. Каждый кадр RunnerGame отдаёт снимок — дорожку,
// ряд, исход прохода, скорость — и сцена его только рисует. Правила живут в
// src/practice/arcade/runner/engine.js и проверяются тестами без WebGL.
//
// Бегун — модель Higgsfield (Meshy image→3D с авто-ригом и клипом бега),
// ворота и город строятся кодом: неоновая трубка светится без постобработки
// и перекрашивается одним color.setHex, а дома — одинаковые боксы с окнами,
// которые переезжают вперёд, когда уходят за камеру.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { LANES, SPAWN } from '../../../practice/arcade/runner/engine.js'

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
const STUMBLE = 0.6
const SKY = 0x1c0d45
const FOG = 0x2d1570
const TONE = { idle: 0xb78bff, hit: 0x33e08a, miss: 0xff4d6d }
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`

export async function loadRunnerAssets() {
  const [runner, skyline] = await Promise.all([
    new GLTFLoader().loadAsync(`${BASE}/runner.glb`),
    // Панорама — украшение: без неё остаётся небо цветом, игра не ломается.
    new THREE.TextureLoader().loadAsync(`${BASE}/skyline.webp`).catch(() => null),
    // Надписи рисуются шрифтом страницы на canvas — без ожидания первые
    // таблички выходили бы системным шрифтом.
    document.fonts?.load('800 64px Manrope').catch(() => null),
  ])
  return { runner, skyline }
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

// Табличка над воротами: тёмная плашка с неоновой рамкой, слово ужимается
// по ширине — у C1 бывают `environmentally friendly`.
function drawSign(canvas, text, tone) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(8, 8, w - 16, h - 16, 30)
  else ctx.rect(8, 8, w - 16, h - 16)
  ctx.fillStyle = 'rgba(20, 8, 52, 0.92)'
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = tone
  ctx.stroke()
  let size = 84
  const font = (px) => `800 ${px}px Manrope, system-ui, sans-serif`
  ctx.font = font(size)
  while (ctx.measureText(text).width > w - 60 && size > 26) {
    size -= 4
    ctx.font = font(size)
  }
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2 + 4)
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
  canvas.width = 512
  canvas.height = 150
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  // Надпись без тумана: слово читается, пока сами ворота ещё в дымке, —
  // на Very Hard иначе не хватало бы времени прочесть.
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(LANE_W - 0.2, (LANE_W - 0.2) * (150 / 512)),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false }),
  )
  sign.position.y = GATE_H + 0.55
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
  // мир, а не бегун.
  let mixer = null
  const clip = gltf.animations[0]
  if (clip) {
    mixer = new THREE.AnimationMixer(model)
    mixer.clipAction(clip).play()
  }
  return { hero, mixer }
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

  const { hero, mixer } = makeRunner(assets.runner)
  scene.add(hero)
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
  let stumble = 0

  function reset() {
    rowKey = null
    lastSeq = 0
    runnerX = laneX(1)
    stumble = 0
    rowGroup.visible = false
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
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(vHalf))
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
        stumble = STUMBLE
      }
    }

    const dx = laneX(snap.lane) - runnerX
    runnerX += dx * (1 - Math.exp(-dt * 14))
    hero.position.x = runnerX
    hero.rotation.z = THREE.MathUtils.clamp(dx * 0.12, -0.3, 0.3)
    if (stumble > 0) {
      stumble = Math.max(0, stumble - dt)
      const k = Math.sin((1 - stumble / STUMBLE) * Math.PI)
      hero.position.y = k * 0.35
      hero.rotation.x = k * 0.25
    } else {
      hero.position.y = 0
      hero.rotation.x = 0
    }
    shadow.position.x = runnerX
    mixer?.update(snap.moving ? dt * (0.75 + 0.35 * (snap.speedMul || 1)) : 0)
    camera.position.x = runnerX * 0.35
    renderer.render(scene, camera)
  }

  // Без явного освобождения каждый заход на экран оставлял бы в памяти
  // видеокарты текстуры и буферы прошлого — телефон начинал тормозить.
  function dispose() {
    mixer?.stopAllAction()
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
