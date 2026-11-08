// Латиница посреди кириллического слова — «бітken», «әңгімелestік», «жүze», «oған»: Haiku 5.5 в казахском ответе меняет
// алфавит внутри слова (эталонный набор Луны 08.11.2026, второй круг: 5 казахских ответов из 75, и судья, и ученик видят
// в этом смесь языков). Такое слово неверно в обоих алфавитах, поэтому чинит его код, а не указание модели: латинские
// буквы слова, где кириллицы не меньше, чем латиницы, заменяются кириллическими.
//
// Не трогаем: латинское слово с кириллическим хвостом без дефиса («Buddyмен» — латиницы больше), слова через дефис
// («IELTS-ке», «Unit-те» — дефис делит слово), чисто латинские и чисто кириллические слова.
//
// В потоке слово может прийти кусками («біт» | «ken»), поэтому createScriptFixer держит хвост из букв до следующего
// куска: ответ задерживается не больше чем на одно слово.

const LETTER = /\p{L}/u
const WORD = /\p{L}+/gu
const CYR = /\p{Script=Cyrillic}/u
const LAT = /\p{Script=Latin}/u
// Казахские буквы в слове — значит, казахское: «i» тогда «і», а не «и».
const KK = /[әғқңөұүһі]/i
const BASE = { a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'у', x: 'х', y: 'у', z: 'з' }

function fixWord(word) {
  let cyr = 0
  let lat = 0
  for (const ch of word) {
    if (CYR.test(ch)) cyr++
    else if (LAT.test(ch)) lat++
  }
  if (!cyr || !lat || cyr < lat) return word
  const kk = KK.test(word)
  let out = ''
  for (const ch of word) {
    if (!LAT.test(ch)) { out += ch; continue }
    const low = ch.toLowerCase()
    const to = low === 'i' ? (kk ? 'і' : 'и') : BASE[low]
    if (!to) { out += ch; continue }
    out += ch === low ? to : to.toUpperCase()
  }
  return out
}

/** Текст с исправленными словами смешанного алфавита. */
export function fixMixedScript(text) {
  return String(text ?? '').replace(WORD, fixWord)
}

/** Потоковый вариант: push(кусок) → готовая часть, flush() → остаток. */
export function createScriptFixer() {
  let tail = ''
  return {
    push(chunk) {
      const s = tail + String(chunk ?? '')
      let cut = s.length
      while (cut > 0 && LETTER.test(s[cut - 1])) cut--
      tail = s.slice(cut)
      return fixMixedScript(s.slice(0, cut))
    },
    flush() {
      const s = tail
      tail = ''
      return fixMixedScript(s)
    },
  }
}
