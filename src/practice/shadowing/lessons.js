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
  // Подборка клиента из Notion (17 роликов: story60, lying, miscomm, argue, smalltalk, selftalk, calm, worksout,
  // selfeducated, hardthings, stoiccalm, nosubs, friendships, egypt, emotions, mistakes, love) скрыта 17.10.2026:
  // эти уроки заново заливают через админку («Библиотека → Шэдоуинг»). Индекс их не содержит, поэтому в «Практике»,
  // у преподавателя в «Назначить практику» и в диплинках их нет. Файлы public/shadowing/<id>.json и источники
  // scripts/shadowing-src/sources.json остались на месте — вернуть урок можно строкой в RAW (см. историю git).
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
