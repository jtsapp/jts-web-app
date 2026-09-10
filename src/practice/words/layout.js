// Солвер раскладки спрайтов по сцене — порт placeRound/box/overlap/clampInto
// из data/jtswords.html (~:417–460). Самая ценная часть прототипа: он решает,
// где на картинке встанет каждое слово раунда, чтобы ничего не налезало друг
// на друга и корова не оказалась на дереве.
//
// СИСТЕМА КООРДИНАТ. Сцена — квадрат 100×100 условных единиц (проценты своей
// ширины и высоты). Спрайт квадратный: его ширина w — проценты ШИРИНЫ сцены,
// значит высота в процентах ВЫСОТЫ сцены равна w * ar, где ar — отношение
// сторон сцены. Якорь спрайта — низ-центр (x, y).
//
// Ориентация приходит аргументом, а не читается из DOM: иначе солвер нечем
// накрыть юнит-тестом и не с чем сверить оракул. Случайность — тоже аргумент
// (rng), потому что прототип подмешивает разброс в оценку слота, и без сида
// фикстура была бы разной на каждом прогоне.

// Базовая ширина спрайта по размерному классу (проценты ширины сцены).
// Это игровая условность, а не настоящий масштаб: кит рядом с крабом.
export const BASE = { XL: 20, L: 16, M: 12.5, S: 10 }
export const MIN_W = 9
// Поле, из которого спрайт не выезжает: у самого края его не тапнуть.
export const SAFE = { l: 2, r: 98, t: 3, b: 98 }
// Совместимость слотов: летающее может сесть на ветку и на землю, водное —
// выйти на землю, наземное остаётся на земле. Обратного хода нет: корова на
// ветке — это баг, а не разнообразие.
export const COMPAT = { g: ['g'], w: ['w', 'g'], b: ['b', 'w', 'g'], f: ['f', 'b', 'g'] }
const RANK = { XL: 0, L: 1, M: 2, S: 3 }
// Порог, с которого перекрытие считается проблемой (доля площади меньшего).
const OVERLAP_LIMIT = 0.12
const RESOLVE_ITERATIONS = 16

/** Отношение сторон сцены. Портрет уже — и спрайт в нём выше в процентах. */
export function stageAR(portrait) {
  return portrait ? 4 / 3 : 16 / 9
}

/** В портрете спрайты крупнее: сцена меньше, а палец тот же. */
export function spriteScale(size, portrait) {
  if (!portrait) return 1
  return size === 'L' || size === 'XL' ? 1.15 : 1.3
}

/** Габариты спрайта в координатах сцены. Якорь — низ-центр. */
export function boxOf(p, ar) {
  const h = p.w * ar
  return { L: p.x - p.w / 2, R: p.x + p.w / 2, T: p.y - h, B: p.y, h }
}

/** Загоняет спрайт в безопасное поле сцены. Меняет объект на месте. */
export function clampInto(p, ar) {
  const h = p.w * ar
  p.x = Math.min(SAFE.r - p.w / 2, Math.max(SAFE.l + p.w / 2, p.x))
  p.y = Math.min(SAFE.b, Math.max(SAFE.t + h, p.y))
  return p
}

/** Доля перекрытия: площадь пересечения к площади МЕНЬШЕГО из двух спрайтов. */
export function overlap(a, b, ar) {
  const A = boxOf(a, ar)
  const B = boxOf(b, ar)
  const ix = Math.max(0, Math.min(A.R, B.R) - Math.max(A.L, B.L))
  const iy = Math.max(0, Math.min(A.B, B.B) - Math.max(A.T, B.T))
  if (!ix || !iy) return 0
  return (ix * iy) / Math.min((A.R - A.L) * A.h, (B.R - B.L) * B.h)
}

// Ширина спрайта. У мебели она считается из реального размера в сантиметрах
// (диван и чайная ложка в одном размерном классе смотрелись бы дико), у
// остальных берётся из размерного класса.
function widthOf(word, slot, section, portrait) {
  const scale = spriteScale(word.sz, portrait)
  const base =
    section === 'house' && word.cm ? Math.min(30, Math.max(11, word.cm * 0.2125)) : BASE[word.sz]
  // Крупную мебель в портрете не раздуваем: она и так занимает пол-экрана.
  const shrink = section === 'house' && base >= 20 ? 1 : scale
  return { w: Math.max(MIN_W * shrink, base * slot.dp * shrink), scale }
}

