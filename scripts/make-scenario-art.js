// Картинки карточек сценариев: рисуем их кодом, а не храним готовыми.
//
// Сцен 28 и будет больше, а карточка кадрирует квадрат 612x612 дважды —
// страница «Сценарии» режет бока (aspect 164/199), виджет дашборда режет верх
// и низ (высота 150 при вдвое большей ширине). Подобрать под оба кадра
// картинку из стока или поправить одну деталь в готовом jpg нельзя, поэтому
// composition живёт здесь: правишь сцену, гоняешь скрипт, получаешь файл.
//
//   node scripts/make-scenario-art.js            # все сцены
//   node scripts/make-scenario-art.js taxi-long-way corner-shop   # выборочно
//
// Восемь самых первых сцен (виза, отель, кофе и т.д.) рисовались не здесь —
// у них сток-иллюстрации, и трогать их скрипт не должен.

// ---- примитивы ----------------------------------------------------------
// Рисуем плоским вектором в квадрате
// 612×612, но карточка кадрирует его дважды: страница «Сценарии» режет бока
// (aspect 164/199), виджет дашборда — верх и низ (высота 150 при вдвое большей
// ширине). Общая безопасная зона — центральный прямоугольник SAFE; всё, что
// должно быть видно, живёт внутри него, фон уходит под обрез.
const SAFE = { x0: 62, x1: 550, y0: 78, y1: 534 }

const C = {
  cream: '#F4EDE4',
  sand: '#E3D5C3',
  sandDeep: '#CDBAA1',
  wood: '#C29B6E',
  woodDark: '#9C7A52',
  ink: '#3F3B48',
  grey: '#8C8797',
  greyDark: '#4A4655',
  blue: '#7686B0',
  blueDark: '#5F6E96',
  red: '#E2574C',
  redDark: '#C74438',
  green: '#7FA07A',
  greenDark: '#5F8060',
  warm: '#FFD9A0',
  warmDeep: '#F0B96B',
  night: '#3B4260',
  nightDeep: '#2A3049',
  white: '#FFFFFF',
  paper: '#FBF6EE',
  skin: '#EBB68F',
  skinDark: '#D99C74',
  skinLight: '#F2CBAA',
  rose: '#D9737A',
}

const r = (x, y, w, h, fill, rx = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`
const c = (cx, cy, rad, fill, extra = '') =>
  `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}" ${extra}/>`
