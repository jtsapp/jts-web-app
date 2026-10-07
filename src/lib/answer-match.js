// Сверка текстового ответа студента с эталоном — одна на все плееры заданий
// («Обучение», грамматика, live-уроки).
//
// Почему отдельный модуль: у каждого плеера был свой norm(), и все они
// расходились с движком исходного курса (public/course/<level>/engine.js).
// Из-за этого урок A0 «Coffee — yes. Mondays — no.» браковал верные ответы:
//   • студент печатает «do not», в данных лежит «don't» — движок курса
//     принимает оба, наши плееры принимали только второе;
//   • в данных B2/C1 апостроф типографский (don’t, U+2019), а norm() вырезал
//     только ASCII-кавычку, так что «don't» с клавиатуры не совпадало ни с чем.
// Правила ниже — порт norm()/CONTRACT/extendsAnswer из движка курса.
//
// Ревью 08.10.2026 («правильный ответ засчитывают за неправильный»): апостроф
// стирался ДО таблицы стяжений, а в таблице не было 'll/'d/'s. «I'll»
// превращалось в «ill», «It's» — в «its», «he'd» — в «hed», и с полной формой
// они не совпадали никогда (a2 u118 «I will», a2 u30 «It is», b2 u23 «It's
// expected»). А в упражнениях ровно на апостроф стирание засчитывало ошибки:
// its = it's, were = we're, boys = boy's = boys'. Поэтому апостроф теперь
// значим: стяжение раскрывается в полную форму (будь он поставлен или нет), а
// притяжательное «'s» и пары-омонимы остаются разными словами.

// Стяжение без апострофа (на телефоне его часто не ставят) → оно же с
// апострофом; дальше обе формы раскрываются одинаково, поэтому «dont» =
// «don't» = «do not». В таблицу НЕ входят its (it's) и were (we're): их
// путают по-настоящему, и упражнения грамматики проверяют ровно это («it's or
// its?»). А ill / well / hell / shell / id / wed / shed входят, хоть и сами
// слова: «Ill call you» — это пропущенный апостроф, а не «больной», и браковать
// такой ответ значит наказывать за клавиатуру телефона.
const BARE = {
  ill: "i'll",
  well: "we'll",
  hell: "he'll",
  shell: "she'll",
  id: "i'd",
  wed: "we'd",
  shed: "she'd",
  dont: "don't",
  doesnt: "doesn't",
  didnt: "didn't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  havent: "haven't",
  hasnt: "hasn't",
  hadnt: "hadn't",
  wont: "won't",
  wouldnt: "wouldn't",
  shouldnt: "shouldn't",
  couldnt: "couldn't",
  mustnt: "mustn't",
  neednt: "needn't",
  mightnt: "mightn't",
  shant: "shan't",
  cant: "can't",
  cannot: "can't",
  im: "i'm",
  ive: "i've",
  youre: "you're",
  youve: "you've",
  youll: "you'll",
  youd: "you'd",
  weve: "we've",
  theyre: "they're",
  theyve: "they've",
  theyll: "they'll",
  theyd: "they'd",
  itll: "it'll",
  hes: "he's",
  hed: "he'd",
  shes: "she's",
  whats: "what's",
  thats: "that's",
  theres: "there's",
  heres: "here's",
  whos: "who's",
  wheres: "where's",
  hows: "how's",
  lets: "let's",
  shouldve: "should've",
  wouldve: "would've",
  couldve: "could've",
  mustve: "must've",
}

// «n't» после этих основ — не «основа + not»: won't → will, can't → can.
const NOT_STEM = { wo: 'will', ca: 'can', sha: 'shall', ai: 'am' }

// После каких слов «'s» — это is/has, а не притяжательный падеж. У остальных
// («Tom's», «the boy's») апостроф оставляем: «Toms» и «Tom's» в коротком
// ответе — разные ответы.
const S_IS = new Set([
  'it', 'he', 'she', 'what', 'that', 'there', 'here', 'who', 'where', 'how', 'when', 'why',
  'everyone', 'everybody', 'someone', 'somebody', 'nobody', 'everything', 'something', 'nothing',
])

