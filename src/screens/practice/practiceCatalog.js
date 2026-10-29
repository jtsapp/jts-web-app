// Карточки «Практики» — редизайн 29.10.2026 (Figma «pitch JTS (Copy)», секция «Практика · редизайн» 7393:14225,
// система карточек 7405:4469). Все тренажёры рисуются одним шаблоном (PracticeTile), а этот модуль только говорит,
// чем карточка отличается: обложкой, значком, бейджем и тем, куда ведёт.
//
// Обложки три: `tile` — градиент раздела со значком (у тренажёра нет своего каталога), `collage` — коллаж из
// контента раздела, `photo` — своя картинка игры во всю обложку. Картинки коллажей и фото — экспорт обложек макета
// (public/practice/cards/<id>.webp): это иллюстрация раздела, а не живые обложки каталога.
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
  listenchoose: { cover: 'tile', icon: 'image', nav: 'listenchoose', tokens: 'listenchoose' },
  justListen: { cover: 'tile', icon: 'headphones', nav: 'listen', module: 'listen' },
  cartoons: { cover: 'tile', icon: 'videocam', nav: 'cartoons' },
  shadowing: { cover: 'collage', list: true, tokens: 'shadowing' },
  karaoke: { cover: 'collage', list: true, tokens: 'karaoke' },
  memes: { cover: 'collage', list: true, tokens: 'memes' },
  tales: { cover: 'collage', list: true, tokens: 'tales' },
  // Чтение
  reading: { cover: 'tile', icon: 'menu-book', nav: 'reading', tokens: 'reading' },
  books: { cover: 'collage', list: true },
  comics: { cover: 'collage', list: true },
  // Письмо
  grammar: { cover: 'tile', icon: 'school', list: true, tokens: 'grammar' },
  prepositions: { cover: 'tile', icon: 'near-me', nav: 'prepositions' },
  writing: { cover: 'tile', icon: 'edit-note', nav: 'writing', tokens: 'writing' },
  verbs: { cover: 'tile', icon: 'music-note', nav: 'verbs' },
  workbooks: { cover: 'tile', icon: 'auto-stories', list: true },
  // Говорение
  pronunciation: { cover: 'tile', icon: 'volume-up', nav: 'pronunciation' },
  situations: { cover: 'collage', list: true, tokens: 'situations' },
  speakspin: { cover: 'tile', icon: 'sync', nav: 'speakspin' },
  // Грамматика: тренажёры. «Темы по уровням» — раздел «Грамматика · игры» своим экраном (125 тем, хаб движка
  // прототипа); вместо токенов на чипе — число тем.
  topics: { cover: 'tile', icon: 'school', nav: 'grammar-games', module: 'grammarGames', chip: 'practice.card.topics.chip' },
  speedReading: { cover: 'tile', icon: 'speed', nav: 'speed-reading', badge: 'new' },
  // Грамматика: игры, собранные из других вкладок. «Аркада» больше не зал из двух игр, а две карточки — каждая
  // открывает свою игру; вкладка едет в переходе, чтобы «назад» из игры вернул сюда.
  listening: { cover: 'tile', icon: 'headset-mic', nav: 'listening', tokens: 'listening' },
  words: { cover: 'tile', icon: 'visibility', nav: 'words', tokens: 'words' },
  numbers: { cover: 'tile', icon: 'calculate', nav: 'numbers', tokens: 'numbers' },
  wordhunt: { cover: 'tile', icon: 'grid-view', nav: 'wordhunt' },
  speak: { cover: 'tile', icon: 'timer', nav: 'arcade', payload: { game: 'speak' }, module: 'arcade', badge: 'beta' },
  runner: { cover: 'photo', nav: 'arcade', payload: { game: 'runner' }, module: 'arcade', badge: 'beta' },
}

/** Описание карточки по id или null, если такой нет. */
export function cardOf(id) {
  const card = CARDS[id]
  if (!card) return null
  return {
    id,
    module: card.module || id,
    cover: card.cover,
    icon: card.icon || null,
    image: card.cover === 'tile' ? null : `/practice/cards/${id}.webp`,
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