const e = (cx, cy, rx, ry, fill, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`
const p = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`
const line = (d, stroke, w = 6, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`
const g = (transform, body) => `<g transform="${transform}">${body}</g>`

// Комната: стена сверху, пол снизу, полоска плинтуса на стыке.
function room(wall, floor, horizon = 430, edge = C.sandDeep) {
  return (
    r(0, 0, 612, horizon, wall) +
    r(0, horizon, 612, 612 - horizon, floor) +
    r(0, horizon - 5, 612, 9, edge)
  )
}

const HAIR = {
  bun: (col) =>
    p('M-38 -254 c0 -32 16 -48 38 -48 s38 16 38 48 c0 -12 -14 -22 -38 -22 s-38 10 -38 22 Z', col) +
    c(38, -286, 16, col),
  short: (col) =>
    p('M-38 -252 c0 -34 16 -50 38 -50 s38 16 38 50 c0 -16 -16 -26 -38 -26 s-38 10 -38 26 Z', col),
  long: (col) =>
    p('M-40 -250 c0 -34 18 -52 40 -52 s40 18 40 52 l0 62 c0 8 -8 12 -14 8 l0 -66 c0 -14 -12 -22 -26 -22 s-26 8 -26 22 l0 66 c-6 4 -14 0 -14 -8 Z', col),
  kid: (col) =>
    p('M-34 -248 c0 -30 14 -44 34 -44 s34 14 34 44 c-4 -12 -14 -20 -34 -20 s-30 8 -34 20 Z', col) +
    p('M-6 -292 q10 -14 20 -2', col, 'stroke="' + col + '" stroke-width="7" stroke-linecap="round"'),
  cap: (col) =>
    p('M-40 -262 a40 34 0 0 1 80 0 Z', col) + r(-44, -264, 96, 12, col, 6),
  officer: (col) =>
    p('M-40 -262 a40 30 0 0 1 80 0 Z', col) +
    r(-46, -262, 100, 12, col, 6) +
    r(-16, -292, 32, 12, '#F0C24A', 3),
  bald: () => '',
}

// Человек ростом ~294 px, ступни в точке (x, groundY). Позы отличаются только
// руками: их рисуем поверх корпуса, чтобы не резать сам корпус.
function person(o) {
  const {
    x, y, scale = 1, skin = C.skin, hair = 'short', hairColor = C.ink,
    top = C.blue, topDark = C.blueDark, legs = C.greyDark, shoes = C.ink,
    pose = 'idle', mood = 'calm', flip = false, legsHidden = false,
  } = o
  const arms =
    pose === 'crossed'
      ? r(-56, -168, 112, 26, topDark, 13) + c(-52, -156, 13, skin) + c(52, -180, 13, skin)
      : pose === 'reach'
      ? r(28, -196, 92, 24, top, 12) + c(118, -184, 14, skin)
      : pose === 'point'
      ? r(28, -210, 88, 22, top, 11) + c(116, -200, 13, skin) + r(-62, -196, 22, 92, top, 11)
      : pose === 'hold'
      ? r(-60, -196, 22, 92, top, 11) + r(24, -186, 84, 22, top, 11) + c(106, -176, 13, skin)
      : pose === 'phone'
      ? r(24, -232, 22, 62, top, 11) + c(34, -238, 13, skin) + r(-62, -196, 22, 92, top, 11)
      : r(-62, -196, 22, 92, top, 11) + r(40, -196, 22, 92, top, 11)
  const face =
    c(-14, -256, 4.6, C.ink) +
    c(14, -256, 4.6, C.ink) +
    (mood === 'cross'
      ? line('M-24 -272 l16 6', C.ink, 5) + line('M24 -272 l-16 6', C.ink, 5) + line('M-10 -232 h20', '#B4715A', 5)
      : mood === 'sad'
      ? line('M-10 -228 q10 -8 20 0', '#B4715A', 5)
      : line('M-11 -234 q11 10 22 0', '#B4715A', 5))
  const body =
    (legsHidden
      ? ''
      : r(-32, -84, 24, 84, legs, 10) +
        r(8, -84, 24, 84, legs, 10) +
        e(-20, -2, 20, 11, shoes) +
        e(20, -2, 20, 11, shoes)) +
    p('M0 -212 c-38 0 -54 20 -58 44 l-10 74 c-2 14 6 22 18 22 h100 c12 0 20 -8 18 -22 l-10 -74 c-4 -24 -20 -44 -58 -44 Z', top) +
    r(-11, -230, 22, 26, C.skinDark, 8) +
    c(0, -256, 36, skin) +
    (HAIR[hair] ? HAIR[hair](hairColor) : '') +
    face +
    arms
  return g(`translate(${x},${y}) scale(${flip ? -scale : scale},${scale})`, body)
}

// Стойка/прилавок: столешница и передняя панель.
function counter(x, y, w, h, front = C.wood, topCol = C.woodDark) {
  return r(x, y, w, h, front, 8) + r(x - 8, y - 16, w + 16, 18, topCol, 8)
}

const paper = (x, y, w, h, tilt = 0, fill = C.paper) =>
  g(`translate(${x},${y}) rotate(${tilt})`,
    r(0, 0, w, h, fill, 6) +
    line(`M${w * 0.16} ${h * 0.26} h${w * 0.68}`, C.sandDeep, 5) +
    line(`M${w * 0.16} ${h * 0.46} h${w * 0.68}`, C.sandDeep, 5) +
    line(`M${w * 0.16} ${h * 0.66} h${w * 0.42}`, C.sandDeep, 5))

// ---- композиции ---------------------------------------------------------

// Затылок клиента на переднем плане: лица нет, поэтому сцена читается как
// «ты стоишь здесь», а не «двое незнакомых людей разговаривают».
function back(x, y, s = 1, top = C.green, hairColor = C.ink, skin = C.skin) {
  return g(`translate(${x},${y}) scale(${s})`,
    p('M0 -196 c-46 0 -66 26 -70 54 l-12 92 c-2 16 8 26 22 26 h120 c14 0 24 -10 22 -26 l-12 -92 c-4 -28 -24 -54 -70 -54 Z', top) +
    r(-13, -216, 26, 28, skin, 9) +
    c(0, -246, 40, skin) +
    p('M-40 -246 a40 40 0 0 1 80 0 a40 30 0 0 0 -80 0 Z', hairColor) +
    c(0, -256, 40, hairColor))
}

const bubble = (x, y, w, h, fill = C.white) =>
  g(`translate(${x},${y})`, r(0, 0, w, h, fill, 18) + p(`M${w * 0.22} ${h} l0 22 l24 -22 Z`, fill))

const SCENES = {
  // ——— A1 ———————————————————————————————————————————————————————
  'lost-boy-info-desk':
    room(C.cream, C.sand, 424) +
    // табличка «i» над стойкой
    g('translate(306,150)', c(0, 0, 46, C.blue) + r(-7, -22, 14, 14, C.white, 7) + r(-7, 0, 14, 26, C.white, 6)) +
    counter(150, 372, 312, 162, C.wood, C.woodDark) +
    person({ x: 306, y: 462, scale: 0.86, hair: 'bun', hairColor: '#5A4632', top: C.blue, topDark: C.blueDark, pose: 'reach', legsHidden: true }) +
    // мальчик с динозавром
    person({ x: 448, y: 534, scale: 0.66, hair: 'kid', hairColor: '#4A3A2A', top: C.red, topDark: C.redDark, legs: C.blueDark, mood: 'sad' }) +
    g('translate(492,404) scale(1.35)', p('M0 0 q16 -30 38 -16 q12 -20 26 2 q12 14 -2 22 l-52 6 Z', C.green) + p('M-2 2 l-14 22 l12 2 Z', C.greenDark) + c(30, -12, 4, C.ink)) +
    // взрослый рядом, спиной
    back(122, 566, 0.82, C.greenDark, '#3A3A44'),

  'museum-ticket-desk':
    room('#EDE6DA', C.sand, 430) +
    // фасад-колоннада за кассой
    g('', r(96, 120, 420, 20, C.sandDeep, 6) + p('M96 120 L306 66 L516 120 Z', C.sandDeep) +
      r(130, 140, 34, 190, '#DCCDB8', 4) + r(214, 140, 34, 190, '#DCCDB8', 4) +
      r(298, 140, 34, 190, '#DCCDB8', 4) + r(382, 140, 34, 190, '#DCCDB8', 4) +
      r(448, 140, 34, 190, '#DCCDB8', 4)) +
    counter(132, 380, 348, 154, '#B58E63', '#96724C') +
    person({ x: 268, y: 470, scale: 0.8, hair: 'short', hairColor: C.ink, top: C.greenDark, topDark: '#4C6A50', pose: 'reach', legsHidden: true }) +
    // билеты на стойке
    g('translate(356,340) rotate(-9)', r(0, 0, 96, 52, '#E8B94F', 8) + c(0, 26, 9, '#EDE6DA') + c(96, 26, 9, '#EDE6DA') + line('M64 8 v36', '#B58E63', 4, 'stroke-dasharray="5 7"') + line('M16 20 h34', '#B58E63', 5)) +
    g('translate(382,320) rotate(7)', r(0, 0, 96, 52, '#F7D67E', 8) + c(0, 26, 9, '#EDE6DA') + c(96, 26, 9, '#EDE6DA') + line('M64 8 v36', '#B58E63', 4, 'stroke-dasharray="5 7"')),

  // ——— A2 ———————————————————————————————————————————————————————
  'clothing-store':
    room('#F2EAE0', C.sand, 470) +
    // штанга с тремя куртками
    line('M118 168 h376', C.grey, 8) +
    [['#9AA0A8', 158], ['#5D6B94', 286], ['#43414C', 414]].map(([col, x]) =>
      g(`translate(${x},168)`,
        line('M0 0 q-14 -16 0 -22 q14 6 0 22', C.grey, 5) +
        p('M-46 26 l46 -18 l46 18 l14 96 l-24 10 l-6 108 h-60 l-6 -108 l-24 -10 Z', col) +
        line('M0 12 v196', '#00000022', 5))).join('') +
    person({ x: 214, y: 534, scale: 0.78, hair: 'long', hairColor: '#6B4A32', top: C.rose, topDark: '#BF5F66', legs: C.greyDark, pose: 'point' }) +
    back(468, 570, 0.84, C.blueDark, '#3A3A44'),

  'corner-shop':
    room('#EFE7DA', C.sand, 448) +
    // полки с товаром за спиной
    g('', [190, 262].map((y) =>
      r(120, y, 372, 12, C.woodDark, 4) +
      [138, 196, 254, 312, 370, 428].map((x, i) =>
        r(x, y - 44, 34, 44, [C.red, C.green, C.warmDeep, C.blue, C.rose, C.greenDark][i % 6], 6)).join('')).join('')) +
    counter(126, 386, 360, 148, C.wood, C.woodDark) +
    person({ x: 268, y: 476, scale: 0.82, hair: 'bun', hairColor: '#4A3A2A', top: C.greenDark, topDark: '#4C6A50', pose: 'hold', legsHidden: true }) +
    // корзина и купюра на прилавке
    g('translate(368,320)', line('M24 -10 q30 -36 60 0', C.redDark, 7) + p('M0 0 h108 l-15 46 h-78 Z', C.red) + r(-6, -10, 120, 14, C.redDark, 6)) +
    g('translate(150,344)', r(0, 0, 74, 34, '#BFD8B4', 5) + c(37, 17, 10, '#8FB57F')),

  'hairdresser':
    room('#F1E7DE', C.sand, 452) +
    // зеркало
    g('translate(306,120)', r(-150, 0, 300, 240, '#DDE6E8', 20) + r(-150, 0, 300, 240, 'none', 20, `stroke="${C.woodDark}" stroke-width="12"`) +
      e(-56, 150, 60, 74, '#C9D6DA')) +
    // кресло
    g('', r(228, 392, 156, 142, '#5C5A66', 16) + r(252, 500, 108, 34, C.greyDark, 10) + r(292, 526, 28, 34, C.greyDark, 8)) +
    back(300, 520, 0.8, '#D8CFC2', '#4A3A2A') +
    person({ x: 430, y: 534, scale: 0.74, hair: 'bun', hairColor: '#7A3F3F', top: '#E08F7E', topDark: '#C97463', legs: C.greyDark, pose: 'point', flip: true }) +
    // ножницы
    g('translate(372,316) rotate(-24)', line('M0 0 l52 40', C.grey, 7) + line('M0 40 l52 -40', C.grey, 7) + c(-4, -4, 10, C.grey) + c(-4, 44, 10, C.grey)),

  'market-melon-stall':
    room('#EFEADC', '#DED2BC', 442) +
    // навес
    p('M56 92 L556 92 L520 168 L92 168 Z', '#D8695F') +
    [0, 1, 2, 3, 4, 5].map((i) => p(`M${100 + i * 72} 168 l36 0 l-6 26 l-24 0 Z`, '#F0EAE0')).join('') +
    counter(112, 372, 388, 162, C.wood, C.woodDark) +
    // дыни и ящики
    [[168, 340, 40, '#C9C06A'], [242, 334, 46, '#B8B45E'], [326, 338, 42, '#C9C06A'], [404, 332, 48, '#AFAE58']]
      .map(([x, y, rad, col]) => e(x, y, rad, rad * 0.84, col) + line(`M${x - rad * 0.5} ${y - rad * 0.5} q${rad * 0.5} ${rad * 0.4} 0 ${rad * 1.2}`, '#8E8C46', 5)).join('') +
    person({ x: 424, y: 464, scale: 0.8, hair: 'bun', hairColor: '#4A3A2A', top: '#E0A85C', topDark: '#C88F45', pose: 'reach', legsHidden: true, flip: true }),

  'pharmacy-night-window':
    r(0, 0, 612, 612, C.night) +
    c(474, 132, 44, '#F3E7B8') + c(452, 120, 40, C.night) +
    [[120, 96], [180, 168], [96, 210], [520, 250], [548, 152]].map(([x, y]) => c(x, y, 4, '#F3E7B8', 'opacity="0.8"')).join('') +
    // дверь аптеки
    r(150, 156, 312, 456, C.nightDeep, 18) +
    r(150, 156, 312, 456, 'none', 18, `stroke="#4C5679" stroke-width="10"`) +
    // зелёный крест
    g('translate(306,232)', r(-14, -40, 28, 80, '#6FBE8A', 6) + r(-40, -14, 80, 28, '#6FBE8A', 6)) +
    // ночное окошко
    r(206, 316, 200, 132, C.warm, 12) +
    r(206, 316, 200, 132, 'none', 12, `stroke="#4C5679" stroke-width="10"`) +
    g('translate(306,452)', person({ x: 0, y: 0, scale: 0.62, hair: 'short', hairColor: C.ink, top: '#DCE6EC', topDark: '#BECBD4', pose: 'reach', legsHidden: true })) +
    r(206, 396, 200, 52, C.nightDeep) +
    // упаковка в окне
    g('translate(340,352) rotate(-8)', r(0, 0, 56, 36, C.white, 6) + line('M10 18 h36', C.red, 6)),

  'station-ticket-window':
    room('#E9E5DC', C.sand, 448) +
    // табло
    g('translate(306,140)', r(-208, -68, 416, 136, C.greyDark, 14) +
      [0, 1, 2].map((i) =>
        line(`M-180 ${-38 + i * 38} h150`, '#F2C14E', 9) + line(`M-8 ${-38 + i * 38} h84`, '#8FB57F', 9) + line(`M100 ${-38 + i * 38} h64`, '#DDE6E8', 9)).join('')) +
    counter(126, 384, 360, 150, '#9AA0A8', '#7C828A') +
    // окно с решёткой
    r(196, 268, 220, 116, '#DDE6E8', 10) +
    [0, 1, 2, 3].map((i) => line(`M${216 + i * 60} 268 v116`, '#9AA0A8', 7)).join('') +
    person({ x: 306, y: 470, scale: 0.78, hair: 'cap', hairColor: C.blueDark, top: C.blue, topDark: C.blueDark, pose: 'reach', legsHidden: true }) +
    // билет на стойке
    g('translate(390,334) rotate(7)', r(0, 0, 82, 40, C.paper, 7) + line('M12 14 h58', C.sandDeep, 5) + line('M12 28 h34', C.sandDeep, 5)),

  // ——— B1 ———————————————————————————————————————————————————————
  'bank-lost-card':
    room('#E9ECF2', C.sand, 444) +
    // монитор с выпиской
    g('translate(148,164)', r(0, 0, 190, 140, C.greyDark, 12) + r(12, 12, 166, 116, C.paper, 6) +
      [0, 1, 2, 3].map((i) => line(`M28 ${34 + i * 24} h96`, C.sandDeep, 7)).join('') +
      line('M28 106 h96', C.red, 7) + r(78, 140, 34, 30, C.greyDark, 4) + r(56, 168, 78, 12, C.greyDark, 5)) +
    counter(120, 386, 372, 148, '#A9B3C6', '#8A94A8') +
    person({ x: 366, y: 476, scale: 0.8, hair: 'bun', hairColor: '#4A3A2A', top: '#5D6B94', topDark: '#4A567A', pose: 'reach', legsHidden: true, flip: true }) +
    // карта на стойке
    g('translate(186,300) rotate(-9)', r(0, 0, 116, 74, C.blue, 10) + r(0, 18, 116, 16, C.blueDark) + r(14, 46, 40, 14, '#F2C14E', 4)),

  'explaining-your-job':
    room('#EDEAE2', C.sand, 448) +
    // доска с диаграммой
    g('translate(180,150)', r(-96, -60, 300, 172, C.white, 10) + r(-96, -60, 300, 172, 'none', 10, `stroke="${C.sandDeep}" stroke-width="8"`) +
      c(-44, 0, 24, C.blue) + c(44, -26, 20, C.green) + c(56, 48, 18, C.warmDeep) +
      line('M-22 -6 l44 -14', C.grey, 5) + line('M-26 12 l64 28', C.grey, 5)) +
    // диван
    g('', r(300, 386, 232, 148, '#B9A7C4', 22) + r(280, 350, 40, 184, '#A493B0', 18)) +
    person({ x: 412, y: 508, scale: 0.56, hair: 'kid', hairColor: '#3A2E22', top: '#E2574C', topDark: C.redDark, legs: C.blueDark }) +
    person({ x: 168, y: 534, scale: 0.76, hair: 'short', hairColor: C.ink, top: C.greenDark, topDark: '#4C6A50', legs: C.greyDark, pose: 'point' }),

  'hotel-room-problem':
    room('#EDE7E0', C.sand, 442) +
    // доска с ключами
    g('translate(160,152)', r(-72, -50, 268, 160, '#C9A97E', 12) +
      [0, 1, 2].map((row) => [0, 1, 2, 3].map((col) =>
        g(`translate(${-40 + col * 62},${-16 + row * 46})`, c(0, 0, 6, '#8A6E4C') + p('M0 6 l0 22 l10 0 l0 -8 l-4 0 l0 -14 Z', '#F2C14E'))).join('')).join('')) +
    counter(126, 384, 360, 150, '#8C6E52', '#6E5540') +
    person({ x: 262, y: 472, scale: 0.8, hair: 'short', hairColor: C.ink, top: '#7A4A4A', topDark: '#623B3B', pose: 'reach', legsHidden: true }) +
    // звонок на стойке
    g('translate(400,326)', e(0, 46, 52, 12, '#C9A046') + p('M-44 46 a44 40 0 0 1 88 0 Z', '#E8B94F') + c(0, -4, 9, '#C9A046')) +
    back(500, 570, 0.8, C.blueDark, '#3A3A44'),

  'passport-control':
    room('#E7EAF0', C.sand, 446) +
    // будка
    r(120, 120, 372, 268, '#C3CBDA', 16) +
    r(146, 146, 320, 190, '#DDE6E8', 10) +
    line('M306 146 v190', '#C3CBDA', 8) +
    counter(120, 388, 372, 146, '#9AA4B8', '#7E889C') +
    person({ x: 306, y: 474, scale: 0.78, hair: 'officer', hairColor: '#3A4460', top: '#4A5478', topDark: '#3B4460', pose: 'reach', legsHidden: true, mood: 'calm' }) +
    // паспорт и штамп
    g('translate(150,272) rotate(-7)', r(0, 0, 86, 112, '#7A2F3A', 10) + c(43, 46, 20, '#E4C36A', 'opacity="0.85"') + line('M20 88 h46', '#E4C36A', 5)) +
    g('translate(432,306)', r(-26, -10, 52, 26, C.greyDark, 6) + r(-14, -44, 28, 36, C.grey, 6) + r(-34, 16, 68, 12, C.ink, 5)),

  'police-report':
    room('#E8EAEE', C.sand, 446) +
    // стенд с ориентировками
    g('translate(180,198)', r(-84, -72, 168, 144, '#C7CEDA', 10) +
      r(-62, -50, 54, 66, '#EDF0F5', 5) + r(8, -50, 54, 66, '#EDF0F5', 5) +
      line('M-62 36 h124', '#AEB7C6', 7) + line('M-62 56 h78', '#AEB7C6', 7)) +
    counter(112, 384, 388, 150, '#8E97A8', '#727B8C') +
    person({ x: 378, y: 474, scale: 0.8, hair: 'cap', hairColor: '#3B4A66', top: '#4E5C7E', topDark: '#3F4B68', pose: 'reach', legsHidden: true, flip: true }) +
    // бланк заявления и телефон, о котором заявляют
    paper(146, 296, 138, 82, -4) +
    g('translate(322,292) rotate(12)', r(0, 0, 50, 86, C.ink, 12) + r(5, 9, 40, 62, '#5A5666', 6) + c(25, 79, 4, '#5A5666')),

  'taxi-long-way':
    r(0, 0, 612, 612, C.night) +
    r(0, 452, 612, 160, '#2A3049') +
    // город на фоне
    [[70, 250, 62, 202], [148, 300, 54, 152], [216, 220, 70, 232], [300, 292, 58, 160], [372, 246, 66, 206], [452, 306, 60, 146], [524, 262, 62, 190]]
      .map(([x, y, w, h]) => r(x, y, w, h, '#39405E', 6) +
        [0, 1, 2].map((i) => r(x + 12, y + 20 + i * 40, 14, 16, '#F3E7B8', 3, 'opacity="0.75"')).join('')).join('') +
    // такси
    g('translate(306,470)', p('M-190 0 l16 -66 c4 -18 18 -28 38 -28 h146 c20 0 34 10 38 28 l16 66 Z', '#F2C14E') +
      r(-206, 0, 412, 54, '#E0AE3A', 14) +
      r(-116, -84, 96, 52, '#8FA6C4', 8) + r(24, -84, 96, 52, '#8FA6C4', 8) +
      r(-34, -132, 68, 30, '#F7F1E2', 8) +
      c(-118, 56, 34, C.ink) + c(118, 56, 34, C.ink) +
      c(-118, 56, 14, '#6E6A7C') + c(118, 56, 14, '#6E6A7C')) +
    // счётчик
    bubble(360, 178, 172, 96) +
    g('translate(382,206)', line('M0 0 h58', C.red, 13) + line('M74 0 h40', C.red, 13) + line('M0 34 h100', C.sandDeep, 9)),

  'the-empty-chair':
    room('#EFE6DC', '#DCCBB6', 452) +
    // подвесная лампа
    line('M306 60 v72', C.greyDark, 6) +
    p('M254 132 h104 l26 52 h-156 Z', '#E0A85C') +
    // стол
    e(296, 372, 168, 52, '#C9A97E') +
    e(296, 364, 168, 52, '#DCBB8C') +
    r(282, 392, 28, 120, '#A98A66', 6) +
    // пустой стул
    g('translate(404,336)', r(-46, 0, 92, 22, '#9C7A52', 8) + r(-46, -104, 92, 106, '#B58E63', 14) + r(-38, 22, 14, 92, '#9C7A52', 5) + r(24, 22, 14, 92, '#9C7A52', 5)) +
    // тарелка и бокал на месте
    e(372, 354, 38, 13, C.white) +
    g('translate(214,300)', p('M-16 0 h32 l-6 34 h-20 Z', '#E4E9EC') + r(-3, 34, 6, 26, '#E4E9EC') + e(0, 62, 16, 5, '#E4E9EC')) +
    person({ x: 158, y: 534, scale: 0.72, hair: 'long', hairColor: '#5A4632', top: '#8E6FA8', topDark: '#77598F', legs: C.greyDark, pose: 'phone', mood: 'sad' }),

  // ——— B2 ———————————————————————————————————————————————————————
  'disputing-an-invoice':
    room('#E9E6E0', '#CFC7BC', 446) +
    // подъёмник и колесо
    // снятое колесо и стеллаж с инструментом
    g('translate(158,268)', c(0, 0, 78, C.greyDark) + c(0, 0, 44, '#8C8797') + c(0, 0, 16, C.greyDark) +
      r(-98, 92, 196, 20, '#9AA0A8', 8)) +
    r(388, 138, 158, 136, '#D8D2C8', 10) +
    [0, 1, 2].map((i) => line(`M412 ${176 + i * 36} h110`, '#B9B2A6', 8)).join('') +
    counter(112, 386, 388, 148, '#7E8794', '#666E7A') +
    person({ x: 386, y: 474, scale: 0.78, hair: 'short', hairColor: C.ink, top: '#4A6E7A', topDark: '#3B5A64', pose: 'reach', legsHidden: true, mood: 'cross', flip: true }) +
    // счёт на стойке, последняя строка красная
    paper(152, 292, 150, 88, -5) +
    g('translate(184,352) rotate(-5)', line('M0 0 h84', C.red, 9)),

  'essay-extension':
    room('#EDE9E0', C.sand, 452) +
    // книжная полка
    g('translate(96,138)', r(0, 0, 190, 200, '#C9A97E', 10) +
      [0, 1].map((row) => [0, 1, 2, 3, 4].map((i) =>
        r(14 + i * 34, 16 + row * 96, 24, 76, [C.red, C.blue, C.green, C.warmDeep, C.rose][i], 4)).join('') +
        r(8, 96 + row * 96, 174, 10, '#9C7A52', 3)).join('')) +
    person({ x: 196, y: 462, scale: 0.76, hair: 'short', hairColor: '#8C8797', top: '#5C6472', topDark: '#4A5260', pose: 'crossed', legsHidden: true, mood: 'cross' }) +
    // стол перекрывает его снизу — так он сидит за столом, а не парит над ним
    r(88, 386, 348, 32, '#B58E63', 8) +
    r(112, 418, 22, 116, '#9C7A52', 6) +
    r(390, 418, 22, 116, '#9C7A52', 6) +
    paper(266, 340, 116, 46, -4) +
    back(478, 572, 0.84, C.greenDark, '#3A3A44'),

  'party-nobody-you-know':
    r(0, 0, 612, 612, C.night) +
    // город за перилами
    [[46, 316, 58, 150], [116, 356, 50, 110], [180, 300, 64, 166], [256, 344, 54, 122], [322, 288, 68, 178], [402, 340, 56, 126], [472, 306, 62, 160], [544, 350, 46, 116]]
      .map(([x, y, w, h]) => r(x, y, w, h, '#333A56', 6) +
        [0, 1, 2].map((i) => r(x + 10, y + 18 + i * 36, 12, 14, '#F3E7B8', 3, 'opacity="0.7"')).join('')).join('') +
    c(120, 140, 34, '#F3E7B8') +
    // тёплый прямоугольник двери в квартиру
    r(430, 150, 150, 300, '#F0B96B', 14, 'opacity="0.9"') +
    r(430, 150, 150, 300, 'none', 14, `stroke="#8A6E4C" stroke-width="10"`) +
    // перила
    r(0, 466, 612, 16, '#5A6180', 8) +
    [70, 160, 250, 340, 430, 520].map((x) => r(x, 466, 12, 146, '#4C5474', 5)).join('') +
    person({ x: 218, y: 500, scale: 0.72, hair: 'short', hairColor: '#2E2A38', top: '#4E5A80', topDark: '#3F4A6C', legs: '#2E3450', pose: 'crossed' }) +
    back(410, 566, 0.78, '#6E5A84', '#2E2A38'),

  'turning-down-the-offer':
    room('#EAE7F0', C.sand, 456) +
    // «нет» как жест: две половины, между ними телефонная связь
    // пунктир — это телефонный разговор, а не встреча
    line('M230 296 q76 -96 152 0', '#B9AECD', 7, 'stroke-dasharray="3 16"') +
    bubble(202, 158, 208, 116) +
    g('translate(306,216)', c(0, 0, 42, '#F6E3E1') + line('M-19 -19 l38 38', C.red, 14) + line('M19 -19 l-38 38', C.red, 14)) +
    person({ x: 200, y: 534, scale: 0.76, hair: 'short', hairColor: C.ink, top: '#4A5478', topDark: '#3B4460', legs: C.greyDark, pose: 'phone' }) +
    person({ x: 428, y: 534, scale: 0.72, hair: 'long', hairColor: '#6B4A32', top: '#C97463', topDark: '#AE5D4D', legs: C.greyDark, pose: 'phone', flip: true, mood: 'sad' }),
}

// ---- рендер -------------------------------------------------------------
const sharp = require('sharp')
const path = require('node:path')

const OUT = path.join(__dirname, '..', 'public', 'tutor')
const only = process.argv.slice(2)
const ids = Object.keys(SCENES).filter((id) => !only.length || only.includes(id))
const unknown = only.filter((id) => !SCENES[id])
if (unknown.length) {
  console.error('нет таких сцен:', unknown.join(', '))
  process.exit(1)
}

;(async () => {
  for (const id of ids) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="612" height="612" viewBox="0 0 612 612">${SCENES[id]}</svg>`
    const file = path.join(OUT, `${id}.jpg`)
    await sharp(Buffer.from(svg)).jpeg({ quality: 88, progressive: true }).toFile(file)
    console.log('rendered', id)
  }
  console.log(ids.length, 'из', Object.keys(SCENES).length)
})()
