// Картинки «Грамматики · игр»: маскоты и эмодзи Apple — статикой сайта
// (scripts/grammar-games/extract-assets.js), а не base64 в бандле, как в прототипе.
//
// Эмодзи — картинками, чтобы игры выглядели одинаково на любом устройстве (ТЗ:
// «в стиле Apple»). Список символов нужен движку целиком сразу (из него строится
// регэксп подмены), он маленький, поэтому лежит в бандле; сами картинки
// браузер грузит по одной, когда символ попал на экран.

import INDEX from '../../../public/practice/grammar-games/emoji/index.json'

// Д8: пакет emoji-datasource-apple предупреждает, что картинки — собственность Apple.
// Флаг выключает их одной строкой: список пуст, движок ничего не подменяет, и на
// экране остаются системные эмодзи устройства.
export const EMOJI_IMAGES = true

export const MASCOTS = ['dexter', 'spark', 'cheer', 'read', 'run', 'sleep', 'fly']

const BASE = '/practice/grammar-games'

// Кодпоинты через «-», включая ZWJ и FE0F: 🙋‍♀️ и 🙋 — разные файлы. Та же функция — в extract-assets.js.
export const emojiFile = (ch) => [...ch].map((c) => c.codePointAt(0).toString(16)).join('-') + '.webp'

export const EMOJI_LIST = EMOJI_IMAGES ? INDEX : []

export const emojiUrl = (ch) => `${BASE}/emoji/${emojiFile(ch)}`

export const mascotUrl = (name) => `${BASE}/img/${name}.webp`
