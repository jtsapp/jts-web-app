// Орб Джарвиса: сферическая сеть «солнечного» света на canvas 2D, без библиотек.
//
// Ported from the Jarvis project (static/orb.js) — геометрия, палитра и формулы
// амплитуды перенесены один в один, менять их числа наугад не нужно: они
// подобраны на глаз и вместе дают именно тот орб, что в оригинале.
//
// Три отличия от исходника, без которых он не живёт внутри SPA:
//  1. rAF отменяемый. В оригинале петля запускалась навсегда и после ухода с
//     экрана продолжала жечь кадры — здесь id хранится и гасится в destroy().
//  2. Размер из вёрстки, а не константа 300px. Канва пересчитывается через
//     setSize (как у avatarEngine): на мобилке и на дашборде бокс разный.
//  3. Звук приходит СНАРУЖИ. Оригинал сам открывал getUserMedia и имитировал
//     речь через SpeechSynthesis; в звонке и микрофон, и голос тьютора уже
//     подключены (LiveKit), второй запрос разрешения был бы лишним.
//
// Про «эмоции» орб не знает ничего — у него четыре состояния (idle / listening /
// thinking / speaking), и это осознанно: у Джарвиса нет лица, есть свечение.

// Узлов на сфере и рёбер на узел. N меняет плотность сети, K — её «связность»;
// при K > 3 сфера превращается в сплошное пятно.
const N = 130
const K = 3

// Эталонный бокс, под который подобраны BASE_R и FOV. Реальный размер берётся
// из вёрстки, а все радиусы масштабируются от этой пары.
const REF_SIZE = 300
const REF_R = 64

// Тёплая палитра «солнечного света»: тыл → фронт по глубине, плюс цвет рёбер.
const DEEP = [194, 78, 0]
const HOT = [255, 208, 138]
const EDGE = [255, 140, 55]

// Точки на сфере по Фибоначчи — равномерно, без сгущения у полюсов, которое
// даёт наивная сетка по широте/долготе.
function fibSphere(n) {
  const pts = []
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = ga * i
    pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r })
  }
  return pts
}

