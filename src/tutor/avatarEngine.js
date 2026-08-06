// Движок аватара тьютора: один canvas, requestAnimationFrame, без библиотек.
// Порт демо-стенда из плана (tutor-avatar.html) с тремя добавками под прод:
// масштабирование под размер бокса, offscreen-слой градиента и режим
// prefers-reduced-motion.
//
// Про эмоции движок не знает НИЧЕГО: он интерполирует числа из пресета
// (avatarEmotions.js) к текущему состоянию. Новая эмоция = строка в словаре.

import { EMOTIONS, LERP_KEYS, FX_KEYS } from './avatarEmotions.js'

// Эталонный радиус, под который подобраны все числа пресетов и геометрии лица.
const REF_R = 150

// Постоянные времени перехода между эмоциями, в секундах (сходимость ≈ 3·tau).
// Цвет медленнее геометрии осознанно: у Декстера эмоция прилетает почти на
// каждую реплику, и скачок кармин→циан за те же 200мс, что и смена мимики,
// читается как мигание светофора. Мимика при этом должна успевать за смыслом,
// поэтому её не тормозим. Ту же логику («основное движение быстро, доводка
// медленно») раньше делала CSS-кривая свечения рамки на 1400мс.
const TAU_SHAPE = 0.26
const TAU_COLOR = 0.55
// Насколько сильно сила эмоции (1-3) двигает подвижность. Шкала мягкая: на
// глаз это «чуть тише / чуть бодрее», а не три разных персонажа.
const INTENSITY_GAIN = { 1: 0.75, 2: 1, 3: 1.3 }

// Нейтральное значение ключа, если пресет его не задал. Для МНОЖИТЕЛЕЙ это
// единица, а не ноль: пресет без eyeW когда-то давал ширину глаза 0, и на
// listening/thinking глаза просто исчезали с лица.
const KEY_DEFAULTS = { eyeH: 1, eyeW: 1, speed: 1 }

const lerp = (a, b, f) => a + (b - a) * f
const get = (o, k, d) => (o[k] === undefined ? d : o[k])
const neutral = (k) => KEY_DEFAULTS[k] || 0

export default class TutorAvatar {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    this.INK = opts.ink || '#221046'
    this.reduced = Boolean(opts.reducedMotion)
    this.onChange = opts.onChange || null

    this.target = EMOTIONS.idle
    this.state = { ...EMOTIONS.idle, c1: [...EMOTIONS.idle.c1], c2: [...EMOTIONS.idle.c2] }
    this.key = 'idle'
    this.gain = 1

    this.t = 0
    this.phase = 0
    this.blink = 0
    this.nextBlink = 2.4
    this.voiceEnv = 0
    this.voiceTarget = 0
    this.voiceTick = 0
    // Речь — не эмоция, а СЛОЙ поверх неё: говорить умеет любое выражение.
    // Раньше на время реплики лицо подменялось пресетом talking, и эмоция,
    // которую пометил агент, показывалась только ПОСЛЕ озвучки — то есть ровно
    // тогда, когда тьютор уже молчал. speak — сглаженные 0..1, чтобы рот
    // закрывался плавно, а не обрубался на конце фразы.
    this.speak = 0
    this.speakTarget = 0
    this.popT = 0
    this.analyser = null
    this.audioBuf = null
    this.running = true
    this.frame = 0
    this.last = 0

    // Дрейфующие пятна градиента внутри формы. Координаты — в эталонных
    // единицах (R=150), масштабируются вместе с k.
    this.orbs = [
      { x: -60, y: -55, r: 120, a: 0.3, b: 0.21, p: 0 },
      { x: 65, y: -30, r: 105, a: 0.25, b: 0.29, p: 2.1 },
      { x: -30, y: 70, r: 130, a: 0.19, b: 0.24, p: 4.2 },
      { x: 60, y: 60, r: 95, a: 0.33, b: 0.17, p: 1.1 },
    ]
    // Конфетти детерминированное, без Math.random: одинаковая картинка при
    // каждом монтировании экрана — иначе на скриншотах и в отладке пляшет.
    this.confetti = Array.from({ length: 16 }, (_, i) => ({
      a: (i * 2.399) % 6.283,
      r: (i * 0.618) % 1,
      s: 0.6 + ((i * 0.37) % 1) * 0.9,
      h: (i * 0.43) % 1,
    }))

