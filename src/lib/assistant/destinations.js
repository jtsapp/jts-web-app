// Куда Луна умеет вести ученика: открыть раздел и провести тур по экрану.
//
// Это белый список, а не «любой экран из App»: модель называет раздел своим
// id из этой таблицы, и только его сайт и откроет. Чего здесь нет (экзамены,
// звонок, урок по id, IELTS), туда помощник не ведёт — отвечает словами, как
// раньше. Таблица одна на модель и на виджет: модель видит её в системном
// промпте (destinationsText), виджет по ней рисует кнопку и переходит.
//
// nav/payload — ровно то, что зовёт сайдбар или карточка (handleNav в App), без
// своих обходных путей. Поэтому разделы с квотой (ситуации, воркбуки, сказки,
// мемы) открываются списком в Практике — переход «сразу внутрь» в обход
// карточки списал бы уровень из квоты, а карточка сначала спрашивает квоту.
//
// screen — экран, который откроется: по нему виджет понимает, что ученик уже
// здесь (тур — сразу, без перехода), а App — что тот же экран надо открыть
// заново с новой целью (вкладка Практики). tour — у экрана есть тур
// (кнопка «?»); без него метку тура модель не ставит, а виджет её отбрасывает.

export const DESTINATIONS = [
  {
    id: 'home', nav: 'home', screen: 'home', tour: true,
    name: { ru: 'Главная', kk: 'Басты бет', en: 'Home' },
    about: 'уровень, план на сегодня, сильные и слабые навыки, расписание, домашка',
  },
  {
    id: 'learning', nav: 'learning', screen: 'kingdom', tour: true,
    name: { ru: 'Повторение (карта курса)', kk: 'Қайталау (курс картасы)', en: 'Review (course map)' },
    about: 'уроки курса A0–C1 по уровням — в базе знаний это раздел «Обучение»',
  },
  {
    id: 'practice', nav: 'practice', screen: 'practice', tour: true,
    name: { ru: 'Практика', kk: 'Тәжірибе', en: 'Practice' },
    about: 'все тренажёры, по вкладкам навыков',
  },
  {
    id: 'practice-listening', nav: 'practice', payload: { skill: 'listening' }, screen: 'practice',
    name: { ru: 'Практика → Аудирование', kk: 'Тәжірибе → Тыңдалым', en: 'Practice → Listening' },
    about: 'аудирование, «Слушай и выбирай», слова в картинках, числа, Just to Listen, шэдоуинг, караоке',
  },
  {
    id: 'practice-reading', nav: 'practice', payload: { skill: 'reading' }, screen: 'practice',
    name: { ru: 'Практика → Чтение', kk: 'Тәжірибе → Оқылым', en: 'Practice → Reading' },
    about: 'тексты с заданиями, книжки, комиксы, Word Rush',
  },
  {
    id: 'practice-writing', nav: 'practice', payload: { skill: 'writing' }, screen: 'practice',
    name: { ru: 'Практика → Письмо', kk: 'Тәжірибе → Жазылым', en: 'Practice → Writing' },
    about: 'грамматика, «Грамматика · игры», Prepositions World (предлоги), письмо по шагам, неправильные глаголы, воркбуки',
  },
  {
    id: 'practice-speaking', nav: 'practice', payload: { skill: 'speaking' }, screen: 'practice',
    name: { ru: 'Практика → Говорение', kk: 'Тәжірибе → Айтылым', en: 'Practice → Speaking' },
    about: 'шэдоуинг, ситуации, SpeakSpin, караоке, Speak or Die',
  },

  // Тренажёры, которые карточка Практики открывает сразу (без квоты).
  {
    id: 'listening', nav: 'listening', screen: 'listening',
    name: { ru: 'Аудирование: мини-игра', kk: 'Тыңдалым: шағын ойын', en: 'Listening mini-game' },
  },
  {
    id: 'listenchoose', nav: 'listenchoose', screen: 'listenchoose',
    name: { ru: 'Слушай и выбирай', kk: 'Тыңда да таңда', en: 'Listen & Choose' },
  },
  // Каталог мультфильмов приходит с бэкенда; без входа экран сам просит войти.
  {
    id: 'cartoons', nav: 'cartoons', screen: 'cartoons',
    name: { ru: 'Cartoon World (мультфильмы)', kk: 'Cartoon World', en: 'Cartoon World' },
    about: 'мультфильмы на английском A0–C1 (вкладка «Аудирование») и переписка с героем серии после просмотра',
  },
  {
    id: 'words', nav: 'words', screen: 'words',
    name: { ru: 'Слова в картинках', kk: 'Суреттегі сөздер', en: 'Picture Words' },
  },
  {
    id: 'numbers', nav: 'numbers', screen: 'numbers',
    name: { ru: 'Мир чисел Декстера', kk: 'Декстердің сандар әлемі', en: "Dexter's Number World" },
  },
  // Материал Just to Listen и Prepositions World приходит с бэкенда; без входа экран просит войти — Луна ведёт
  // туда же, объяснит уже экран.
  {
    id: 'listen', nav: 'listen', screen: 'listen',
    name: { ru: 'Just to Listen', kk: 'Just to Listen', en: 'Just to Listen' },
    about: 'диктант на слух: слово по буквам, потом предложение с ним; уровни A0–B2 и 16 профессий',
  },
  // Тексты «Скорочтения» тоже с бэкенда; без входа экран сам просит войти.
  {
    id: 'speed-reading', nav: 'speed-reading', screen: 'speed-reading',
    name: { ru: 'Скорочтение', kk: 'Жылдам оқу', en: 'Speed reading' },
    about: 'читать вслух английский текст за бегущей строкой (вкладка «Аудирование»): образец озвучки, запись голоса, процент прочитанного и звёзды',
  },
  // Темы «Грамматики · игр» тоже с бэкенда; без входа экран сам просит войти.
  {
    id: 'grammar-games', nav: 'grammar-games', screen: 'grammar-games',
    name: { ru: 'Грамматика · игры', kk: 'Грамматика · ойындар', en: 'Grammar · games' },
    about: '125 тем грамматики A0–C1 (вкладка «Письмо»): правило с формулами и примерами, потом игры по теме и финальный бой',
  },
  {
    id: 'prepositions', nav: 'prepositions', screen: 'prepositions',
    name: { ru: 'Prepositions World (предлоги)', kk: 'Prepositions World', en: 'Prepositions World' },
    about: 'курс английских предлогов: уроки с картинками и переводом, практика на сценах',
  },
  {
    id: 'reading', nav: 'reading', screen: 'reading',
    name: { ru: 'Чтение: тексты', kk: 'Оқылым: мәтіндер', en: 'Reading texts' },
  },
  {
    id: 'writing', nav: 'writing', screen: 'writing',
    name: { ru: 'Письмо по шагам', kk: 'Қадаммен жазу', en: 'Writing step by step' },
  },
  {
    id: 'verbs', nav: 'verbs', screen: 'verbs',
    name: { ru: 'Неправильные глаголы', kk: 'Бұрыс етістіктер', en: 'Irregular verbs' },
  },
  {
    id: 'speakspin', nav: 'speakspin', screen: 'speakspin',
    name: { ru: 'SpeakSpin', kk: 'SpeakSpin', en: 'SpeakSpin' },
  },
  {
    id: 'arcade', nav: 'arcade', screen: 'arcade',
    name: { ru: 'Аркада (Speak or Die, Word Rush)', kk: 'Аркада (Speak or Die, Word Rush)', en: 'Arcade (Speak or Die, Word Rush)' },
  },

  // Разделы-списки Практики: открываются развёрнутыми, выбор — за учеником.
  {
    id: 'shadowing', nav: 'practice', payload: { filter: 'shadowing' }, screen: 'practice',
    name: { ru: 'Шэдоуинг', kk: 'Шэдоуинг', en: 'Shadowing' },
  },
  {
    id: 'situations', nav: 'practice', payload: { filter: 'situations' }, screen: 'practice',
    name: { ru: 'Ситуации', kk: 'Жағдаяттар', en: 'Situations' },
  },
  {
    id: 'grammar', nav: 'practice', payload: { filter: 'grammar' }, screen: 'practice',
    name: { ru: 'Грамматика', kk: 'Грамматика', en: 'Grammar' },
  },
  {
    id: 'workbooks', nav: 'practice', payload: { filter: 'workbooks' }, screen: 'practice',
    name: { ru: 'Воркбуки', kk: 'Воркбуктер', en: 'Workbooks' },
  },
  {
    id: 'books', nav: 'practice', payload: { filter: 'books' }, screen: 'practice',
    name: { ru: 'Книжки', kk: 'Кітаптар', en: 'Books' },
  },
  {
    id: 'comics', nav: 'practice', payload: { filter: 'comics' }, screen: 'practice',
    name: { ru: 'Комиксы', kk: 'Комикстер', en: 'Comics' },
  },
  {
    id: 'karaoke', nav: 'practice', payload: { filter: 'karaoke' }, screen: 'practice',
    name: { ru: 'Караоке', kk: 'Караоке', en: 'Karaoke' },
  },
  {
    id: 'tales', nav: 'practice', payload: { filter: 'tales' }, screen: 'practice',
    name: { ru: 'Сказки', kk: 'Ертегілер', en: 'Fairy tales' },
  },
  {
    id: 'memes', nav: 'practice', payload: { filter: 'memes' }, screen: 'practice',
    name: { ru: 'Мемы и рилсы', kk: 'Мемдер мен рилстер', en: 'Memes & reels' },
  },

  {
    id: 'tutor', nav: 'tutor', screen: 'tutor-dashboard', tour: true,
    name: { ru: 'Speaking Buddy', kk: 'Speaking Buddy', en: 'Speaking Buddy' },
    about: 'разговор голосом с AI-тьютором, сценарии',
  },
  {
    id: 'vocab', nav: 'vocab', screen: 'vocab', tour: true,
    name: { ru: 'Словарь', kk: 'Сөздік', en: 'Vocabulary' },
  },
  {
    id: 'lessons', nav: 'lessons', screen: 'lessons', tour: true,
    name: { ru: 'Уроки', kk: 'Сабақтар', en: 'Lessons' },
    about: 'расписание занятий с преподавателем, самостоятельные уроки',
  },
  {
    id: 'homework', nav: 'homework', screen: 'homework', tour: true,
    name: { ru: 'Домашняя работа', kk: 'Үй жұмысы', en: 'Homework' },
  },
  {
    id: 'profile', nav: 'profile', screen: 'profile',
    name: { ru: 'Профиль', kk: 'Профиль', en: 'Profile' },
    about: 'язык интерфейса, уведомления, уровень, пересдача теста',
  },
  {
    id: 'pricing', nav: 'pricing', screen: 'pricing',
    name: { ru: 'Тарифы', kk: 'Тарифтер', en: 'Pricing' },
  },
  {
    id: 'minutes', nav: 'minutes', screen: 'minutes',
    name: { ru: 'Минуты AI-тьютора', kk: 'AI-тьютор минуттары', en: 'AI tutor minutes' },
  },
]

const BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]))

/** Раздел по id или null, если такого в белом списке нет. */
export function destinationOf(id) {
  return BY_ID.get(String(id ?? '')) || null
}

/**
 * id раздела, в котором ученик сейчас, — модели в контекст: по одному имени
 * экрана («Практика») она сочиняла id сама («home_practice», живой прогон
 * 15.10.2026). Экран без своего раздела в списке — null.
 */
export function destinationIdForScreen(screen) {
  const d = DESTINATIONS.find((x) => x.screen === screen && !x.payload)
  return d ? d.id : null
}

/** Имя раздела на языке интерфейса — для кнопки под ответом. */
export function destinationName(id, lang = 'ru') {
  const d = destinationOf(id)
  return d ? d.name[lang] || d.name.ru : ''
}

/**
 * Действие, которое виджет может выполнить: открыть раздел или провести тур.
 * Тур — только у экрана, где он есть; иначе null, и метка просто пропадает.
 * @returns {{ kind: 'open'|'tour', target: string, now: boolean } | null}
 */
export function validAction(kind, target, now = false) {
  const d = destinationOf(target)
  if (!d) return null
  if (kind === 'tour' && !d.tour) return null
  if (kind !== 'open' && kind !== 'tour') return null
  return { kind, target: d.id, now: Boolean(now) }
}

/** Список разделов для системного промпта: id, имя, что там и есть ли тур. */
export function destinationsText() {
  return DESTINATIONS.map((d) => {
    const parts = [`- ${d.id} — ${d.name.ru}`]
    if (d.about) parts.push(`: ${d.about}`)
    if (d.tour) parts.push(' (есть тур)')
    return parts.join('')
  }).join('\n')
}