/**
 * Расставляет слова раунда по слотам сцены.
 *
 * Порядок укладки — от крупных к мелким (мебель — по убыванию сантиметров):
 * крупному труднее найти место, поэтому он выбирает первым.
 * Слот выбирается по оценке: подальше от уже расставленных, мелким — ближние
 * планы, крупным — дальние, плюс небольшой случайный разброс, чтобы одна и та
 * же сцена не выглядела дважды одинаково.
 *
 * @returns {Array<{word, x, y, w, t, scale}>} координаты в единицах сцены
 */
export function placeRound(round, scene, { portrait = false, rng = Math.random, section = '' } = {}) {
  const ar = stageAR(portrait)
  const slots = scene.slots.map((s, i) => ({ i, x: s[0], y: s[1], t: s[2], dp: s[3] || 1 }))
  const used = new Set()
  const out = []

  const order = round
    .slice()
    .sort((a, b) => (a.cm && b.cm ? b.cm - a.cm : RANK[a.sz] - RANK[b.sz]))

  for (const word of order) {
    let cand = []
    for (const t of COMPAT[word.pl] || ['g']) {
      cand = slots.filter((s) => !used.has(s.i) && s.t === t)
      if (cand.length) break
    }
    // Своего типа не осталось — падаем на землю, а в крайнем случае на любой
    // свободный слот: лучше стоящий не на своём месте спрайт, чем слово,
    // которое спросят, а на сцене его нет.
    if (!cand.length) cand = slots.filter((s) => !used.has(s.i) && s.t === 'g')
    if (!cand.length) cand = slots.filter((s) => !used.has(s.i))
    if (!cand.length) continue

    const score = (s) => {
      const spread = out.length
        ? Math.min(...out.map((o) => Math.hypot(o.x - s.x, (o.y - s.y) * 0.6)))
        : 50
      const depthPref =
        word.sz === 'S'
          ? (s.dp - 0.8) * 40
          : word.sz === 'XL' || word.sz === 'L'
            ? (1 - s.dp) * (section === 'house' ? 60 : 10)
            : 0
      return spread + depthPref + rng() * 4
    }
    // Оценка со случайной добавкой считается заново на каждое сравнение — так
    // в прототипе, и оракул снят именно с этого поведения. Не «оптимизировать».
    const slot = cand.reduce((best, s) => (score(s) > score(best) ? s : best), cand[0])
    used.add(slot.i)

    const { w, scale } = widthOf(word, slot, section, portrait)
    out.push(clampInto({ word, x: slot.x, y: slot.y, w, t: slot.t, scale }, ar))
  }

  resolveOverlaps(out, ar)
  return out
}

// Разведение налезающих спрайтов. Самую грубую пару пытаемся раздвинуть по
// горизонтали (а плавающих и летающих — ещё и по вертикали), выбирая ход,
// который уменьшает суммарное перекрытие со ВСЕМИ, а не только с соседом.
// Если ни один ход не помог — уменьшаем оба, но это крайняя мера: мелкий
// спрайт труднее опознать и труднее попасть.
function resolveOverlaps(out, ar) {
  const total = (k) => out.reduce((sum, o, idx) => (idx === k ? sum : sum + overlap(out[k], o, ar)), 0)

  for (let iter = 0; iter < RESOLVE_ITERATIONS; iter++) {
    let worst = null
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const ov = overlap(out[i], out[j], ar)
        if (ov > OVERLAP_LIMIT && (!worst || ov > worst.ov)) worst = { i, j, ov }
      }
    }
    if (!worst) break

    let best = null
    for (const k of [worst.j, worst.i]) {
      const m = out[k]
      const other = out[k === worst.i ? worst.j : worst.i]
      const A = boxOf(other, ar)
      const B = boxOf(m, ar)
      const moves = [{ dx: A.R - B.L + 2, dy: 0 }, { dx: -(B.R - A.L + 2), dy: 0 }]
      if (m.word.pl === 'w' || m.word.pl === 'f' || m.t === 'w' || m.t === 'f') {
        moves.push({ dx: 0, dy: A.B - B.T + 2 }, { dx: 0, dy: -(B.B - A.T + 2) })
      }
      const ox = m.x
      const oy = m.y
      for (const mv of moves) {
        m.x = ox + mv.dx
        m.y = oy + mv.dy
        clampInto(m, ar)
        const t = total(k)
        if (!best || t < best.t) best = { k, x: m.x, y: m.y, t }
      }
      m.x = ox
      m.y = oy
    }

    const cur = total(worst.i) + total(worst.j)
    if (best && best.t < cur - 0.01) {
      out[best.k].x = best.x
      out[best.k].y = best.y
    } else {
      for (const k of [worst.i, worst.j]) {
        out[k].w = Math.max(MIN_W * out[k].scale * 0.85, out[k].w * 0.9)
        clampInto(out[k], ar)
      }
    }
  }
  return out
}
