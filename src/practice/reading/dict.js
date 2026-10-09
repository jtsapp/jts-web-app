// Тап по слову в тексте — порт lookup() из data/jtsreading.html (~:654).
// Три слоя по убыванию точности:
//   1) ключевые слова текста — там есть транскрипция и выверенный перевод;
//   2) офлайн-словарь раздела (public/practice/reading/dict.json, 3799 статей
//      с ru И kz) — казахский сетевой переводчик отдаёт плохо, поэтому
//      курируемый слой важнее скорости;
//   3) общий сетевой переводчик приложения (lib/wordTranslate.js) — только для
//      слов, которых в словаре нет; казахского там не спрашиваем.
// Сам fetch живёт в компоненте: этот модуль чистый и тестируется на node.

import { norm } from './engine.js'

// Слова, у которых догадка по окончанию находит в словаре не то: либо это вовсе
// не форма (news → new «новый», Peter → pet, sheer → she), либо у основы в
// словаре один смысл, и не этот (marks → «Марк», missed → «мисс», willing →
// «(будущее время)»). Собраны прогоном всех слов текстов A1–C1 (08.10.2026);
// уверенная ошибка хуже, чем ответ сетевого переводчика.
const STEM_TRAPS = new Set([
  'news', 'goods', 'sheer', 'peter', 'shower', 'drawer', 'willing',
  'forester', 'counter', 'owner', 'marks', 'marker', 'missed', 'lays',
])

// w/x/y согласными не считаем: show·ing, fix·ing, play·ing немой e не теряли.
const CONS = /[bcdfghjklmnpqrstvz]/
const VOWEL = /[aeiouy]/

/**
 * Основа перед -ing, скорее всего, потеряла немую e, если кончается на
 * «согласная + гласная + согласная» (car, shin, hop) или это «гласная +
 * согласная» из двух букв (us): такую основу без e английский удвоил бы —
 * hopping, а не hoping. У многосложных visit·ing, open·ing вариант с e тоже
 * идёт первым, но visite и opene в словаре нет, так что ошибиться он не может.
 */
function lostSilentE(stem) {
  const n = stem.length
  return n >= 2 && CONS.test(stem[n - 1]) && VOWEL.test(stem[n - 2]) && (n === 2 || !VOWEL.test(stem[n - 3]))
}

/**
 * Формы, под которыми слово может лежать в словаре. Окончания — школьные, как
 * в прототипе (:657–665), но порядок другой: прототип пробовал КОРОТКУЮ основу
 * первой, и она перехватывала верную — used/using → us «нас», times → tim
 * «Тим», notes → not, Bees → be, as → артикль a (ревью 08.10.2026). Поэтому:
 *   - -s раньше -es, а -es — только после шипящих и o (box·es, hero·es, но
 *     не run·es → run);
 *   - у -ed и -er сначала срезаем одну букву (use·d, late·r), потом две;
 *   - у -ing основа с немой e первой, если без неё по правилу было бы удвоение;
 *   - основа -s/-es/-ed/-er не короче трёх букв (as → a, toes → to), а у
 *     -ing и 's хватает двух (being, doing, it's);
 *   - снятое удвоение (planning → plan) — последней попыткой.
 */
export function baseForms(word) {
  const w = norm(word)
  if (!w) return []
  const out = [w]
  if (STEM_TRAPS.has(w)) return out
  const add = (stem, min = 3) => {
    if (stem.length >= min && !out.includes(stem)) out.push(stem)
  }
  const doubled = []

  if (w.endsWith("'s")) add(w.slice(0, -2), 2)
  else if (w.endsWith('s')) {
    add(w.slice(0, -1))
    if (w.endsWith('ies')) add(w.slice(0, -3) + 'y')
    if (/(s|x|z|ch|sh|o)es$/.test(w)) add(w.slice(0, -2))
  }
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3)
    if (lostSilentE(stem)) add(stem + 'e', 2)
    add(stem, 2)
    add(stem + 'e', 2)
    doubled.push(stem)
  }
  for (const suf of ['ed', 'er']) {
    if (!w.endsWith(suf)) continue
    add(w.slice(0, -1))
    add(w.slice(0, -2))
    doubled.push(w.slice(0, -2))
  }
  for (const stem of doubled) {
    if (/([bcdfghjklmnpqrstvz])\1$/.test(stem)) add(stem.slice(0, -1))
  }
  return out
}

/** Слово без обрамляющей пунктуации, но в исходном регистре — заголовок карточки. */
export function displayWord(word) {
  return String(word).replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '')
}

/**
 * @param word     как оно стоит в тексте (с пунктуацией и регистром)
 * @param dict     содержимое dict.json ({ слово: [ru, kz] }) или null
 * @param keyWords x.words текста
 * @returns {{en,tr?,ru,kz,source}} или null, если ни один слой не знает слова
 */
export function lookup(word, dict, keyWords) {
  const w = norm(word)
  if (!w) return null

  if (Array.isArray(keyWords)) {
    const hit = keyWords.find((k) => norm(k.en) === w)
    if (hit) return { en: hit.en, tr: hit.tr, ru: hit.ru, kz: hit.kz, source: 'keyword' }
  }

  if (dict) {
    for (const form of baseForms(w)) {
      const d = dict[form]
      if (d) return { en: displayWord(word), ru: d[0], kz: d[1], source: 'dict' }
    }
  }

  return null
}
