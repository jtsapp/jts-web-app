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
// Чем заменить клип (ровно одно из четырёх):
//   use   — другой клип того же урока: нужный кусок трека в файле есть;
//   file  — кусок, вырезанный из целого трека прошлой выгрузки курса
//           (data/course-clips/, режет scripts/selfstudy/cut-clip.js; откуда и
//           какой отрезок — в комментарии к правке);
//   say   — записи нет нигде: текст озвучивает scripts/make-lesson-audio.js тем
//           же голосом, что и слова словаря (public/learning/audio/<level>/);
//   lines — записи нет, а задание про диалог: реплики [голос, текст] озвучивает
//           по ролям scripts/voice-course-dialogs.js. Одним голосом диалог на
//           слух не разобрать — где вопрос, а где ответ.
//
// Найдено сверкой распознанного текста записей с ответом задания (A0 — 16.09,
// A1–B2 — 23.09.2026). Сверяя, подкладывайте перед клипом тишину: если речь
// начинается с первой миллисекунды, распознавание глотает первое слово, и
// целая карточка «See you later» читается как обрезанная «…you later». Но
// каждое «обрезано» перепроверяйте без подкладки, пословно: у коротких клипов
// подкладка местами съедала хвост — «write wrote» читалось как «Write.», а
// «Where from Perth?» пропадало целиком.
const path = require('node:path')

const FIX_ROOT = path.join(__dirname, '..', '..', 'data', 'course-clips')

