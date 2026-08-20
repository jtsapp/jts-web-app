// Индекс уроков Shadowing: только метаданные для карточек «Практики» и табов
// плеера. Сами фразы лежат в public/shadowing/<id>.json и грузятся по
// требованию — см. lessonContent.js. Раньше сегменты жили прямо здесь, и на
// пяти уроках файл весил 46 КБ; с ростом подборки правка одного слова в фразе
// превращалась в коммит в src/.
//
// short — имя спикера (табы уроков и подпись на карточке). title — полное
// название урока. Названия и английские фразы не локализуются.
//
// segCount дублирует длину segments из JSON: карточка в «Практике» рисует
// «сделано N из M» ещё до того, как урок открыт, а тянуть ради счётчика все
// файлы уроков не хочется. Расхождение ловит content.test.js.

const RAW = [
  { id: 'sg', title: 'Speak Like Selena Gomez', short: 'Selena Gomez', video: 'jG-4kBIDAzA', segCount: 66 },
  { id: 'v2', title: 'Steve Jobs · Stanford Commencement', short: 'Steve Jobs', video: '1i9kcBHX2Nw', segCount: 88 },
  { id: 'v3', title: 'Emma Watson · HeForShe (UN)', short: 'Emma Watson', video: 'nIwU-9ZTTJc', segCount: 58 },
  { id: 'v4', title: 'Oprah Winfrey · Award Speech', short: 'Oprah', video: 'u1gg_L-syCw', segCount: 12 },
  { id: 'v5', title: 'Barack Obama · Victory Speech 2008', short: 'Obama', video: 'mi8N5gDVpeg', segCount: 52 },
  // Подборка клиента из Notion (scripts/shadowing-src/sources.json): короткие
  // ролики на 4–5 минут, речь быстрее и разговорнее, чем в речах выше.
  { id: 'story60', title: 'The Secret to Telling a Great Story', short: 'Jenny Hoyos', video: 'ZmNpeXTj2c4', segCount: 56 },
  { id: 'lying', title: 'The Language of Lying', short: 'Noah Zandan', video: 'H0-WkpmTPrM', segCount: 47 },
  { id: 'miscomm', title: 'How Miscommunication Happens', short: 'Katherine Hampsten', video: 'gCfzeONu3Mo', segCount: 40 },
  { id: 'argue', title: 'How to Argue · Harvard Negotiator', short: 'Dan Shapiro', video: 'IDj1OBG5Tpw', segCount: 54 },
  { id: 'smalltalk', title: 'How to Never Run Out of Things to Say', short: 'Smartish Stuff', video: '4816yu9QNro', segCount: 23 },
  { id: 'selftalk', title: 'Is It Normal to Talk to Yourself?', short: 'TED-Ed', video: 'iNyUmbmQQZg', segCount: 38 },
  { id: 'calm', title: 'How to Stay Calm Under Pressure', short: 'Noa Kageyama', video: 'CqgmozFr_GM', segCount: 31 },
  { id: 'worksout', title: 'What If It Actually Works Out?', short: 'Buildingminds', video: '5aR-5cNABAI', segCount: 29 },
  { id: 'selfeducated', title: 'The Art of Becoming Dangerously Self-Educated', short: 'Realith', video: 'w8Qv9czi7j8', segCount: 12 },
  { id: 'hardthings', title: 'How to Force Your Brain to Crave Hard Things', short: 'RelentX', video: '8SCv88yriYs', segCount: 12 },
  { id: 'stoiccalm', title: 'The Greek Method to Become Impossibly Calm', short: 'Logz', video: 'oJqzuMHhxoc', segCount: 18 },
  { id: 'nosubs', title: 'How to Understand English Movies Without Subtitles', short: 'The English Class', video: 'tB88DEBk5tw', segCount: 35 },
  { id: 'friendships', title: 'How Some Friendships Last', short: 'Iseult Gillespie', video: 'kOVdiDUlNsg', segCount: 42 },
  { id: 'egypt', title: 'A Day in the Life of an Ancient Egyptian Doctor', short: 'TED-Ed', video: '2rvLEJrQm7g', segCount: 50 },
  { id: 'emotions', title: 'How to Manage Your Emotions', short: 'TED-Ed', video: 'Uew5BbvmLks', segCount: 35 },
  { id: 'mistakes', title: 'How to Overcome Your Mistakes', short: 'TED-Ed', video: 'eBz7iUJu9UM', segCount: 33 },
  { id: 'love', title: 'Why Do We Love? A Philosophical Inquiry', short: 'Skye C. Cleary', video: 'yJSiUm6jvI0', segCount: 53 },
  // dream и tired нарезаны и лежат в public/shadowing/, но в индекс не идут:
  // в их транскриптах нет ни одной точки — сплошной поток слов, границы фраз
  // произвольные. Причина записана в scripts/shadowing-src/sources.json (hold).
]

// Обложка ролика — превью YouTube. Берём mqdefault (320×180): это ЧЕСТНЫЙ 16:9
// без чёрных полос и есть у всех роликов. hqdefault (480×360) — 4:3 с
// letterbox'ом, из-за которого обложки кропались по-разному и одна «вылезала».
// maxresdefault красивее, но есть не у всех (у Обамы 404).
export const LESSONS = RAW.map((lesson) => ({
  ...lesson,
  cover: `https://i.ytimg.com/vi/${lesson.video}/mqdefault.jpg`,
}))

// Урок по id; фолбэк на первый — чтобы битый диплинк не ронял экран.
export function getLesson(id) {
  return LESSONS.find((l) => l.id === id) || LESSONS[0]
}
