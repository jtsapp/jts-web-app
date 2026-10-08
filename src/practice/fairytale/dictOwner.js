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

import { userIdFromToken } from '../../lib/jwt.js'

export const DICT_KEY = 'jts.fairytale.dict.v1'
const OWNER_KEY = 'jts.fairytale.dict.owner'
const stashKey = (owner) => `${DICT_KEY}@${owner}`

/** Чей словарь: id ученика из токена или гость. */
export function dictOwnerOf(token) {
  const id = token ? userIdFromToken(token) : null
  return id != null ? `user:${id}` : 'guest'
}

/**
 * Поставить в общий ключ словарь владельца `owner`. Зовётся перед каждым
 * открытием мира Сказок. Порядок шагов такой, чтобы сбой записи (хранилище
 * бывает забито кэшем каталогов) не стирал ничей список: чужой откладывается
 * раньше, чем убирается, а свой снимается с полки только после возврата.
 */
export function scopeFairytaleDict(owner) {
  try {
    const prev = localStorage.getItem(OWNER_KEY)
    if (prev === owner) {
      // Прошлый раз вернуть свой список не удалось — пробуем снова.
      const parked = localStorage.getItem(stashKey(owner))
      if (parked != null && localStorage.getItem(DICT_KEY) == null) {
        localStorage.setItem(DICT_KEY, parked)
        localStorage.removeItem(stashKey(owner))
      }
      return
    }
    // prev == null — словарь появился до разведения, чей он, неизвестно.
    // Отдаём первому, кто откроет Сказки: на своём устройстве это и есть хозяин.
    if (prev == null) {
      localStorage.setItem(OWNER_KEY, owner)
      return
    }
    const cur = localStorage.getItem(DICT_KEY)
    if (cur != null) localStorage.setItem(stashKey(prev), cur)
    localStorage.removeItem(DICT_KEY)
    localStorage.setItem(OWNER_KEY, owner)
    const mine = localStorage.getItem(stashKey(owner))
    if (mine != null) {
      localStorage.setItem(DICT_KEY, mine)
      localStorage.removeItem(stashKey(owner))
    }
  } catch {
    /* приватный режим / квота — остаёмся на том, что успели */
  }
}
