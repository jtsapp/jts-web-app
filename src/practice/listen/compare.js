// Сверка ответа с прозвучавшим — порт data/jtslisten.html (letters, lev, toks,
// forms, containsTarget, compareSentence, missingWords). Семантику сверяет
// оракул (__fixtures__/oracle.json, scripts/extract-listen-oracle.js): красный
// compare.test.js значит, что разъехался порт, а не прототип.
//
// Одно расхождение — исправление: SYN и IRR прототипа читались по любому
// ключу, и слово «constructor» доставало из них функцию Object (проверка
// предложения падала). Здесь — только собственные ключи таблиц.

export const letters = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '')
export const enMain = (s) => String(s).split('|')[0]
export const first = (s) => String(s).split('/')[0]

const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined)

/** Расстояние Левенштейна — по буквам (строки) и по словам (массивы). */
export function lev(a, b) {
  const m = a.length
  const n = b.length
  const d = []
  for (let i = 0; i <= m; i++) d[i] = [i]
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[m][n]
}

// Сокращения раскрываются до сравнения: «I've» и «I have» — один ответ.
const CONTR = [
  [/\bwon't\b/g, 'will not'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'],
  [/\bi'm\b/g, 'i am'], [/\b(it|he|she|there|what|that|where|who|here)'s\b/g, '$1 is'], [/\blet's\b/g, 'let us'],
  [/s'\s/g, 's '],
]

// Синонимы и варианты написания, которые на слух не различить.
const SYN = {
  mum: 'mum', mom: 'mum', mother: 'mum', mommy: 'mum', dad: 'dad', father: 'dad', daddy: 'dad', movie: 'film',
  movies: 'films', soccer: 'football', neighbor: 'neighbour', neighbors: 'neighbours', apologized: 'apologised',
  apologize: 'apologise', apologizes: 'apologises', grandpa: 'grandfather', grandad: 'grandfather',
  granddad: 'grandfather', large: 'big', really: 'very', proven: 'proved', color: 'colour',
  ads: 'advertisements', adverts: 'advertisements', cafe: 'cafe', kids: 'children', shoes: 'shoes',
}

// Неправильные формы: «went» засчитывается за «go».
const IRR = {
  be: ['am', 'is', 'are', 'was', 'were', 'been'], have: ['has', 'had', 'having'], go: ['went', 'gone', 'goes'],
  do: ['did', 'done', 'does'], get: ['got', 'gotten'], see: ['saw', 'seen'], make: ['made'], say: ['said'],
  take: ['took', 'taken'], come: ['came'], give: ['gave', 'given'], meet: ['met'], buy: ['bought'],
  eat: ['ate', 'eaten'], find: ['found'], know: ['knew', 'known'], leave: ['left'], sleep: ['slept'],
  swim: ['swam', 'swum'], try: ['tried'], write: ['wrote', 'written'], speak: ['spoke', 'spoken'],
  drive: ['drove', 'driven'], ride: ['rode', 'ridden'], run: ['ran'], sing: ['sang', 'sung'], draw: ['drew', 'drawn'],
  feel: ['felt'], think: ['thought'], bring: ['brought'], teach: ['taught'], cut: ['cut'], put: ['put'], sit: ['sat'],
  stand: ['stood'], lose: ['lost'], spend: ['spent'], send: ['sent'], lend: ['lent'], pay: ['paid'], tell: ['told'],
  hear: ['heard'], wear: ['wore', 'worn'], grow: ['grew', 'grown'], sell: ['sold'], win: ['won'],
  learn: ['learnt', 'learned'], fly: ['flew', 'flown'], begin: ['began', 'begun'], choose: ['chose', 'chosen'],
  forget: ['forgot', 'forgotten'], build: ['built'], catch: ['caught'], keep: ['kept'], understand: ['understood'],
  child: ['children'],
}

/** Ответ → слова: без диакритики, регистра, пунктуации, с раскрытыми сокращениями и синонимами. */
export function toks(s) {
  let t = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'")
  for (const [r, v] of CONTR) t = t.replace(r, v)
  return t
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/'/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => own(SYN, x) || x)
}

/** Формы слова, которые засчитываются за него: studies, studied, bigger, children… */
export function forms(w) {
  const f = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'est', w + 'ly'])
  if (w.endsWith('e')) {
    f.add(w.slice(0, -1) + 'ing')
    f.add(w + 'r')
    f.add(w + 'st')
  }
  if (/[^aeiou]y$/.test(w)) {
    const s = w.slice(0, -1)
    for (const x of ['ies', 'ied', 'ier', 'iest', 'ily']) f.add(s + x)
  }
  if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(w)) {
    const d = w + w.slice(-1)
    for (const x of ['ed', 'ing', 'er', 'est']) f.add(d + x)
  }
  if (w.endsWith('ise')) {
    const z = w.slice(0, -3) + 'ize'
    for (const x of [z, z + 's', z + 'd', z.slice(0, -1) + 'ing']) f.add(x)
  }
  for (const x of own(IRR, w) || []) f.add(x)
  return f
}

/** Есть ли в ответе целевое слово или фраза (с формами; во фразе допускаются вставки). */
export function containsTarget(raw, en) {
  const t = toks(raw)
  return String(en).split('|').some((v) => {
    const parts = toks(v)
    if (parts.length === 1) return t.some((x) => forms(parts[0]).has(x) || forms(own(SYN, parts[0]) || parts[0]).has(x))
    for (let s = 0; s < t.length; s++) {
      if (!forms(parts[0]).has(t[s])) continue
      let p = 1
      let k = s + 1
      while (k < t.length && p < parts.length && k - s <= parts.length + 3) {
        if (forms(parts[p]).has(t[k])) p++
        k++
      }
      if (p === parts.length) return true
    }
    return false
  })
}

/** Ближайший из вариантов (через «||»): {ref, rt, d — ошибок в словах, rel — доля}. */
export function compareSentence(raw, refs) {
  const u = toks(raw)
  let best = null
  for (const r of String(refs).split('||')) {
    const rt = toks(r)
    const d = lev(u, rt)
    const rel = d / Math.max(rt.length, 1)
    if (!best || rel < best.rel) best = { ref: r, rt, d, rel }
  }
  return best
}

/** Слова образца, которых нет в ответе — для подсказки «не хватает: …». */
export function missingWords(raw, ref) {
  const u = new Set(toks(raw))
  return toks(ref).filter((t) => !u.has(t))
}
