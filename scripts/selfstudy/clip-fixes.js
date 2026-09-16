// Правки привязки записей в файлах self-study курса.
//
// Записи курса — нарезка треков учебника (Navigate): трек режут на куски по
// паузам, и ключ клипа — номер куска (f3, f5, f7…; чётные — номера пунктов,
// «1.», «2.»). В части заданий автор курса промахнулся с номером — чаще всего
// на пункт трека: первым в треке стоит пример из учебника, а вопросы начаты с
// него. Движок курса играет ровно то, что указано, поэтому студент слышит
// соседнюю фразу: «Когда Женский день?» — а в записи высадка на Луну, и так
// до конца упражнения. Длинные диалоги, наоборот, резали окном фиксированной
// длины (~15 с), и ответ на вопрос оставался за краем клипа.
//
// Экстрактор переносит привязку как есть, а шаги пересобираются из файла курса
// целиком, поэтому чинить её приходится здесь, а не в данных.
//
// Каждая правка помнит, какой клип курс ставит сейчас (`was` — начало sha1
// файла, как в имени public/course/<level>/audio/<хэш>.mp3). Если методисты
// починят файл курса, привязка сменится, правка перестанет совпадать, и
// экстрактор остановится с ошибкой, а не наложит её вслепую поверх уже
// исправленного.
//
// Чем заменить клип (ровно одно из трёх):
//   use  — другой клип того же урока: нужный кусок трека в файле есть;
//   file — кусок, вырезанный из целого трека прошлой выгрузки курса
//          (data/course-clips/, режет scripts/selfstudy/cut-clip.js; откуда и
//          какой отрезок — в комментарии к правке);
//   say  — записи нет нигде: текст озвучивает scripts/make-lesson-audio.js тем
//          же голосом, что и слова словаря (public/learning/audio/<level>/).
//
// Найдено сверкой распознанного текста каждой записи A0 с ответом задания.
// Сверяя, подкладывайте перед клипом тишину: если речь начинается с первой
// миллисекунды, распознавание глотает первое слово, и целая карточка «See you
// later» читается как обрезанная «…you later».
const path = require('node:path')

const FIX_ROOT = path.join(__dirname, '..', '..', 'data', 'course-clips')

const FIXES = {
  a0: {
    2: {
      // Navigate 1.4: клип первого диалога кончается на «Hi, I'm Hava», а
      // задание — «Nice to ___ you, Havva». Трек a0_09b9312205.mp3, 3.17–12.43.
      d14_1: { was: 'fd5240202336', file: 'a0/2-d14_1.mp3' },
    },
    8: {
      // «Утверждение или отрицание?» (ответ — «there aren't any hotels»), а
      // звучал соседний кусок «There are supermarkets and banks».
      e11: { was: 'b71aa7f2f56f', use: 'e13' },
      // «There ___ a theatre.» — звучало «There aren't any hotels», нужного
      // куска в файле нет.
      e13: { was: '5146e33fedf9', say: "There isn't a theatre." },
    },
    11: {
      // «Выберите время: 7:33» — на куске t13 звучит «5:20», записи 7:33 нет.
      t13: { was: 'defaafd6dd05', say: 'seven thirty-three' },
    },
    12: {
      // Navigate 8.9: первым идёт пример про высадку на Луну, и все три
      // вопроса съехали на пункт назад. Mandela (кусок f9) в файл не попал —
      // трек a0_25315ebc54.mp3, 30.61–36.19.
      f3: { was: 'd19a7a678b9d', use: 'f5' },
      f5: { was: 'cab8548991f4', use: 'f7' },
      f7: { was: '6a688207182e', file: 'a0/12-f9.mp3' },
      // Navigate 8.25 — тот же сдвиг (первым идёт «1916»); «13th May» нет
      // ни в файле, ни в прошлой выгрузке.
      x3: { was: 'a65258ca3417', use: 'x5' },
      x5: { was: '92df1c0b08d1', use: 'x7' },
      x7: { was: '988b7b445f1d', say: 'the thirteenth of May' },
      // m<N> и o<N> — N-й кусок трека, то есть месяц и число N−1 (первым
      // идёт номер пункта). У January и first автор это учёл, у July и
      // twelfth — нет: звучали November и eleventh.
      m12: { was: '39b3821c86f2', say: 'July' },
      o12: { was: '5ba8c0a2df28', say: 'twelfth' },
    },
    14: {
      // «Что вы слышите?» и «The trains ___ go to Essex Road.» — у всех трёх
      // заданий звучал предыдущий кусок трека.
      n3: { was: '686d442d7e10', use: 'n5' },
      n7: { was: 'bf72e30bfadc', use: 'n9' },
      n9: { was: '2877fbd51ddf', use: 'n11' },
    },
    15: {
      // «Какой вопрос вы слышите?» (ответ — When does your family eat
      // dinner?): звучал вариант-обманка «What music do you like?».
      q13: { was: 'cd14cdbb58c8', use: 'q11' },
    },
    18: {
      // Клип обрывается на «I like…», а задание — «I like ___ and listening to
      // music at home». Трек a0_be64c01802.mp3, 17.97–36.35.
      h2: { was: '4540c281aadf', file: 'a0/18-h2.mp3' },
    },
    19: {
      // Карточки напитков съехали на кусок: orange juice говорила «water»,
      // water — «milk». Своего куска у orange juice в файле нет.
      f7: { was: '2d4011137657', say: 'orange juice' },
      f8: { was: 'a227aab7f406', use: 'f7' },
      // «Что официант предлагает сначала?» — клип кончался до официанта.
      // Трек a0_6f14a8746e.mp3, 5.01–27.03.
      cafe: { was: 'df6ddba553fb', file: 'a0/19-cafe.mp3' },
      // «___ like a tea.» — звучало «When would you like to go?».
      w4: { was: 'a60b8e16ec58', say: "I'd like a tea." },
    },
    21: {
      // Текст про Окленд обрезан на «the temperature is 20 to…», а вопрос —
      // про дожди зимой. Трек a0_c8a73e3a50.mp3, 4.13–45.39.
      auck: { was: '527d1777ccf4', file: 'a0/21-auck.mp3' },
    },
    22: {
      // Диалог обрезан на «Well…» — до кафе у школы и «OK, that's a good
      // idea», о которых задания. Трек a0_660812797b.mp3, 4.09–26.35.
      go: { was: '4a3fffe013aa', file: 'a0/22-go.mp3' },
    },
  },
}