    this.setSize(opts.size || 300)
    this._loop = this._loop.bind(this)
    this.raf = requestAnimationFrame(this._loop)
  }

  /** Размер бокса в CSS-пикселях. Всё лицо пересчитывается от него. */
  setSize(size, dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1) {
    const px = Math.max(1, Math.round(size * dpr))
    if (this.size === size && this.canvas.width === px) return
    this.size = size
    this.dpr = dpr
    this.canvas.width = px
    this.canvas.height = px
    this.canvas.style.width = size + 'px'
    this.canvas.style.height = size + 'px'
    this.W = size
    this.H = size
    this.CX = size / 2
    this.CY = size / 2
    // R — это ДИАМЕТР формы, а не радиус: так считает формула дыхания
    // (sx = R * (2 - sq), радиус эллипса = sx / 2). Имя досталось от демо-стенда,
    // и переименовать его нельзя, не пересчитав все числа пресетов, которые
    // подобраны под R = 150.
    //
    // Форма занимает ~2/3 бокса. Остальное — прозрачное поле по краям: там
    // лежит мягкая тень и летит конфетти, и обрезать их канвой нельзя.
    // В вёрстке это поле съедается отрицательным margin (см. .t-voice__face).
    this.R = size * 0.636
    this.pad = size * 0.5 - this.R * 0.5
    this.k = this.R / REF_R
    this.eyeY = -18 * this.k
    this.mouthY = 34 * this.k
    this.eyeSpread = 44 * this.k
    this._initBlobLayer()
  }

  /**
   * Тяжёлое место рендера — blur(34px) на четырёх градиентах. Считаем его
   * в offscreen-канве половинного разрешения и раз в три кадра: пятна
   * дрейфуют медленно, на глаз разницы нет, а на слабом Android это разница
   * между 60 и 25 fps.
   */
  _initBlobLayer() {
    if (typeof document === 'undefined') return
    this.blobScale = 0.5
    this.blobSpan = this.R * 2.2 // с запасом: пятна выходят за форму, их режет клип
    const px = Math.max(1, Math.round(this.blobSpan * this.blobScale * this.dpr))
    this.blob = this.blob || document.createElement('canvas')
    this.blob.width = px
    this.blob.height = px
    this.blobCtx = this.blob.getContext('2d')
    this.frame = 0 // следующий кадр перерисует слой
  }

  setEmotion(key, intensity = 2) {
    const preset = EMOTIONS[key]
    if (!preset) {
      console.warn('[TutorAvatar] неизвестная эмоция:', key)
      return
    }
    const gain = INTENSITY_GAIN[intensity] || 1
    if (this.target !== preset || this.gain !== gain) this.popT = 1
    this.target = preset
    this.key = key
    this.gain = gain
    if (this.onChange) this.onChange(key, preset)
  }

  /** AnalyserNode с голосом тьютора: рот открывается по реальной амплитуде. */
  attachAnalyser(analyser) {
    this.analyser = analyser || null
    this.audioBuf = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
  }

  /** Тьютор сейчас говорит. Ортогонально эмоции: мимику не трогает, только рот. */
  setSpeaking(on) {
    this.speakTarget = on ? 1 : 0
  }

  setReducedMotion(on) {
    this.reduced = Boolean(on)
  }

  /** Пауза для скрытой вкладки: rAF и так засыпает, но экран может быть виден. */
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
    this.analyser = null
  }

  _audioLevel() {
    if (!this.analyser) return null
    this.analyser.getByteFrequencyData(this.audioBuf)
    let sum = 0
    const n = Math.min(48, this.audioBuf.length)
    for (let i = 0; i < n; i++) sum += this.audioBuf[i]
    return Math.min(1, sum / n / 110)
  }

  _loop(now) {
    if (!this.running) return
    // Реальный dt, а не фиксированные 16мс: на 120-герцовом экране картинка
    // иначе едет вдвое быстрее, а после лага вкладки прыгает.
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016
    this.last = now
    this._tick(dt)
    this._render()
    this.raf = requestAnimationFrame(this._loop)
  }

  _tick(dt) {
    this.t += dt
    this.popT = Math.max(0, this.popT - dt * 1.9)

    const live = this._audioLevel()
    // Признак речи берём из setSpeaking, а не из пресета эмоции: пресета
    // «говорит» больше нет, говорить может любая эмоция.
    const voice = this.speakTarget
    if (live !== null && voice > 0) {
      this.voiceEnv = lerp(this.voiceEnv, live, 0.4)
    } else {
      // Без анализатора рот всё равно должен шевелиться: имитация амплитуды.
      this.voiceTick -= dt
      if (this.voiceTick <= 0) {
        this.voiceTarget = voice > 0 ? (Math.random() < 0.18 ? 0.05 : 0.4 + Math.random() * 0.6) : 0
        this.voiceTick = 0.1 + Math.random() * 0.09
      }
      this.voiceEnv = lerp(this.voiceEnv, this.voiceTarget, 0.28)
    }

    // Экспоненциальное сглаживание с шагом по РЕАЛЬНОМУ dt: на 120Гц переход
    // обязан длиться столько же, сколько на 60Гц, а после лага вкладки не
    // прыгать. Линейный шаг (dt * const) этого не даёт — он ломается на
    // больших dt, поэтому именно 1 - e^(-dt/tau).
    const s = this.state
    const tg = this.target
    const fShape = 1 - Math.exp(-dt / TAU_SHAPE)
    const fColor = 1 - Math.exp(-dt / TAU_COLOR)
    LERP_KEYS.forEach((k) => {
      const d = neutral(k)
      s[k] = lerp(get(s, k, d), get(tg, k, d), fShape)
    })
    FX_KEYS.forEach((k) => {
      s[k] = lerp(get(s, k, 0), get(tg, k, 0), fShape)
    })
    for (let i = 0; i < 3; i++) {
      s.c1[i] = lerp(s.c1[i], tg.c1[i], fColor)
      s.c2[i] = lerp(s.c2[i], tg.c2[i], fColor)
    }
    s.mouth = tg.mouth
    this.speak = lerp(this.speak, this.speakTarget, fShape)

    // Фазу дыхания КОПИМ, а не считаем как sin(t * speed): при смене эмоции
    // speed меняется, и в такой формуле вместе с ним скачком меняется весь
    // аргумент синуса — шар дёргается и может пойти назад. Накопленная фаза
    // при смене скорости остаётся непрерывной.
    if (!this.reduced) this.phase += dt * 2.2 * s.speed * this.gain

    if (this.reduced) return
    this.blink -= dt
    if (this.blink < -0.14) {
      this.nextBlink -= dt
      if (this.nextBlink <= 0) {
        this.blink = 0.14
        this.nextBlink = 2.2 + Math.random() * 3.2
      }
    }
  }

  _rgb(c) {
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
  }

  _rgba(c, a) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
  }

  _caps(x, y, w, h, r) {
    const ctx = this.ctx
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + rr, y - h / 2)
    ctx.lineTo(x + w / 2 - rr, y - h / 2)
    ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + rr)
    ctx.lineTo(x + w / 2, y + h / 2 - rr)
    ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - rr, y + h / 2)
    ctx.lineTo(x - w / 2 + rr, y + h / 2)
    ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - rr)
    ctx.lineTo(x - w / 2, y - h / 2 + rr)
    ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + rr, y - h / 2)
    ctx.closePath()
  }

  _paintBlobLayer(mt) {
    const ctx = this.blobCtx
    if (!ctx) return
    const s = this.state
    const px = this.blob.width
    const half = px / 2
    const u = (px / this.blobSpan) // эталонная единица → пиксель слоя
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, px, px)
    ctx.filter = `blur(${34 * this.k * u}px)`
    this.orbs.forEach((o, i) => {
      const ox = half + (o.x * this.k + Math.sin(mt * o.a + o.p) * 46 * this.k) * u
      const oy = half + (o.y * this.k + Math.cos(mt * o.b + o.p) * 40 * this.k) * u
      const r = o.r * this.k * u
      const col = i % 2 === 0 ? s.c1 : s.c2
      const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, r)
      gr.addColorStop(0, this._rgba(col, 0.95))
      gr.addColorStop(1, this._rgba(col, 0))
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(ox, oy, r, 0, 6.283)
      ctx.fill()
    })
    ctx.filter = 'none'
  }

  _render() {
    const ctx = this.ctx
    const s = this.state
    const t = this.t
    // Вся декоративная механика ходит по mt: в reduced-motion он стоит, и
    // движение исчезает, а выражение лица и цвет — нет. Они несут информацию.
    const mt = this.reduced ? 0 : t
    const k = this.k
    const blinkK = this.blink > 0 ? 1 - Math.abs(this.blink - 0.07) / 0.07 : 0

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.W, this.H)

    const pop = get(this.target, 'pop', 0) * this.popT * 0.08
    const bounce = s.bounce * this.gain
    const bob = this.reduced ? 0 : Math.sin(this.phase) * 10 * k * bounce
    const sq = 1 + (this.reduced ? 0 : Math.sin(this.phase - 0.7) * 0.045 * bounce)
    const sx = this.R * (2 - sq) * (1 + pop)
    const sy = this.R * sq * (1 + pop)
    const tilt = this.reduced ? 0 : s.tilt * Math.sin(mt * 1.6) * 0.1
    // Дрожь злости: частая и мелкая, живёт поверх обычного дыхания и не зависит
    // от speed — иначе сливается с подскоками и читается как радость.
    const shx = this.reduced ? 0 : s.shake * Math.sin(mt * 38) * 2.6 * k
    const shy = this.reduced ? 0 : s.shake * Math.sin(mt * 31 + 1.3) * 1.8 * k

    ctx.save()
    ctx.translate(this.CX + shx, this.CY - bob + shy)
    ctx.rotate(tilt)

    if (s.ring > 0.03 && !this.reduced) {
      const p = (mt * 0.55) % 1
      ctx.beginPath()
      ctx.ellipse(0, 0, sx * 0.5 * (1 + p * 0.38), sy * 0.5 * (1 + p * 0.38), 0, 0, 6.283)
      ctx.strokeStyle = this._rgba(s.c1, s.ring * (1 - p) * 0.45)
      ctx.lineWidth = 5 * k
      ctx.stroke()
    }

    ctx.save()
    ctx.shadowColor = this._rgba(s.c2, 0.32)
    // Тень обязана уместиться в прозрачное поле: обрезанная канвой, она даёт
    // хорошо заметную прямую границу внизу формы.
    ctx.shadowBlur = Math.min(48 * k, this.pad * 0.9)
    ctx.shadowOffsetY = Math.min(12 * k, this.pad * 0.25)
    ctx.beginPath()
    ctx.ellipse(0, 0, sx * 0.5, sy * 0.5, 0, 0, 6.283)
    ctx.fillStyle = this._rgb(s.c2)
    ctx.fill()
    ctx.restore()

    if (this.frame % 3 === 0) this._paintBlobLayer(mt)
    this.frame++

    ctx.save()
    ctx.beginPath()
    ctx.ellipse(0, 0, sx * 0.5, sy * 0.5, 0, 0, 6.283)
    ctx.clip()
    if (this.blob) {
      const w = this.blobSpan * (sx / (this.R * 2))
      const h = this.blobSpan * (sy / (this.R * 2))
      ctx.drawImage(this.blob, -w / 2, -h / 2, w, h)
    }
    const sh = ctx.createLinearGradient(-sx * 0.4, -sy * 0.5, sx * 0.3, sy * 0.5)
    sh.addColorStop(0, 'rgba(255,255,255,0.20)')
    sh.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sh
    ctx.fillRect(-sx, -sy, sx * 2, sy * 2)
    ctx.restore()

    if (s.confetti > 0.3 && !this.reduced) this._drawConfetti(sx, s.confetti, mt)

    const lx = s.lookX * 10 * k
    const ly = s.lookY * 8 * k
    this._drawEye(-this.eyeSpread + lx, this.eyeY + ly, blinkK, s.asym > 0.5 ? 1.12 : 1)
    this._drawEye(this.eyeSpread + lx, this.eyeY + ly, blinkK, s.asym > 0.5 ? 0.58 : 1)
    // Брови ходят за взглядом слабее глаз — они на «черепе», а не в глазнице.
    this._drawBrow(-this.eyeSpread + lx * 0.5, this.eyeY - 32 * k + ly * 0.3, -1, s.brow)
    this._drawBrow(this.eyeSpread + lx * 0.5, this.eyeY - 32 * k + ly * 0.3, 1, s.brow)
    this._drawMouth(lx * 0.5, this.mouthY + ly * 0.4)

    // Эффекты позиционируем от РЕАЛЬНОГО радиуса формы, а не от R: они белые,
    // и за краем формы им нечем контрастировать — светлый фон их съедает.
    const rb = sx * 0.5
    if (s.dots > 0.3) this._drawDots(0, -rb * 0.58, s.dots, mt)
    if (s.spark > 0.3) {
      this._drawSpark(-rb * 0.6, -rb * 0.42, s.spark, mt)
      this._drawSpark(rb * 0.58, -rb * 0.34, s.spark, mt)
    }
    if (s.zzz > 0.3) this._drawZzz(rb * 0.42, -rb * 0.3, s.zzz, mt, rb)
    if (s.steam > 0.3 && !this.reduced) {
      // Дальше от формы, чем кажется нужным: ближе клубы срастаются с внешними
      // концами бровей в одну фигуру. Дальше уводить нельзя — прозрачного поля
      // канвы хватает ровно до сюда, за ним пар режется краем.
      this._drawSteam(-rb * 1.18, -rb * 0.62, s.steam, mt, rb, -1)
      this._drawSteam(rb * 1.18, -rb * 0.62, s.steam, mt, rb, 1)
    }

    ctx.restore()
  }

  _drawEye(x, y, blinkK, asymScale) {
    const ctx = this.ctx
    const s = this.state
    const k = this.k
    const w = (s.round * (25 - 19) + 19) * s.eyeW * k
    const h = 32 * k * s.eyeH * asymScale * (1 - blinkK)
    const a = s.arc
    const minH = 7 * k

    if (a > 0.35) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, a)
      ctx.beginPath()
      ctx.lineWidth = 8 * k
      ctx.lineCap = 'round'
      ctx.strokeStyle = this.INK
      ctx.moveTo(x - 16 * k, y + 8 * k)
      ctx.quadraticCurveTo(x, y - 14 * k, x + 16 * k, y + 8 * k)
      ctx.stroke()
      ctx.restore()
      if (a < 0.9) {
        ctx.save()
        ctx.globalAlpha = 1 - a
        this._caps(x, y, w, Math.max(h, minH), w / 2)
        ctx.fillStyle = this.INK
        ctx.fill()
        ctx.restore()
      }
    } else if (a < -0.35) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, -a)
      ctx.beginPath()
      ctx.lineWidth = 8 * k
      ctx.lineCap = 'round'
      ctx.strokeStyle = this.INK
      ctx.moveTo(x - 16 * k, y - 6 * k)
      ctx.quadraticCurveTo(x, y + 14 * k, x + 16 * k, y - 6 * k)
      ctx.stroke()
      ctx.restore()
      if (-a < 0.9) {
        ctx.save()
        ctx.globalAlpha = 1 + a
        this._caps(x, y, w, Math.max(h, minH), w / 2)
        ctx.fillStyle = this.INK
        ctx.fill()
        ctx.restore()
      }
    } else {
      const hh = Math.max(h, minH)
      this._caps(x, y, w, hh, Math.min(w, hh) / 2)
      ctx.fillStyle = this.INK
      ctx.fill()
    }
  }

  // side: -1 левый глаз, +1 правый. b: -1 внутренние концы вниз (злость),
  // +1 вверх (тревога, вопрос). Бровь — одна линия с альфой, поэтому, в отличие
  // от arc, промежуточные значения не дают двойных призрачных штрихов.
  _drawBrow(x, y, side, b) {
    const v = b || 0
    // При дугах-глазах ^^ бровь гасим: дуга сама читается как бровь, вместе — каша.
    const a = Math.min(1, Math.abs(v)) * (1 - Math.min(1, Math.abs(this.state.arc)))
    if (a < 0.03) return
    const ctx = this.ctx
    const k = this.k
    // Сдвинутая вниз бровь тем толще и длиннее, чем сильнее v: у злости (v=-1)
    // это тяжёлый мультяшный клин, а не та же тонкая чёрточка, что у отвращения.
    const rage = Math.max(0, -v)
    const half = (15 + 3 * rage) * k
    // Знак был перепутан относительно контракта в комментарии выше: при b<0
    // внутренние концы уезжали ВВЕРХ, и «злость» получала брови домиком, то есть
    // мимику испуга. Отсюда же было «удивлённое» лицо у curious/confused.
    const lift = -9 * k * v
    // Чем злее, тем ниже бровь садится на глаз — нависает, а не парит над ним.
    const yy = y + 8 * k * rage
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = this.INK
    ctx.lineWidth = (8 + 5 * rage) * k
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x - side * half, yy + lift * 0.45)
    ctx.lineTo(x + side * half, yy - lift)
    ctx.stroke()
    ctx.restore()
  }

  _drawMouth(x, y) {
    const ctx = this.ctx
    const s = this.state
    const k = this.k
    ctx.strokeStyle = this.INK
    ctx.fillStyle = this.INK
    ctx.lineWidth = 8 * k
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Речь открывает рот У ЛЮБОЙ эмоции: this.speak приходит от setSpeaking и с
    // мимикой никак не связан. Форму рта при этом задаёт эмоция — открывается
    // именно ЕЁ рот, поэтому радость говорит улыбаясь, а злость — оскалившись.
    const openAmt = Math.max(s.open * 0.35, this.voiceEnv * this.speak)
    // Челюсть — глубина, на которую уезжает нижняя губа у «линейных» ртов.
    const jaw = openAmt * 22 * k

    if (s.mouth === 'o') {
      const r = (9 + s.open * 6 + openAmt * 9) * k
      ctx.beginPath()
      ctx.ellipse(x, y + 3 * k, r * 0.88, r, 0, 0, 6.283)
      ctx.fill()
    } else if (s.mouth === 'open' && openAmt > 0.12) {
      const mh = (8 + openAmt * 30) * k
      const mw = (25 + openAmt * 11) * k
      this._caps(x, y + mh * 0.28, mw, mh, Math.min(mw, mh) / 2)
      ctx.fill()
    } else if (s.mouth === 'grit') {
      // Оскал стиснутых зубов — единственный рот с белой заливкой. В мультяшной
      // злости именно он делает эмоцию читаемой на мелком орбе: одна хмурая
      // линия на таком размере теряется, а белый блок с изломом — нет.
      const mw = 62 * k
      // Оскал не открывается «челюстью», а разжимается: блок зубов растёт в
      // высоту, излом вместе с ним. Иначе на реплике злость теряет зубы.
      const mh = (30 + openAmt * 16) * k
      const r = 9 * k
      this._caps(x, y, mw, mh, r)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // Излом зубов режем по форме рта, иначе концы торчат из-под обводки.
      ctx.save()
      this._caps(x, y, mw, mh, r)
      ctx.clip()
      ctx.beginPath()
      const teeth = 6
      for (let i = 0; i <= teeth; i++) {
        const px = x - mw / 2 + (mw / teeth) * i
        const py = y + (i % 2 === 0 ? -mh * 0.22 : mh * 0.22)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.lineWidth = 6 * k
      ctx.stroke()
      ctx.restore()

      this._caps(x, y, mw, mh, r)
      ctx.lineWidth = 7 * k
      ctx.stroke()
      ctx.fillStyle = this.INK
    } else if (s.mouth === 'wave') {
      // Волна — это верхняя губа, кривизну эмоции держит она. Нижняя — ровная
      // дуга: если отзеркалить ей волну, при открытом рте выходит клякса, а не
      // рот. При jaw = 0 дуга ложится на волну, и рот выглядит как прежде.
      ctx.beginPath()
      ctx.moveTo(x - 23 * k, y)
      ctx.quadraticCurveTo(x - 11 * k, y - 9 * k, x, y)
      ctx.quadraticCurveTo(x + 11 * k, y + 9 * k, x + 23 * k, y)
      ctx.quadraticCurveTo(x, y + jaw * 1.7, x - 23 * k, y)
      ctx.fill()
      ctx.stroke()
    } else {
      // skew перекашивает улыбку: один угол выше другого. Так делается ухмылка
      // злорадства и скривлённый рот отвращения — без отдельного типа рта.
      //
      // Путь ЗАМКНУТЫЙ: верхняя губа — кривая эмоции, нижняя — она же, опущенная
      // на челюсть. При jaw = 0 обе совпадают, и заливка вырождается в ту же
      // одну линию, что была раньше, — молчащий рот выглядит ровно как прежде.
      const c = s.curve
      const sk = s.skew || 0
      const cx = x + sk * 9 * k
      const cy = y + c * 26 * k
      ctx.beginPath()
      ctx.moveTo(x - 26 * k, y - c * 6 * k * (1 - sk))
      ctx.quadraticCurveTo(cx, cy, x + 26 * k, y - c * 6 * k * (1 + sk))
      ctx.quadraticCurveTo(cx, cy + jaw * 1.6, x - 26 * k, y - c * 6 * k * (1 - sk))
      ctx.fill()
      ctx.stroke()
    }
  }

  _drawDots(x, y, a, mt) {
    const ctx = this.ctx
    const k = this.k
    ctx.save()
    ctx.fillStyle = '#fff'
    for (let i = 0; i < 3; i++) {
      const ph = Math.sin(mt * 4 - i * 0.7)
      ctx.globalAlpha = Math.min(1, a) * (0.3 + 0.7 * Math.max(0, ph))
      ctx.beginPath()
      ctx.arc(x - 24 * k + i * 24 * k, y - Math.max(0, ph) * 6 * k, 6 * k, 0, 6.283)
      ctx.fill()
    }
    ctx.restore()
  }

  _drawSpark(x, y, a, mt) {
    const ctx = this.ctx
    const k = this.k
    ctx.save()
    ctx.globalAlpha = Math.min(1, a) * (0.55 + 0.45 * Math.sin(mt * 5))
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const q = (i * Math.PI) / 2
      ctx.lineTo(x + Math.cos(q) * 3 * k, y + Math.sin(q) * 3 * k)
      ctx.lineTo(x + Math.cos(q + 0.785) * 10 * k, y + Math.sin(q + 0.785) * 10 * k)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  _drawConfetti(sx, a, mt) {
    const ctx = this.ctx
    const k = this.k
    // Дальность полёта считаем от свободного поля, а не константой: иначе на
    // мелком боксе конфетти улетает за край канвы и обрубается на лету.
    const room = Math.max(0, this.W * 0.5 - sx * 0.5 - 5 * k)
    ctx.save()
    this.confetti.forEach((c) => {
      const pr = (mt * c.s + c.r) % 1
      const d = sx * 0.5 + room * pr
      ctx.globalAlpha = Math.min(1, a) * (1 - pr) * 0.9
      ctx.fillStyle = c.h > 0.5 ? this._rgb(this.state.c1) : this._rgb(this.state.c2)
      ctx.save()
      ctx.translate(Math.cos(c.a) * d, Math.sin(c.a) * d * 0.85)
      ctx.rotate(mt * 3 + c.a)
      ctx.fillRect(-3.5 * k, -3.5 * k, 7 * k, 7 * k)
      ctx.restore()
    })
    ctx.restore()
  }

  // Длина подъёма — доля радиуса формы (rb), а размер глифа — доля k: иначе
  // на мелком боксе «z» улетает за край, а на крупном топчется на месте.
  _drawZzz(x, y, a, mt, rb) {
    const ctx = this.ctx
    const k = this.k
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    for (let i = 0; i < 3; i++) {
      const pr = (mt * 0.4 + i * 0.33) % 1
      ctx.globalAlpha = Math.min(1, a) * (1 - pr) * 0.85
      ctx.font = `500 ${(15 + i * 5) * k * 0.8}px Manrope, sans-serif`
      ctx.fillText(
        'z',
        x + i * rb * 0.09 + Math.sin(mt + i) * 5 * k,
        y - pr * rb * 0.42 - i * rb * 0.08
      )
    }
    ctx.restore()
  }

  // Пар из «ушей»: облачко из трёх долек с чернильной обводкой. Обводка тут не
  // украшение — она и позволяет вынести пар ЗА форму, к ушам, как у злого
  // эмодзи. Раньше пар был белым без контура, и держать его приходилось внутри
  // формы (за краем светлый фон его съедал) — там он ложился прямо на глаза.
  //
  // Рисуем в два прохода: сначала все дольки чернилами, потом поверх белым.
  // Так у облачка ровный общий контур, а не сетка швов от пересечений.
  _drawSteam(x, y, a, mt, rb, side) {
    const ctx = this.ctx
    const k = this.k
    const lobes = [
      [0, 0, 1],
      [-0.72, 0.34, 0.7],
      [0.72, 0.3, 0.66],
    ]
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const pr = (mt * 0.85 + i * 0.34) % 1
      // Клубы уходят вверх и наружу от головы, а не строго вверх.
      const px = x + side * pr * rb * 0.12 + Math.sin(mt * 2.2 + i) * 5 * k * pr
      const py = y - pr * rb * 0.3
      // Клуб не растворяется, а схлопывается в конце пути: белое поверх
      // чернильного контура полупрозрачным даёт серую кашу вместо облачка.
      const fade = pr > 0.78 ? (1 - pr) / 0.22 : 1
      const r = (5 + pr * 7) * k * fade
      ctx.globalAlpha = Math.min(1, a)
      const paint = (grow, color) => {
        ctx.fillStyle = color
        lobes.forEach(([dx, dy, rs]) => {
          ctx.beginPath()
          ctx.arc(px + dx * r, py + dy * r, r * rs + grow, 0, 6.283)
          ctx.fill()
        })
      }
      paint(3 * k, this.INK)
      paint(0, '#ffffff')
    }
    ctx.restore()
  }
}
