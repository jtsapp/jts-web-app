// Текст из разметки курса: снимаем теги и раскрываем сущности.
//
// Жил внутри scripts/build-course-steps.js, пока тот резал шаги уроков. Курс
// нового поколения собирается своим экстрактором, а озвучке
// (scripts/make-lesson-audio.js) эта функция по-прежнему нужна — читать вслух
// «&ldquo;We meet up after work&rdquo;» нельзя.
//
// Сущности раскрываем таблицей, а не цепочкой replace: список рос по одной
// штуке, и в шагах однажды осталось 248 неразобранных «&ldquo;» — студент
// читал их прямо в вопросе.
const ENTITIES = {
  mdash: '—',
  ndash: '–',
  hellip: '…',
  middot: '·',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  rarr: '→',
  larr: '←',
  eacute: 'é',
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
}

const strip = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (m, n) => {
      const code = Number(n)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
    })
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()

module.exports = { strip, ENTITIES }
