// Задания грамматики приходят из выгрузки курса как есть (extract-grammar.js:
// «никакой ручной правки контента»), а исходника выгрузки в репозитории нет.
// Поэтому расхождения данных с плеером чиним здесь, при показе, а не правкой
// JSON: повторная выгрузка из того же курса правку JSON бы стёрла, а эта
// нормализация переживёт её. Каждое правило ниже — про конкретные задания,
// найденные ревью 08.10.2026; общего «исправителя данных» тут нет.
import { normAnswer } from '../../lib/answer-match.js'

const stripTags = (s) => String(s ?? '').replace(/<[^>]+>/g, '')

// Present Simple в Timeline («Anna likes rap music») размечен ответом «usually»,
// а зон у шкалы три: прошлое / сейчас / будущее. Ни одна кнопка не была верной.
const TIMELINE_ZONE = { usually: 'now', always: 'now', present: 'now' }

export function normalizeActivities(list) {
  return (list || [])
    // «Find and correct the mistake» в предложении без ошибки (ключ «(correct)
    // in time»): засчитывалось одно произвольное верное слово, а после ответа
    // плеер вставлял «(correct) in time» в середину фразы. Задание-угадайка —
    // из урока убираем (3 задания B1: u133, u137, u144).
    .filter((a) => !(a && a.type === 'error' && /^\(correct\)/i.test(String(a.correct || ''))))
    .map((a) => {
      if (!a) return a
      // 57 заданий B1 «Sort: does it take -ing?» выгружены в другом формате
      // ({instruction, cats, items[].c} вместо {prompt, buckets, items[].b}) —
      // `a.buckets.map` падал при рендере и ронял всё приложение.
      if (a.type === 'categorize' && !a.buckets && Array.isArray(a.cats)) {
        return {
          ...a,
          prompt: a.prompt ?? a.instruction,
          buckets: a.cats,
          items: (a.items || []).map((it) => (it.b === undefined ? { ...it, b: it.c } : it)),
        }
      }
      if (a.type === 'timeline' && TIMELINE_ZONE[a.answer]) return { ...a, answer: TIMELINE_ZONE[a.answer] }
      return a
    })
}

// ——— transform с пропусками «___» ———

// Откуда брать само предложение с пропусками. Два вида заданий:
//   instruction «Complete: I saw ___ old man and ___ dog.», prompt «→»;
//   prompt «→ The book ___ you lent me» (пропуск в самой подсказке).
// Подсказки в скобках («(both)», «(the gym)») в предложение не входят.
function templateOf(a) {
  const prompt = stripTags(a.prompt).trim()
  const instruction = stripTags(a.instruction).trim()
  let text = null
  if (/_{2,}/.test(prompt)) text = prompt
  else if (/^→?\s*$/.test(prompt) && /_{2,}/.test(instruction)) text = instruction.replace(/^[^:]*:\s*/, '')
  if (!text) return null
  const arrow = text.lastIndexOf('→')
  if (arrow >= 0) text = text.slice(arrow + 1)
  return text.replace(/\([^)]*\)/g, ' ')
}

const toWords = (s) => {
  const n = normAnswer(s)
  return n ? n.split(' ') : []
}

// «-», «nothing» и пустой ключ — «в пропуск ничего не ставится» (a1 u102:
// «Remove the optional pronoun»).
const isNothing = (key) => !normAnswer(key) || /^(nothing|none)$/i.test(String(key).trim())

// Слова ключа минус слова самого предложения (с учётом повторов) — то, что
// вписано в пропуски. «an old man and a dog» − «I saw … old man and … dog» =
// [an, a]. Ключ мог и пропустить слово предложения (a1 u108 «to paris and
// arrive in paris» без «tonight») — вычитание это переживает.
function fillsByDiff(keyWords, literalWords) {
  const left = new Map()
  for (const w of literalWords) left.set(w, (left.get(w) || 0) + 1)
  const out = []
  for (const w of keyWords) {
    if (left.get(w) > 0) left.set(w, left.get(w) - 1)
    else out.push(w)
  }
  return out
}

// Ключ с одним пропуском часто захватывает соседние слова предложения («a few
// questions» для «I have ___ questions»): при склейке целого предложения
// повтор этих слов убираем.
function mergeSingle(leftWords, keyWords, rightWords) {
  let l = leftWords.length
  for (let n = Math.min(leftWords.length, keyWords.length); n > 0; n--) {
    if (leftWords.slice(-n).join(' ') === keyWords.slice(0, n).join(' ')) {
      l = leftWords.length - n
      break
    }
  }
  let r = 0
  for (let n = Math.min(rightWords.length, keyWords.length); n > 0; n--) {
    if (rightWords.slice(0, n).join(' ') === keyWords.slice(-n).join(' ')) {
      r = n
      break
    }
  }
  return [...leftWords.slice(0, l), ...keyWords, ...rightWords.slice(r)].join(' ')
}

// Дополнительные верные ответы transform-задания с пропусками: целое
// предложение и одни только слова пропусков. Ключ выгрузки хранил один вид —
// чаще середину фразы («an old man and a dog»), — а поле ввода просит
// предложение целиком; ни «I saw an old man and a dog.», ни «an, a» не
// засчитывались (6 заданий A1 — непроходимые).
export function transformExtras(a) {
  if (!a || a.type !== 'transform') return []
  const tpl = templateOf(a)
  if (!tpl) return []
  const parts = tpl.split(/_{2,}/)
  const gaps = parts.length - 1
  if (gaps < 1) return []
  const partWords = parts.map(toWords)
  const literal = partWords.flat()
  const out = new Set()
  for (const key of [a.answer, ...(a.alts || [])]) {
    if (typeof key !== 'string') continue
    if (isNothing(key)) {
      out.add(literal.join(' '))
      continue
    }
    const kw = toWords(key)
    if (gaps === 1) {
      out.add(mergeSingle(partWords[0], kw, partWords[1]))
      continue
    }
    const fills = fillsByDiff(kw, literal)
    if (fills.length !== gaps) continue
    out.add(fills.join(' '))
    const sentence = []
    partWords.forEach((ws, i) => {
      sentence.push(...ws)
      if (i < gaps) sentence.push(fills[i])
    })
    out.add(sentence.join(' '))
  }
  return [...out].filter(Boolean)
}

// ——— «найди ошибку» ———

// Слова, тап по которым засчитывается. Ключ выгрузки — одно слово, но ошибка
// бывает из двух: перестановка («Where you are going» — (swap: are you)),
// лишнее слово при другом ключе («Do you can drive»: ключ «can», а пояснение
// «(remove 'do')»). Ученик, тапнувший второе слово пары, получал «неверно».
// Берём слова из пояснения в скобках и засчитываем их рядом с ключом.
export function errorTargets(a) {
  const targets = new Set([a.wrong])
  const m = /^\(\s*(?:swap|order|remove|delete)\b[:\s]*([^)]*)\)/i.exec(String(a.correct || ''))
  if (!m) return targets
  const named = m[1]
    .replace(/['"‘’“”]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  ;(a.words || []).forEach((w, i) => {
    const bare = String(w).toLowerCase().replace(/[^a-z']/g, '')
    if (Math.abs(i - a.wrong) <= 2 && named.includes(bare)) targets.add(i)
  })
  return targets
}
