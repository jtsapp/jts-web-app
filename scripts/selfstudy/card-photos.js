// Фото для карточки слова «Обучения».
//
// В файлах курса нового поколения фотографий нет — только имена иконок, —
// поэтому снимки берутся из прошлых выгрузок: public/course/<level>/img-index.json
// («слово → файл»). Раньше искали только точное слово, и лежащие фото не
// доезжали до карточек, где слово записано иначе:
//   «do homework» — снимок под «homework», «the Underground» — под «Underground»,
//   «rom com» — под «romcom», «bear with (me)» — под «bear with».
// У A1 своих снимков нет вовсе (в обоих его исходниках список картинок пуст),
// и слова, которые есть на других уровнях, берут снимок оттуда.
//
// Правило одно: на фото не должно быть слов, которых нет на карточке. Старый
// A0 рисовал одну картинку на группу слов, и подпись вшита в сам снимок
// («BLACK, BLUE, BROWN, GREEN | ҚАРА, КӨК…»). Новый курс разбил группу на
// отдельные карточки, и такой снимок на карточке «black» повторился бы на
// четырёх соседних карточках с подписью про чужие слова, — поэтому каждое
// слово фото обязано найтись на карточке, а не наоборот.
const fs = require('node:fs')
const path = require('node:path')

// Прежний ключ точного поиска: регистр, апостроф и знаки препинания у двух
// поколений курса пишутся по-разному («don’t like» против «don't like»), и
// совсем точное совпадение находило 16 слов A0 из 266 вместо 51.
const legacyKey = (w) =>
  String(w || '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z' ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const lower = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/&rsquo;|&#39;|[‘’]/g, "'")
    .replace(/&[a-z]+;/g, ' ')

// Служебное слово в начале: артикль, частица инфинитива.
const LEAD = /^(?:a|an|the|to|some|my)\s+/
// Лёгкий глагол коллокации на карточке: «do homework» проиллюстрировано тем же
// снимком, что «homework». Только у карточки: снимок «make room» — не «room».
// go/get/take сюда не входят — они несут смысл («get up» ≠ «up»).
const LIGHT = /^(?:do|make|have)\s+/

function words(s) {
  let out = lower(s)
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  while (LEAD.test(out)) out = out.replace(LEAD, '')
  return out
}

// Сравнение без пробелов («rom com» = «romcom», «log in» = «login») и без
// множественного числа на -s. Короткие слова не трогаем: «news» — не «new»,
// «means» — не «mean».
function squash(s) {
  const flat = s.replace(/[\s']/g, '')
  return flat.length >= 6 && flat.endsWith('s') ? flat.slice(0, -1) : flat
}

// Скобки — необязательная часть: «bear with (me)» = «bear with»,
// «get on well with (someone)» = «get on well with someone». Кроме
// диапазона: «Months (Jan–Dec)» — постер со всеми месяцами, а не «month»,
// и на карточке «next week / month / year» ему не место.
const RANGE = /\([^)]*[–-][^)]*\)/
function variants(part, { light = false } = {}) {
  const out = new Set()
  const texts = RANGE.test(part) ? [part.replace(/[()]/g, ' ')] : [part.replace(/[()]/g, ' '), part.replace(/\(.*?\)/g, ' ')]
  for (const text of texts) {
    const base = words(text)
    if (!base) continue
    out.add(squash(base))
    if (light && LIGHT.test(base)) {
      const bare = words(base.replace(LIGHT, ''))
      if (bare) out.add(squash(bare))
    }
  }
  return [...out]
}

// Карточка делит пары слэшем, тире и стрелкой («log on / log out», «husband —
// wife»; старый A1 писал пары стрелками: «go → went», «quiet ↔ noisy»);
// запятая на карточке — часть фразы («Sorry, I can't.»), её не режем.
const cardParts = (word) =>
  String(word || '')
    .split(/\s*(?:\/|—|–|→|↔)\s*/)
    .map((p) => variants(p, { light: true }))
    .filter((v) => v.length)

// Ключ фото старого A0 перечисляет группу через запятую («Father, mother»).
// Диапазон в скобках («Days (Mon–Sun)») режется раньше, чем по тире.
const photoParts = (key) =>
  String(key || '')
    .split(/\s*(?:\/|—|–|→|↔|,)\s*(?![^(]*\))/)
    .map((p) => variants(p))
    .filter((v) => v.length)

/** Сколько частей карточки покрывает фото; 0 — фото не подходит. */
function coverage(card, photo) {
  if (!photo.length || !card.length) return 0
  const hit = new Set()
  for (const p of photo) {
    const i = card.findIndex((c) => c.some((v) => p.includes(v)))
    if (i < 0) return 0
    hit.add(i)
  }
  return hit.size
}

// Основы слов перевода: «аренда» и «арендная плата» — одно, «костюм» и
// «подходить» — нет.
const stems = (text) =>
  new Set(
    String(text || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .split(/[^a-zа-яәғқңөұүһі]+/)
      .filter((w) => w.length >= 4)
      .map((w) => w.slice(0, 5)),
  )
// Снимок чужого уровня иллюстрирует одно значение слова. Перевод там через
// «;» — разные значения («light» — «лёгкий; свет», а на снимке свет из
// окна), и какое на снимке, не знаем: не берём. Через запятую — сверяем с
// первым, главным («invent» у B1 — «выдумывать, изобретать», и на снимке
// сочиняют историю, а не изобретают).
const sameMeaning = (translation, origin) => {
  if (!origin || origin.includes(';')) return false
  const left = stems(translation)
  return [...stems(origin.split(',')[0])].some((s) => left.has(s))
}

// Карточка → ключ снимка своего уровня там, где правилами не поймать, а по
// смыслу снимок её: старый курс учил «full-time», новый — «work full-time»;
// «half» стоит в уроке про время рядом с «half past». Каждая пара сверена
// глазами по картинке (28.09.2026); «have an early night» ← «early» — нет:
// на снимке раннее утро.
const ALIASES = {
  a1: {
    'work full-time': 'full-time',
    'work freelance': 'freelance',
    'half past': 'half',
    'quarter past': 'quarter',
    'quarter to': 'quarter',
    windy: 'wind → windy',
    'listen to music': 'listen',
    'watch a film': 'watch',
    'Can you tell her to call me back?': 'call back',
    'next week / month / year': 'next year',
    'take the second right': 'turn right',
  },
  a2: {
    'go to bed late': 'late',
  },
}

/**
 * Поиск фото по индексам уровней.
 * @param {Array<{level: string, index: Record<string,string>, meaning?: Map<string,string>}>} sources
 *   индексы по приоритету: первым — свой уровень. У чужих уровней meaning —
 *   русский перевод слова, к которому снимок стоит там (url → ru).
 * @returns {(word: string, translation?: string) => string | null}
 */
function photoFinder(sources) {
  const own = sources[0] || {}
  const exact = new Map(Object.entries(own.index || {}).map(([k, url]) => [legacyKey(k), url]))
  const alias = ALIASES[own.level] || {}
  const entries = sources.flatMap(({ index, meaning }, rank) =>
    Object.entries(index || {}).map(([key, url]) => ({ url, rank, meaning, parts: photoParts(key) })),
  )
  return (word, translation) => {
    const hit = exact.get(legacyKey(word)) || (alias[word] && own.index[alias[word]])
    if (hit) return hit
    const card = cardParts(word)
    let best = null
    for (const e of entries) {
      if (best && e.rank > best.rank) break
      const cov = coverage(card, e.parts)
      if (!cov) continue
      // Со своего уровня снимок иллюстрирует то же слово того же курса. С
      // чужого — только при совпавшем переводе: «suit» у B1 — «подходить»,
      // у A1 — «костюм», «degree» у A2 — диплом, у A1 — градус.
      if (e.rank > 0 && !sameMeaning(translation, e.meaning && e.meaning.get(e.url))) continue
      // Внутри уровня — снимок, покрывающий больше частей карточки: у
      // «husband — wife» пара лучше, чем одно «wife».
      if (!best || cov > best.cov) best = { ...e, cov }
    }
    return best ? best.url : null
  }
}

const LEVELS = ['a0', 'a1', 'a2', 'b1', 'b2']

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

/**
 * Источники фото для уровня: свой индекс, потом чужие — ближние раньше, при
 * равном расстоянии старший (у A2–B2 снимки без вшитой подписи, у A0 — с ней).
 * Файлы, которых нет на диске, в поиск не попадают.
 * @param {string} publicDir каталог public/
 */
function loadPhotoSources(publicDir, level) {
  const at = LEVELS.indexOf(level)
  const order = LEVELS.filter((l) => fs.existsSync(path.join(publicDir, 'course', l, 'img-index.json'))).sort(
    (a, b) => Math.abs(LEVELS.indexOf(a) - at) - Math.abs(LEVELS.indexOf(b) - at) || LEVELS.indexOf(b) - LEVELS.indexOf(a),
  )
  return order.map((l) => {
    const raw = readJson(path.join(publicDir, 'course', l, 'img-index.json'), {})
    const index = Object.fromEntries(Object.entries(raw).filter(([, url]) => fs.existsSync(path.join(publicDir, url))))
    if (l === level) return { level: l, index }
    // Перевод снимка — с карточки, к которой он встаёт на своём уровне. Ищем
    // заново по словам его шагов, а не читаем их img: сохранённые шаги могут
    // быть собраны до того, как в индекс доложили картинки (так и было с
    // A1), и тогда итог зависел бы от порядка пересборки уровней.
    const own = photoFinder([{ level: l, index }])
    const meaning = new Map()
    const dir = path.join(publicDir, 'course', l)
    const files = fs.readdirSync(dir).filter((n) => /^steps-.*\.json$/.test(n)).sort()
    for (const f of files) {
      for (const s of readJson(path.join(dir, f), {}).steps || []) {
        if (s.type !== 'cards') continue
        for (const w of s.words || []) {
          const url = w.ru && own(w.en)
          if (url && !meaning.has(url)) meaning.set(url, w.ru)
        }
      }
    }
    // Снимок, которому на своём уровне нет карточки (в новом курсе слово
    // выпало), — перевод из строки словаря файла, откуда он пришёл
    // (import-course-images.js). Перевод с карточки главнее.
    const fromFile = readJson(path.join(path.dirname(publicDir), 'data/course-photos', `${l}.json`), {})
    for (const [key, ru] of Object.entries(fromFile)) if (index[key] && !meaning.has(index[key])) meaning.set(index[key], ru)
    return { level: l, index, meaning }
  })
}

module.exports = { photoFinder, loadPhotoSources, cardParts, photoParts }
