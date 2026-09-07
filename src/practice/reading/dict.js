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

/**
 * Формы, под которыми слово может лежать в словаре. Прототип складывал
 * окончания вручную (:657–665) — правила школьные, но словарь собран под них.
 */
export function baseForms(word) {
  const w = norm(word)
  if (!w) return []
  const out = [w]
  if (w.endsWith("'s")) out.push(w.slice(0, -2))
  if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y')
  if (w.endsWith('es')) out.push(w.slice(0, -2))
  if (w.endsWith('s')) out.push(w.slice(0, -1))
  if (w.endsWith('ing')) out.push(w.slice(0, -3), w.slice(0, -3) + 'e')
  if (w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1))
  if (w.endsWith('er')) out.push(w.slice(0, -2))
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