const FIXES = {
  a0: {
    2: {
      // Navigate 1.4: клип первого диалога кончается на «Hi, I'm Hava», а
      // задание — «Nice to ___ you, Havva». Трек a0_09b9312205.mp3, 3.17–12.43.
      d14_1: { was: 'fd5240202336', file: 'a0/2-d14_1.mp3' },
      // «Gary says: Nice to meet you, Sally» — а клип кончается на «Hi, I'm
      // Sally», и продолжения нет ни в банке урока, ни в прошлой выгрузке.
      d130: {
        was: 'a85b17e418b2',
        lines: [
          ['Noah', "Hello, I'm Gary."],
          ['Grace', "Hi, I'm Sally."],
          ['Noah', 'Nice to meet you, Sally.'],
        ],
      },
    },
    6: {
      // «Первый ответ / второй ответ» на «Hi! How are you?», а в клипе только
      // сам вопрос. Клип же — запись карточки «How are you?», её не трогаем.
      how: {
        was: '19b2535a4c24',
        only: 'task',
        lines: [
          ['Noah', 'Hi! How are you?'],
          ['Grace', 'Fine, thanks. And you?'],
          ['Noah', 'Great, thanks.'],
        ],
      },
      // «Это вопрос? — Да, голос идёт вверх», а звучало утверждение «I'm here
      // to study.». Вопрос того же диалога — трек a0_09b9312205.mp3, 65.32–66.91.
      q3: { was: '9517706ab60a', file: 'a0/6-q3.mp3' },
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
    13: {
      // «Во сколько он ложится спать? — at 7 a.m.», а клип кончается на
      // «finish at 4 a.m.»; продолжения нет ни в банке, ни в прошлой выгрузке.
      night: {
        was: 'ec095ce483e8',
        lines: [
          ['Grace', 'Where do you work?'],
          ['Noah', 'I work in a car factory.'],
          ['Grace', 'What time do you start work?'],
          ['Noah', 'I work nights. I start at 8 p.m. and finish at 4 a.m.'],
          ['Grace', 'And what time do you go to bed?'],
          ['Noah', 'At 7 a.m.'],
        ],
      },
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
    16: {
      // «— Can you swim?» с вариантами «Yes, I can. I can swim well.» и «Yes,
      // but badly.», а в клипе только «Yes, I can.» — выбрать не из чего.
      i1: {
        was: 'e1537d6c0582',
        lines: [
          ['Grace', 'OK, Jack. And can you swim?'],
          ['Noah', 'Yes, I can. I can swim well.'],
        ],
      },
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
    23: {
      // «There ___ six children in our family.» — клип интервью кончается на
      // «I was born in 1980». Трек a0_77e1a5c66e.mp3, 3.76–26.51.
      int: { was: '57f5b8501e7a', file: 'a0/23-int.mp3' },
    },
    24: {
      // «Начальник был доволен?» — рассказ обрезан на «My boss was there
      // and…»; продолжения нет ни в банке, ни в прошлой выгрузке.
      past: {
        was: '6c3b0456352e',
        lines: [
          [
            'Grace',
            "I had a terrible day yesterday. I slept badly, so I got up very late. I had a quick shower, got dressed and went to work. I got to the office two hours late. My boss was there, and he wasn't happy.",
          ],
        ],
      },
    },
  },

  // Треки A1 и A2 — прошлая выгрузка курса:
  // git show 2f4b168f^:public/course/<level>/audio/<трек>.
  a1: {
    9: {
      // Кусок начинался с ответа на прошлый вопрос: «Yes, he does. Does he sell
      // tickets?», а «No, he doesn't» ушло в следующий. A1_L9_3_5.mp3, 22.36–31.04.
      k3_5_3: { was: 'e7eb095af0ba', file: 'a1/9-k3_5_3.mp3' },
    },
    21: {
      // «We don't have any bread, but we have some rice.» — в клипе только
      // первая половина. A1_L21_9_2.mp3, 45.15–49.67.
      k9_3_3: { was: '4b1f1342fd87', file: 'a1/21-k9_3_3.mp3' },
    },
    31: {
      // Фразы съехали на кусок: «music festival» звучал «theatre», «art
      // galleries» — «salsa class», а пара «cinema · theatre» — одним
      // «cinema». Куска «music festival» в банке нет. A1_L31_12_5.mp3.
      k12_5_1: { was: '0e758a1f02e1', file: 'a1/31-k12_5_1.mp3' }, // 5.44–10.76
      k12_5_2: { was: 'e8ff278e1191', file: 'a1/31-k12_5_2.mp3' }, // 17.51–20.07
      k12_5_4: { was: '8a417a13c0d6', use: 'k12_5_5' },
    },
    32: {
      // Пары «I opened the door. — I've opened the door.» звучали одной
      // половиной: вторая лежит соседним куском. Склейка двух клипов курса
      // (cut-clip.js --join).
      k12_12_1: { was: '2246cae675f8', file: 'a1/32-k12_12_1.mp3' }, // + k12_12_2
      k12_12_3: { was: '8776e482da8c', file: 'a1/32-k12_12_3.mp3' }, // + k12_12_4
      // «Could I speak to Ms Martinez, please?» — звучал другой звонок («…the
      // ticket office manager»). A1_L32_12_18.mp3, 12.43–15.95.
      k12_17_2: { was: '80823779315e', file: 'a1/32-k12_17_2.mp3' },
    },
  },

  a2: {
    18: {
      // Фразы «новостей» в банке урока — чужие, ресторанные из урока 30
      // («Could you possibly bring me a cloth?» вместо «I've got some good
      // news»). Track_6.16.mp3 — тот же список фраз учебника.
      rp1: { was: '3ac1b00c6786', file: 'a2/18-rp1.mp3' }, // 5.60–8.24
      rp5: { was: 'cd93f17c89ef', file: 'a2/18-rp5.mp3' }, // 31.76–33.76
      rp7: { was: 'c3d54edd23cc', file: 'a2/18-rp7.mp3' }, // 46.32–48.80
      rp8: { was: 'd527457bae5d', file: 'a2/18-rp8.mp3' }, // 53.36–55.36
      rp9: { was: '3b53eb712683', file: 'a2/18-rp9.mp3' }, // 59.52–61.44
      rp10: { was: '30ca2e7e043e', file: 'a2/18-rp10.mp3' }, // 65.28–67.12
      // «When did the speaker find out? — Just now.» висело на хвосте третьего
      // разговора. Четвёртый — Track_6.14.mp3, 107.44–122.20.
      nw4: { was: 'fa47e8441117', file: 'a2/18-nw4.mp3' },
    },
    20: {
      // Фразы про ночь в манга-кафе звучали репликами собеседования из урока
      // 36 («I've got a university degree in journalism»). Track_7.5.mp3.
      ip1: { was: '002a87f6ff42', file: 'a2/20-ip1.mp3' }, // 5.52–11.60
      ip2: { was: 'e1973d96eb49', file: 'a2/20-ip2.mp3' }, // 16.32–19.76
      ip3: { was: '86cf2d366221', file: 'a2/20-ip3.mp3' }, // 24.64–27.36
      ip4: { was: 'a0491b11f8a7', file: 'a2/20-ip4.mp3' }, // 32.32–35.52
      ip5: { was: '94d806544b3e', file: 'a2/20-ip5.mp3' }, // 40.64–47.28
      ip6: { was: '2f03fe989a2e', file: 'a2/20-ip6.mp3' }, // 52.40–55.52
    },
    // Части радиопередачи и интервью обрезаны раньше ответа: «первые офисы —
    // как школы», «шум снижает продуктивность на 66%», «журнал Shoot» звучали
    // уже в следующем куске. Вырезки подлиннее, с началом следующей части.
    34: { of1: { was: '856926782d94', file: 'a2/34-of1.mp3' } }, // Track_12.1.mp3, 8.72–95.59
    35: { of2: { was: '1fbbdbc59e6a', file: 'a2/35-of2.mp3' } }, // Track_12.1.mp3, 84.59–166.07
    36: { iv1: { was: '59810664f3e7', file: 'a2/36-iv1.mp3' } }, // Track_12.7.mp3, 3.17–48.73
  },

  // B2 режет записи на «части», и вопросы к части N местами спрашивают то,
  // что звучит в хвосте части N−1 или в начале N+1: курс резал не по границам
  // учебника. Вырезки — из треков прошлой выгрузки
  // (git show 5ca72653^:public/course/b2/audio/<трек>), с запасом до нужной фразы.
  b2: {
    1: {
      // «Молчание — знак уважения»: «It shows respect» — начало следующей части.
      l1_silence: { was: 'da5cfe4119b5', file: 'b2/1-l1_silence.mp3' }, // a11.mp3, 82.56–122.48
      // Три безопасные темы: погода («the weather is also a favourite») — там же.
      l1_topics: { was: '35146d898470', file: 'b2/1-l1_topics.mp3' }, // a11.mp3, 154.16–203.28
    },
    11: {
      // «Два слова выдают североамериканца: vacations и fall» — «last fall»
      // звучит в начале следующей части. Склейка: l11_intro + l11_falconry 2.07–7.43.
      l11_intro: { was: '24099fda86af', file: 'b2/11-l11_intro.mp3' },
    },
    12: {
      // «She complained afterwards»: «Did you complain? — I certainly did.»
      // осталось за краем. a210.mp3, 218.43–269.04.
      l12_sabrina_b: { was: '414d2a6c1577', file: 'b2/12-l12_sabrina_b.mp3' },
    },
    22: {
      // «Что такое вторая зима?» — определение в конце первой части. Склейка:
      // l22_dark 66.0–82.0 («We actually have two winters here…») + l22_winters.
      l22_winters: { was: 'db4f04a53d26', file: 'b2/22-l22_winters.mp3' },
    },
    27: {
      // «У известных ярн-бомберов есть команды» — начало третьей части.
      // a47.mp3, 61.68–109.27.
      l27_yarn_b: { was: '49dd63030497', file: 'b2/27-l27_yarn_b.mp3' },
    },
    31: {
      // Картофель, томаты и кабачки — в первой части; что Америка получила из
      // Европы и голод в Ирландии — во второй, а спрашивают о них в третьей.
      l31_exchange_b: { was: '86f2f02e8d50', file: 'b2/31-l31_exchange_b.mp3' }, // a810.mp3, 49.68–147.36
      l31_exchange_c: { was: 'f67d0d03619e', file: 'b2/31-l31_exchange_c.mp3' }, // a810.mp3, 116.88–229.52
    },
    34: {
      // «Послушайте двух последних» — седьмого говорящего в клипе не было.
      l34_bored_d: { was: '0e6d1a38e9da', file: 'b2/34-l34_bored_d.mp3' }, // a53.mp3, 106.28–170.48
    },
    38: {
      // Четыре предложения на пропуски, а звучали два. a112.mp3, 5.28–59.44.
      l38_reported: { was: 'aad0586b8122', file: 'b2/38-l38_reported.mp3' },
    },
    47: {
      // Вещи хипстеров (проигрыватели, камеры, машинки) и их хобби (вязание,
      // столярка) — в хвосте предыдущих частей.
      l47_hipster_c: { was: '7a402b000396', file: 'b2/47-l47_hipster_c.mp3' }, // a1212.mp3, 55.99–128.23
      l47_hipster_e: { was: '9d5b757905b3', file: 'b2/47-l47_hipster_e.mp3' }, // a1212.mp3, 179.55–242.72
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

  // role — зачем клип: 'word' (запись слова на карточке) или 'task' (материал
  // задания). Правка с only: 'task' записи слова не трогает.
  function clip(lessonKey, key, role = 'task') {
    const url = raw(lessonKey, key)
    const hit = lookup(String(lessonKey), key)
    if (!hit || (hit.fix.only && hit.fix.only !== role)) return url
    const { id, lesson, fix } = hit
    if (hashOf(url) !== fix.was) {
      stale.set(id, hashOf(url))
      return url
    }
    applied.add(id)
    if (fix.use) return must(raw(lesson, fix.use), `${id}: в уроке нет клипа ${fix.use}`)
    if (fix.file) return must(fileUrl(fix.file), `${id}: нет файла data/course-clips/${fix.file}`)
    if (fix.lines) {
      return must(
        sayUrl(dialogText(fix.lines)),
        `${id}: нет озвучки диалога — node scripts/voice-course-dialogs.js --src <файл курса ${level}>`,
      )
    }
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

/** Текст диалога целиком: по нему и ищется, и называется файл озвучки. */
const dialogText = (lines) => lines.map(([, text]) => String(text).trim()).join(' ')

/** Диалоги правок уровня (scripts/voice-course-dialogs.js). */
const clipFixDialogs = (level) =>
  Object.values(FIXES[level] || {}).flatMap((keys) => Object.values(keys).map((f) => f.lines).filter(Boolean))

module.exports = { FIXES, FIX_ROOT, clipFixer, clipFixFiles, clipFixTexts, clipFixDialogs, dialogText }
