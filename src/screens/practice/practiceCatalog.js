// Карточки «Практики» — редизайн 29.10.2026 (Figma «pitch JTS (Copy)», секция «Практика · редизайн» 7393:14225,
// система карточек 7405:4469). Все тренажёры рисуются одним шаблоном (PracticeTile), а этот модуль только говорит,
// чем карточка отличается: обложкой, бейджем и тем, куда ведёт.
//
// Обложка показывает содержимое раздела (решение владельца 02.11.2026): `collage` — веер из материалов раздела на
// фоне его цвета, `photo` — своя картинка игры во всю обложку. Файлы — public/practice/cards/<id>.webp: часть —
// экспорт обложек макета, остальные собирает scripts/build-practice-card-covers.js. Это иллюстрация раздела, а не
// живые обложки каталога: карточка не ходит за материалами в сеть.
//
// Действие одно из двух: `nav` — свой экран (ключ handleNav в App и, если нужно, `payload`), `list` — полный список
// раздела внутри Практики (бывшее «Посмотреть все»): у каталога на карточке ничего не выбрать, книгу или песню
// ученик выбирает в списке (решение владельца 29.10.2026, экрана каталога в макете нет).
//
// `module` — тренажёр, к которому относится карточка (по нему вкладке ищут место переходы с `filter` и считается
// «N тренажёров»); по умолчанию это id карточки. `tokens` — ключ правила начисления (practiceTokens.js), без него
// чипа токенов нет.

export const CARDS = {
  // Аудирование
  listenchoose: { nav: 'listenchoose', tokens: 'listenchoose' },
  justListen: { nav: 'listen', module: 'listen' },
  cartoons: { nav: 'cartoons' },
  shadowing: { list: true, tokens: 'shadowing' },
  karaoke: { list: true, tokens: 'karaoke' },
  memes: { list: true, tokens: 'memes' },
  tales: { list: true, tokens: 'tales' },
  // Чтение
  reading: { nav: 'reading', tokens: 'reading' },
  books: { list: true },
  comics: { list: true },
  // Письмо
  grammar: { list: true, tokens: 'grammar' },
  prepositions: { nav: 'prepositions' },
  writing: { nav: 'writing', tokens: 'writing' },
  verbs: { nav: 'verbs' },
  workbooks: { list: true },
  // Говорение
  pronunciation: { nav: 'pronunciation' },
  situations: { list: true, tokens: 'situations' },
  speakspin: { nav: 'speakspin' },
  // Грамматика: тренажёры. «Темы по уровням» — раздел «Грамматика · игры» своим экраном (125 тем, хаб движка
  // прототипа); вместо токенов на чипе — число тем.
  topics: { nav: 'grammar-games', module: 'grammarGames', chip: 'practice.card.topics.chip' },
  // Punctuation World — 20 страниц пунктуации и приключение; материал с бэкенда, без квоты.
  punctuation: { nav: 'punctuation' },
  speedReading: { nav: 'speed-reading', badge: 'new' },
  // Грамматика: игры, собранные из других вкладок. «Аркада» больше не зал из двух игр, а две карточки — каждая
  // открывает свою игру; вкладка едет в переходе, чтобы «назад» из игры вернул сюда.
  listening: { nav: 'listening', tokens: 'listening' },
  words: { nav: 'words', tokens: 'words' },
  numbers: { nav: 'numbers', tokens: 'numbers' },
  wordhunt: { nav: 'wordhunt' },
  speak: { nav: 'arcade', payload: { game: 'speak' }, module: 'arcade', badge: 'beta' },
  runner: { cover: 'photo', nav: 'arcade', payload: { game: 'runner' }, module: 'arcade', badge: 'beta' },
}

/** Описание карточки по id или null, если такой нет. */
export function cardOf(id) {
  const card = CARDS[id]
  if (!card) return null
  return {
    id,
    module: card.module || id,
    cover: card.cover || 'collage',
    image: `/practice/cards/${id}.webp`,
    nav: card.nav || null,
    payload: card.payload || null,
    list: Boolean(card.list),
    badge: card.badge || null,
    tokens: card.tokens || null,
    chip: card.chip || null,
    title: `practice.card.${id}.title`,
    desc: `practice.card.${id}.desc`,
  }
}
