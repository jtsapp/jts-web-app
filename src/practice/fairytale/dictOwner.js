// «Мои слова» Сказок движок (engine.js) держит в localStorage под ОДНИМ ключом
// на устройство. На общем компьютере второй ученик видел слова первого, и его
// «В словарь» отвечало «Уже сохранено» — слово до «Моего словаря» не доходило
// (ревью 08.10.2026).
//
// Чистить ключ при выходе нельзя: для гостя это единственная копия, а
// вошедший потерял бы список, хотя он ничей больше. Поэтому ключ разводится по
// ученику, как аватар (lib/profileAvatar.js), — но снаружи движка: тот перенесён
// из прототипа и правится точечно в двух местах (engine.js и fairytales.html),
// а рядом с ключом словаря лежат правки, которые ещё не влиты. Перед
// открытием мира содержимое общего ключа откладывается под прежнего владельца,
// а на его место встаёт список текущего.
//
// Гость, вошедший в аккаунт, слова не теряет: его список уезжает в аккаунт,
// как анонимный банк слов тьютора (mergeAnonymousProgress).

import { userIdFromToken } from '../../lib/jwt.js'

export const DICT_KEY = 'jts.fairytale.dict.v1'
const OWNER_KEY = 'jts.fairytale.dict.owner'
const stashKey = (owner) => `${DICT_KEY}@${owner}`

/** Чей словарь: id ученика из токена или гость. */
export function dictOwnerOf(token) {
  const id = token ? userIdFromToken(token) : null
  return id != null ? `user:${id}` : 'guest'
}

function parse(raw) {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// Слияние по слову: сначала a, потом то, чего в a нет. Списки не
// перезаписываются друг другом — сбой записи на полпути не должен стоить
// ученику слов.
function mergeLists(a, b) {
  const seen = new Set(a.map((x) => x && x.w))
  return [...a, ...b.filter((x) => x && !seen.has(x.w))]
}

function putList(key, list) {
  if (list.length) localStorage.setItem(key, JSON.stringify(list))
  else localStorage.removeItem(key)
}

/**
 * Поставить в общий ключ словарь владельца `owner`. Зовётся перед каждым
 * открытием мира Сказок. Хранилище бывает забито кэшем каталогов, поэтому
 * старое сначала убирается (освобождает ровно нужное место), а при сбое
 * записи всё возвращается как было.
 */
export function scopeFairytaleDict(owner) {
  let prev
  try {
    prev = localStorage.getItem(OWNER_KEY)
  } catch {
    return /* приватный режим — разводить нечем */
  }
  if (prev === owner) {
    takeParked(owner)
    return
  }
  // prev == null — словарь появился до разведения, чей он, неизвестно.
  // Отдаём первому, кто откроет Сказки: на своём устройстве это и есть
  // хозяин, а если гость — список уедет в аккаунт при входе.
  if (prev == null) {
    try {
      localStorage.setItem(OWNER_KEY, owner)
    } catch {
      /* квота — останемся без владельца до следующего открытия */
    }
    return
  }

  const raw = {
    cur: localStorage.getItem(DICT_KEY),
    prev: localStorage.getItem(stashKey(prev)),
    mine: localStorage.getItem(stashKey(owner)),
  }
  const cur = raw.cur == null ? [] : parse(raw.cur)
  const parkedPrev = raw.prev == null ? [] : parse(raw.prev)
  // Гость вошёл: его слова не откладываются, а едут с ним в аккаунт.
  const carry = prev === 'guest' && owner !== 'guest'
  const park = carry ? [] : mergeLists(parkedPrev, cur)
  const mine = mergeLists(raw.mine == null ? [] : parse(raw.mine), carry ? mergeLists(parkedPrev, cur) : [])
  try {
    localStorage.removeItem(DICT_KEY)
    localStorage.removeItem(stashKey(owner))
    putList(stashKey(prev), park)
    localStorage.setItem(OWNER_KEY, owner)
    putList(DICT_KEY, mine)
  } catch {
    // Не влезло — возвращаем всё как было: пусть лучше список побудет общим,
    // чем пропадёт.
    try {
      for (const [k, v] of [
        [DICT_KEY, raw.cur],
        [stashKey(prev), raw.prev],
        [stashKey(owner), raw.mine],
        [OWNER_KEY, prev],
      ]) {
        if (v == null) localStorage.removeItem(k)
        else localStorage.setItem(k, v)
      }
    } catch {
      /* откатить тоже нечем */
    }
  }
}

// Прошлый раз вернуть свой список не удалось, и он остался отложенным —
// сливаем с тем, что ученик успел добавить после.
function takeParked(owner) {
  try {
    const parked = localStorage.getItem(stashKey(owner))
    if (parked == null) return
    const cur = localStorage.getItem(DICT_KEY)
    const merged = mergeLists(parse(parked), cur == null ? [] : parse(cur))
    localStorage.removeItem(stashKey(owner))
    try {
      putList(DICT_KEY, merged)
    } catch {
      localStorage.setItem(stashKey(owner), parked)
    }
  } catch {
    /* приватный режим / квота — попробуем при следующем открытии */
  }
}

/** Сколько слов в словаре сейчас — для счётчика на кнопке движка. */
export function dictCount() {
  try {
    return parse(localStorage.getItem(DICT_KEY) || '[]').length
  } catch {
    return 0
  }
}