// Рёбра: K ближайших соседей по УГЛОВОЙ близости (скалярное произведение), а не
// по расстоянию в проекции — иначе сеть рвалась бы при вращении.
function buildEdges(pts) {
  const seen = new Set()
  const edges = []
  for (let i = 0; i < pts.length; i++) {
    const dots = []
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue
      dots.push([pts[i].x * pts[j].x + pts[i].y * pts[j].y + pts[i].z * pts[j].z, j])
    }
    dots.sort((a, b) => b[0] - a[0])
    for (let k = 0; k < K; k++) {
      const j = dots[k][1]
      const key = i < j ? `${i}_${j}` : `${j}_${i}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([i, j])
    }
  }
  return edges
}

// Геометрия одна на все инстансы: она не зависит ни от размера, ни от состояния,
// а buildEdges — это O(N² log N), и гонять его на каждый монтаж незачем.
const PTS = fibSphere(N)
const EDGES = buildEdges(PTS)

export default class JarvisOrbEngine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.reduced = Boolean(opts.reducedMotion)
    // Оригинальный орб занимал весь экран, у нас он аватар внутри бокса и по
    // исходной пропорции (64 из 300) читался заметно мельче соседних аватарок.
    // Множитель поднимает сферу до ~0.55 бокса — как форма у TutorFace. Выше
    // 1.4 свечение начинает упираться в край канвы и обрезается квадратом.
    this.scale = opts.scale || 1.3

    this.state = 'idle'
    this.level = 0 // сглаженная амплитуда 0..1
    this.target = 0
    this.kickV = 0 // затухающий импульс на границе слова
    this.inputLevel = 0 // уровень микрофона ученика, приходит снаружи
    this.ay = 0 // накопленный угол вращения
    this.t = 0
    this.last = 0
    this.running = true

    this.analyser = null
    this.audioBuf = null

    this.size = 0
    this.setSize(opts.size || REF_SIZE)

    this._loop = this._loop.bind(this)
    this.raf = requestAnimationFrame(this._loop)
  }

  setSize(size, dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1) {
    // dpr режем на 2: на 3x-телефоне сфера из 130 узлов и ~300 рёбер начинает
    // ронять кадры, а разницы на глаз уже нет.
    const d = Math.min(dpr, 2)
    const px = Math.max(1, Math.round(size * d))
    if (this.size === size && this.canvas.width === px) return
    this.size = size
    this.canvas.width = px
    this.canvas.height = px
    this.canvas.style.width = `${size}px`
    this.canvas.style.height = `${size}px`
    this.ctx.setTransform(d, 0, 0, d, 0, 0)
    this.CX = size / 2
    this.CY = size / 2
    this.baseR = ((size * REF_R) / REF_SIZE) * this.scale
    // Мягкая перспектива: при FOV = 6R передний план почти не раздувается, и
    // сфера читается сферой, а не воронкой.
    this.fov = 6 * this.baseR
  }

  /** 'idle' | 'listening' | 'thinking' | 'speaking' */
  setState(s) {
    this.state = s || 'idle'
  }

  /** Уровень микрофона ученика 0..1 — считается в звонке (см. micLevel.js). */
  setInputLevel(v) {
    this.inputLevel = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
  }

  /** Анализатор голоса ТЬЮТОРА: орб пульсирует по реальной речи, а не по таймеру. */
  attachAnalyser(analyser) {
    this.analyser = analyser || null
    this.audioBuf = analyser ? new Uint8Array(analyser.fftSize) : null
  }

  /** Короткий толчок — например, на начало реплики. */
  kick(strength = 0.5) {
    this.kickV = Math.min(1, this.kickV + strength)
  }

  setReducedMotion(on) {
    this.reduced = Boolean(on)
  }

  /** Пауза для скрытой вкладки: rAF засыпает и сам, но экран может быть виден. */
  setPaused(paused) {
    if (paused === !this.running) return
    this.running = !paused
    if (this.running) {
      this.last = 0
      this.raf = requestAnimationFrame(this._loop)
    }
  }

  destroy() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.analyser = null
    this.audioBuf = null
  }

  // RMS по временной форме, как в оригинале: она реагирует на громкость, а не
  // на тембр, и потому не «звенит» на шипящих.
  _audioLevel() {
    if (!this.analyser) return null
    this.analyser.getByteTimeDomainData(this.audioBuf)
    let sum = 0
    for (let i = 0; i < this.audioBuf.length; i++) {
      const v = (this.audioBuf[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / this.audioBuf.length) // ~0..0.5
    return Math.min(1, rms * 3.2)
  }

  _loop(now) {
    if (!this.running) return
    // Реальный dt, а не фиксированные 16мс: на 120-герцовом экране орб иначе
    // крутится вдвое быстрее, а после лага вкладки прыгает.
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016
    this.last = now
    this._tick(dt)
    this._render()
    this.raf = requestAnimationFrame(this._loop)
  }

  _tick(dt) {
    this.t += dt
    const t = this.t

    if (this.state === 'listening') {
      // Пол свечения: орб заметно разгорается, едва человек начал говорить,
      // иначе тихая речь выглядит как «не слышит».
      const m = this.inputLevel > 0 ? this.inputLevel : null
      this.target =
        m == null ? 0.42 + 0.16 * (Math.sin(t * 5) * 0.5 + 0.5) : Math.max(0.38, m)
    } else if (this.state === 'thinking') {
      this.target = 0.46 + 0.12 * (Math.sin(t * 2.4) * 0.5 + 0.5)
    } else if (this.state === 'speaking') {
      const real = this._audioLevel()
      // Реальная амплитуда лучше синтетики, но у неё есть провалы между
      // словами — держим низ, чтобы орб не гас посреди фразы.
      const s =
        real == null
          ? 0.36 + 0.24 * Math.abs(Math.sin(t * 7.3)) + 0.14 * Math.abs(Math.sin(t * 3.1 + 1.7))
          : Math.max(0.36, real)
      this.target = Math.min(1, s + this.kickV)
    } else {
      this.target = 0
    }

    this.kickV *= Math.pow(0.001, dt)
    this.level += (this.target - this.level) * Math.min(1, dt * 12)
    if (!this.reduced) this.ay += dt * (0.55 + 1.6 * this.level)
  }

  _render() {
    const ctx = this.ctx
    if (!ctx) return
    const { CX, CY, size } = this
    // Вся декоративная механика ходит по mt: в reduced-motion он стоит, и орб
    // остаётся статичной сферой, которая всё ещё реагирует на голос яркостью.
    const mt = this.reduced ? 0 : this.t

    const breath = Math.sin(mt * 1.6) * 0.5 + 0.5
    const R = this.baseR * (1 + 0.03 * breath + 0.45 * this.level)

    const ax = Math.sin(mt * 0.5) * 0.28
    const cY = Math.cos(this.ay)
    const sY = Math.sin(this.ay)
    const cX = Math.cos(ax)
    const sX = Math.sin(ax)

    const P = new Array(N)
    for (let i = 0; i < N; i++) {
      const p = PTS[i]
      const x1 = p.x * cY + p.z * sY
      const z1 = -p.x * sY + p.z * cY
      const y2 = p.y * cX - z1 * sX
      const z2 = p.y * sX + z1 * cX
      const persp = this.fov / (this.fov - z2 * R)
      P[i] = { sx: CX + x1 * R * persp, sy: CY + y2 * R * persp, depth: (z2 + 1) / 2 }
    }

    ctx.clearRect(0, 0, size, size)

    // Фоновое свечение ядра — рисуется ДО lighter, иначе оно засветит фон
    // карточки вместо того, чтобы лечь под сеть.
    const glowR = R * 1.95
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, glowR)
    const a = 0.28 + 0.66 * this.level
    g.addColorStop(0, `rgba(255,165,75,${a.toFixed(3)})`)
    g.addColorStop(0.42, 'rgba(255,120,40,0.12)')
    g.addColorStop(1, 'rgba(255,110,30,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(CX, CY, glowR, 0, Math.PI * 2)
    ctx.fill()

    // Аддитивное смешивание — то самое «свечение», ради которого орб и рисуется
    // руками: пересечения рёбер сами становятся ярче.
    ctx.globalCompositeOperation = 'lighter'

    for (let e = 0; e < EDGES.length; e++) {
      const A = P[EDGES[e][0]]
      const B = P[EDGES[e][1]]
      const d = (A.depth + B.depth) / 2
      const al = (0.06 + d * d * 0.42) * (0.65 + 0.5 * this.level)
      ctx.strokeStyle = `rgba(${EDGE[0]},${EDGE[1]},${EDGE[2]},${al.toFixed(3)})`
      ctx.lineWidth = 0.6 + d * 0.9
      ctx.beginPath()
      ctx.moveTo(A.sx, A.sy)
      ctx.lineTo(B.sx, B.sy)
      ctx.stroke()
    }

    for (let i = 0; i < N; i++) {
      const p = P[i]
      const d = p.depth
      const r = 0.7 + d * 1.9
      const cr = Math.round(DEEP[0] + (HOT[0] - DEEP[0]) * d)
      const cg = Math.round(DEEP[1] + (HOT[1] - DEEP[1]) * d)
      const cb = Math.round(DEEP[2] + (HOT[2] - DEEP[2]) * d)
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.25 + d * 0.75).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const coreR = R * (0.16 + 0.1 * this.level)
    const core = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR)
    core.addColorStop(0, 'rgba(255,240,210,0.95)')
    core.addColorStop(0.5, 'rgba(255,170,80,0.55)')
    core.addColorStop(1, 'rgba(255,140,50,0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(CX, CY, coreR, 0, Math.PI * 2)
    ctx.fill()

    // Вернуть режим обязательно: следующий кадр начинается с clearRect + фона,
    // и в lighter фон бы не стёрся.
    ctx.globalCompositeOperation = 'source-over'
  }
}