// Общая для обоих режимов подготовка строки: регистр, сущности, разновидности
// апострофа и тире, числа.
function prepare(value) {
  const raw = Array.isArray(value) ? value.join(' ') : value
  return (
    String(raw ?? '')
      .toLowerCase()
      // Сущности апострофа, не раскрытые при разборе урока. Курс пишет апостроф как
      // `&#x27;`, и пока конвертер эту форму не понимал, в эталон попадал текст
      // «don&#x27;t»: знаки препинания ниже резали его на «don x27t», и ответ не
      // совпадал ни с чем — задание становилось непроходимым.
      //
      // Конвертер исправлен, но уже зарегистрированные уроки хранят разобранный
      // текст в базе и починятся только при перерегистрации уровня. Снимаем
      // сущность и здесь, чтобы старые уроки заработали сразу.
      .replace(/&(?:#x27|#39|apos|rsquo|lsquo);/gi, "'")
      .replace(/[‘’ʼ´`]/g, "'")
      .replace(/[‐-―−]/g, '-')
      // «£2,000» и «£2000» — одно число (b1 u10: модельный ответ из пояснения
      // браковался, запятая становилась пробелом).
      .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
      // «8pm», «8 pm», «8 p.m.» — одно время (b1 u121).
      .replace(/(\d)\s*([ap])\.?\s*m\.?(?![a-z])/g, '$1 $2m')
  )
}

// Слова строки после снятия знаков; апостроф остаётся частью слова.
function words(prepared) {
  return prepared
    .replace(/[.,!?;:"“”…()[\]{}\/\\|<>*_+=~^&%$#@]/g, ' ')
    .replace(/\s*-\s*/g, ' ') // дефис считаем пробелом: well-known == well known
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      // Апостроф-кавычка вокруг слова ('Add file'), а не часть слова. Хвост «s'»
      // — притяжательный падеж множественного числа (the boys'), его не трогаем,
      // как и отдельное окончание «'s» — ответ задания «Tom___ bag».
      if (/^'(s|d|ll|re|ve|m)$/.test(w) || w === "'") return w
      let t = w.replace(/^'+(?=[a-z0-9])/, '')
      // Без lookbehind: старые Safari его не знают и роняют весь бандл
      // (см. src/lib/safariSyntax.test.js).
      if (!/s'$/.test(t)) t = t.replace(/([a-z0-9])'+$/, '$1')
      return t
    })
    .filter(Boolean)
}

// Слово → варианты его раскрытия (каждый вариант — массив слов). У «'s» после
// местоимения и у «'d» вариантов два: it's = it is / it has, he'd = he would /
// he had.
function expand(word) {
  const w = BARE[word] || word
  let m
  if ((m = /^(.+)n't$/.exec(w))) return [[NOT_STEM[m[1]] || m[1], 'not']]
  if ((m = /^(.+)'m$/.exec(w))) return [[m[1], 'am']]
  if ((m = /^(.+)'re$/.exec(w))) return [[m[1], 'are']]
  if ((m = /^(.+)'ve$/.exec(w))) return [[m[1], 'have']]
  if ((m = /^(.+)'ll$/.exec(w))) return [[m[1], 'will']]
  if ((m = /^(.+)'d$/.exec(w))) return [[m[1], 'would'], [m[1], 'had']]
  if ((m = /^(.+)'s$/.exec(w))) {
    if (m[1] === 'let') return [['let', 'us']]
    if (S_IS.has(m[1])) return [[m[1], 'is'], [m[1], 'has']]
    return [[w]] // притяжательный — апостроф значим
  }
  // Апостроф внутри слова, не стяжение и не притяжательный (o'clock): он ничего
  // не различает, а без него ученик набирает «oclock» — снимаем.
  if (/[a-z]'[a-z]/.test(w)) return [[w.replace(/'/g, '')]]
  return [[w]]
}

// Ограничение на число вариантов: в эталоне редко больше двух неоднозначных
// стяжений, но строку из ученика тоже прогоняем, и раздувать её не дадим.
const MAX_VARIANTS = 64

// Отдельное окончание стяжения — ответ на пропуск сразу после подлежащего
// («I___ not hungry» → «'m not», «She___ got a dog» → «'s got»). Без
// апострофа («m not») это та же форма, просто набранная с телефона, поэтому
// апостроф у окончания снимаем. Кроме ответа, который целиком — одно «'s»:
// там задание проверяет именно апостроф (a2 u73 «Tom___ bag»).
const TAIL = /^'(m|re|ve|ll|d|s)$/

// Раскрытия, которых в английском не бывает (см. отсев в variantsOf).
const IMPOSSIBLE = /\b(?:is|am|are) got\b|\bis been\b|\bwould (?:been|better|got)\b|\bhad (?:like|love|prefer)\b/

function variantsOf(value) {
  let list = words(prepare(value))
  if (!(list.length === 1 && list[0] === "'s")) list = list.map((w) => (TAIL.test(w) ? w.slice(1) : w))
  let out = [[]]
  for (const w of list) {
    const alts = expand(w)
    const next = []
    for (const head of out) {
      for (const alt of alts) {
        if (next.length >= MAX_VARIANTS) break
        next.push(head.concat(alt))
      }
    }
    out = next
  }
  return out.map((ws) => ws.join(' '))
}

// Варианты для сверки ответа. У «'s» и «'d» раскрытие одно из двух, и второе
// бывает невозможным: «He's got» — только has, «I'd like» — только would. Без
// отсева «He is got a laptop» засчитывалось за «He's got a laptop». Если отсев
// убрал бы всё (такое написал сам ученик), оставляем как есть — сверка его
// отвергнет. В normAnswer отсева нет намеренно: там строка обязана собираться
// по словам (фишки «собери предложение» нормализуются поодиночке).
function possibleVariants(value) {
  const all = variantsOf(value)
  const possible = all.filter((v) => !IMPOSSIBLE.test(v))
  return possible.length ? possible : all
}

// Основной вид строки: первый вариант раскрытия (it's → «it is», he'd → «he
// would»). Его зовут и снаружи — сравнить две фишки одного задания.
export function normAnswer(value) {
  return variantsOf(value)[0]
}

// Прежняя мягкая нормализация: апостроф стирается до таблицы стяжений, как в
// движке курса. Нужна только для длинных ответов (см. answerMatches): в целой
// фразе «Ill call you» или «the managers office» ученик не апостроф тренирует,
// и такие ответы проходили всегда — отнимать это нельзя.
const LEGACY = {
  dont: 'do not',
  doesnt: 'does not',
  didnt: 'did not',
  isnt: 'is not',
  arent: 'are not',
  wasnt: 'was not',
  werent: 'were not',
  havent: 'have not',
  hasnt: 'has not',
  hadnt: 'had not',
  wont: 'will not',
  wouldnt: 'would not',
  shouldnt: 'should not',
  couldnt: 'could not',
  mustnt: 'must not',
  cant: 'can not',
  cannot: 'can not',
  im: 'i am',
  ive: 'i have',
  youre: 'you are',
  youve: 'you have',
  weve: 'we have',
  theyre: 'they are',
  theyve: 'they have',
  thats: 'that is',
  theres: 'there is',
  heres: 'here is',
  lets: 'let us',
}
const LEGACY_RE = new RegExp(`\\b(${Object.keys(LEGACY).join('|')})\\b`, 'g')

function legacyNorm(value) {
  return words(prepare(value).replace(/'/g, ''))
    .join(' ')
    .replace(LEGACY_RE, (m) => LEGACY[m] || m)
}

// С какой длины эталона апостроф перестаёт быть предметом задания.
const LONG_ANSWER_WORDS = 3

// Эталонов может быть несколько: список и/или альтернативы через «|» в строке
// (так их пишет и экстрактор уроков, и движок курса в data-answer).
export function acceptedAnswers(accepted) {
  const list = Array.isArray(accepted) ? accepted : [accepted]
  return list
    .flatMap((a) => String(a ?? '').split('|'))
    .map(normAnswer)
    .filter(Boolean)
}

// Задание «перепиши предложение» ставит поле в конец строки: студент печатает
// весь остаток, а эталон часто хранит только его начало. Ответ засчитываем,
// если он начинается с эталона, а все лишние слова взяты из самой подсказки —
// целое предложение проходит, выдуманный хвост нет.
function extendsAnswer(value, list, cue) {
  if (!cue) return false
  const pool = cue.split(' ').filter(Boolean)
  return list.some((a) => {
    if (a.length < 2 || !value.startsWith(a + ' ')) return false
    const extra = value.slice(a.length).trim().split(' ').filter(Boolean)
    return extra.length > 0 && extra.every((w) => pool.includes(w))
  })
}

// Ответ без единой буквы: у заданий на артикль верный вариант — прочерк
// («Most people think — possessions are about money», банк «— / a / the»).
// Нормализация режет знаки препинания и превращает его в пустую строку, а
// пустой ответ мы не засчитываем никогда — задание становилось непроходимым.
// Поэтому такие эталоны сравниваем как есть, без нормализации.
// Разные тире — один прочерк: курс пишет «—», а ученик набирает дефис с
// клавиатуры, и верный ответ браковался.
// То же с апострофом: задание A1 «Add '» (the students' classroom) ждёт
// прямой «'», а клавиатура iOS по умолчанию ставит типографский «’».
const bare = (v) => String(v ?? '').trim().replace(/[‐-―−]/g, '-').replace(/[‘’ʼ´`]/g, "'")

// cue — текст задания вокруг пропуска (до/после), нужен только для «перепиши».
export function answerMatches(input, accepted, cue = '') {
  const raw = Array.isArray(accepted) ? accepted : [accepted]
  const keys = raw.flatMap((a) => String(a ?? '').split('|'))
  const symbolic = keys.filter((a) => bare(a) && !normAnswer(a))
  if (symbolic.some((a) => bare(a) === bare(input))) return true

  const given = possibleVariants(input)
  if (!given[0]) return false
  const givenSet = new Set(given)
  for (const key of keys) {
    const want = possibleVariants(key)
    if (!want[0]) continue
    if (want.some((w) => givenSet.has(w))) return true
    // Длинный ответ — прежняя мягкость к апострофу (см. legacyNorm).
    const legacy = legacyNorm(key)
    if (legacy.split(' ').length >= LONG_ANSWER_WORDS && legacy === legacyNorm(input)) return true
  }
  // Здесь все три строки — в одном (пословном) виде normAnswer, иначе «начинается
  // с эталона» сравнивало бы разные раскрытия одного и того же «'s».
  return extendsAnswer(normAnswer(input), acceptedAnswers(accepted), normAnswer(cue))
}
