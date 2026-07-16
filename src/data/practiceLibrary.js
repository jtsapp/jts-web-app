// Каталог hosted-библиотек «Практики», извлечённый из self-contained HTML
// (public/practice/books.html и fairytales.html).
//
// СКАЗКИ — точные данные из реестра fairytales.html: title / desc / len / chars
// и родной градиент обложки (coverGrad), поэтому карточки выглядят так же, как
// в самой библиотеке. КНИЖКИ — 25 классических произведений из массива BOOKS
// books.html; заголовок/CEFR/градиент заданы здесь (в файле обложки лежат
// вместе с полным текстом книги, отдельного реестра нет).
//
// Клик по карточке открывает соответствующую библиотеку (deep-link внутрь
// конкретной книги/сказки в HTML не поддерживается).

// ── Сказки (fairytales.html) ────────────────────────────────────────────────
export const TALES = [
  {
    id: 'snow_queen',
    title: 'The Snow Queen',
    desc: "Andersen's winter epic — a girl crosses the frozen world to melt the ice in her dearest friend's heart.",
    len: '25–40 мин',
    chars: 3,
    grad: ['#2a3f6b', '#0a1024'],
    motif: '❄️',
  },
  {
    id: 'little_mermaid',
    title: 'The Little Mermaid',
    desc: "The Sea King's youngest daughter trades her voice and home for a pair of legs — Andersen's tender, bittersweet tale.",
    len: '25–40 мин',
    chars: 1,
    grad: ['#2c6fa6', '#08213b'],
    motif: '🧜‍♀️',
  },
  {
    id: 'sleeping_beauty',
    title: 'Sleeping Beauty',
    desc: 'A cursed spindle, a hundred-year sleep, and a hedge of thorns that opens only for love — the classic fairy tale, retold.',
    len: '20–35 мин',
    chars: 1,
    grad: ['#b07ac0', '#2a1440'],
    motif: '🌹',
  },
  {
    id: 'frog_prince',
    title: 'The Frog Prince',
    desc: 'Brothers Grimm — a spoiled princess makes a careless promise to a frog and learns that a word given must be a word kept.',
    len: '15–25 мин',
    chars: 3,
    grad: ['#2f7d46', '#0d1a12'],
    motif: '🐸',
  },
  {
    id: 'little_red_riding_hood',
    title: 'Little Red Riding Hood',
    desc: 'Perrault & the Brothers Grimm — a little girl in a red hood meets a cunning wolf in the great wood.',
    len: '15–25 мин',
    chars: 3,
    grad: ['#b23a2a', '#1a0e0a'],
    motif: '🔴',
  },
  {
    id: 'aldar_kose',
    title: 'Aldar Köse, the Beardless Trickster',
    desc: 'Kazakh steppe folklore — a penniless trickster outwits greedy bais and desert shaitans with nothing but his lightning wit.',
    len: '15–30 мин',
    chars: 3,
    grad: ['#c98a3c', '#5a3416'],
    motif: '🦊',
  },
  {
    id: 'qanbaq_shal',
    title: 'Qañbaq Shal, the Tumbleweed Old Man',
    desc: 'A Kazakh folk tale — a poor old man so light the wind rolls him away outwits a bully fox and a camp of giants with his wits.',
    len: '15–25 мин',
    chars: 3,
    grad: ['#c98a3c', '#5a3416'],
    motif: '🍃',
  },
  {
    id: 'er_tostik',
    title: 'Er-Töstik',
    desc: 'A Kazakh steppe epic — a hero crosses the worlds above and below, gathering wonders, to win his bride back from a peri’s curse.',
    len: '30–45 мин',
    chars: 3,
    grad: ['#c98a3c', '#3a2410'],
    motif: '🐎',
  },
  {
    id: 'ayaz_bi',
    title: 'Ayaz Bi, the Wise Judge',
    desc: "A Kazakh folk epic — a penniless herdsman out-thinks a khan's forty viziers and rises to rule five khanates with a humble heart.",
    len: '30–45 мин',
    chars: 3,
    grad: ['#c98a3c', '#4a3016'],
    motif: '⚖️',
  },
  {
    id: 'altyn_saqa',
    title: 'Altyn Saqa, the Golden Knucklebone',
    desc: "Kazakh steppe folklore — a rich man's son rides a mangy colt that becomes a winged tulpar and outwits the devouring Jalmauyz Kempir.",
    len: '15–30 мин',
    chars: 1,
    grad: ['#caa63c', '#3a2a10'],
    motif: '🪙',
  },
]