const hashOf = (url) => (url ? path.basename(url, '.mp3') : null)

/**
 * Поиск клипа урока с правками уровня.
 *
 * Тест юнита не имеет своих записей: движок курса берёт задание из урока и
 * везёт его клип под ключом `l<урок>_<ключ>`. Правка урока действует и там.
 *
 * @param {string} level
 * @param {(lessonKey: string, key: string) => string|null} raw  URL клипа по привязке курса
 * @param {{fileUrl: (rel: string) => string|null, sayUrl: (text: string) => string|null}} media
 * @param {object} [table]  правки уровня (для тестов)
 */
function clipFixer(level, raw, { fileUrl, sayUrl }, table = FIXES[level] || {}) {
  const applied = new Set()
  const stale = new Map()

  const lookup = (lessonKey, key) => {
    const own = table[lessonKey] && table[lessonKey][key]
    if (own) return { id: `${lessonKey}:${key}`, lesson: String(lessonKey), fix: own }
    const m = /^l(\d+)_(.+)$/.exec(key)
    const carried = m && table[m[1]] && table[m[1]][m[2]]
    return carried ? { id: `${m[1]}:${m[2]}`, lesson: m[1], fix: carried } : null
  }

  const must = (url, why) => {
    if (!url) throw new Error(`правка записи ${why}`)
    return url
  }

  function clip(lessonKey, key) {
    const url = raw(lessonKey, key)
    const hit = lookup(String(lessonKey), key)
    if (!hit) return url
    const { id, lesson, fix } = hit
    if (hashOf(url) !== fix.was) {
      stale.set(id, hashOf(url))
      return url
    }
    applied.add(id)
    if (fix.use) return must(raw(lesson, fix.use), `${id}: в уроке нет клипа ${fix.use}`)
    if (fix.file) return must(fileUrl(fix.file), `${id}: нет файла data/course-clips/${fix.file}`)
    return must(
      sayUrl(fix.say),
      `${id}: нет записи «${fix.say}» — node scripts/make-lesson-audio.js --level ${level} --only words`,
    )
  }

  /** Что сработало, что разошлось с файлом курса и что не встретилось вовсе. */
  function report() {
    const all = Object.entries(table).flatMap(([lesson, keys]) => Object.keys(keys).map((k) => `${lesson}:${k}`))
    return {
      applied: all.filter((id) => applied.has(id) && !stale.has(id)),
      stale: [...stale].map(([id, now]) => {
        const [lesson, key] = id.split(':')
        return `${id}: курс ставит ${now || 'ничего'}, правка ждёт ${table[lesson][key].was}`
      }),
      unused: all.filter((id) => !applied.has(id) && !stale.has(id)),
    }
  }

  return { clip, report }
}

/** Файлы-вырезки уровня (относительно data/course-clips/). */
const clipFixFiles = (level) =>
  Object.values(FIXES[level] || {}).flatMap((keys) => Object.values(keys).map((f) => f.file).filter(Boolean))

/** Тексты, которые надо озвучить (scripts/make-lesson-audio.js). */
const clipFixTexts = (level) => [
  ...new Set(Object.values(FIXES[level] || {}).flatMap((keys) => Object.values(keys).map((f) => f.say).filter(Boolean))),
]

module.exports = { FIXES, FIX_ROOT, clipFixer, clipFixFiles, clipFixTexts }