// ── Книжки (books.html) — 25 классических произведений (порядок массива BOOKS) ─
export const BOOKS = [
  { id: 'treasure', title: 'Treasure Island', cefr: 'B1', grad: ['#1f6f8b', '#0b2a36'], motif: '🏴‍☠️' },
  { id: 'junglebook', title: 'The Jungle Book', cefr: 'A2', grad: ['#3f8a3f', '#123012'], motif: '🐯' },
  { id: 'oz', title: 'The Wonderful Wizard of Oz', cefr: 'A1', grad: ['#3aa07a', '#0f2e28'], motif: '🌪️' },
  { id: 'alice', title: "Alice's Adventures in Wonderland", cefr: 'A2', grad: ['#c85a9c', '#3a103a'], motif: '🐇' },
  { id: 'peterpan', title: 'Peter Pan', cefr: 'A2', grad: ['#2f7d9c', '#0b2536'], motif: '🧚' },
  { id: 'robinson', title: 'Robinson Crusoe', cefr: 'B1', grad: ['#b8863c', '#4a2f12'], motif: '🏝️' },
  { id: 'frankenstein', title: 'Frankenstein', cefr: 'B2', grad: ['#4a5a3a', '#12160e'], motif: '⚡' },
  { id: 'dracula', title: 'Dracula', cefr: 'B2', grad: ['#7a1f2a', '#1a0709'], motif: '🦇' },
  { id: 'secretgarden', title: 'The Secret Garden', cefr: 'A2', grad: ['#4f9d5a', '#14301a'], motif: '🌷' },
  { id: 'aroundworld', title: 'Around the World in 80 Days', cefr: 'B1', grad: ['#c07a2c', '#3a2410'], motif: '🎈' },
  { id: 'janeeyre', title: 'Jane Eyre', cefr: 'B2', grad: ['#6a4a7a', '#1e1230'], motif: '🕯️' },
  { id: 'pride', title: 'Pride and Prejudice', cefr: 'B2', grad: ['#b06a8c', '#3a1a2c'], motif: '💌' },
  { id: 'anne', title: 'Anne of Green Gables', cefr: 'B1', grad: ['#4f9d7a', '#123028'], motif: '🌾' },
  { id: 'littlewomen', title: 'Little Women', cefr: 'B1', grad: ['#b0724a', '#3a1e12'], motif: '🧶' },
  { id: 'tomsawyer', title: 'The Adventures of Tom Sawyer', cefr: 'B1', grad: ['#7a9d3c', '#243010'], motif: '🪝' },
  { id: 'gatsby', title: 'The Great Gatsby', cefr: 'B2', grad: ['#c9a63c', '#2a2010'], motif: '🥂' },
  { id: 'dorian', title: 'The Picture of Dorian Gray', cefr: 'C1', grad: ['#4a6a5a', '#0e1a14'], motif: '🖼️' },
  { id: 'huck', title: 'The Adventures of Huckleberry Finn', cefr: 'B2', grad: ['#a0803c', '#2e2410'], motif: '🛶' },
  { id: 'hound', title: 'The Hound of the Baskervilles', cefr: 'B1', grad: ['#3a4a5a', '#0c1218'], motif: '🐕' },
  { id: 'wh', title: 'Wuthering Heights', cefr: 'C1', grad: ['#5a5a6a', '#141420'], motif: '🌫️' },
  { id: 'greatexpectations', title: 'Great Expectations', cefr: 'B2', grad: ['#7a6a3c', '#221e10'], motif: '⚙️' },
  { id: 'ulysses', title: 'Ulysses', cefr: 'C1', grad: ['#2f6a8c', '#0b2030'], motif: '🗺️' },
  { id: 'ageofinnocence', title: 'The Age of Innocence', cefr: 'C1', grad: ['#9c6a7a', '#2e1a22'], motif: '🎭' },
  { id: 'scarletletter', title: 'The Scarlet Letter', cefr: 'C1', grad: ['#8c2f3a', '#20090d'], motif: '🅰️' },
  { id: 'invisibleman', title: 'The Invisible Man', cefr: 'B1', grad: ['#4a7a7a', '#0e2222'], motif: '🫥' },
]
