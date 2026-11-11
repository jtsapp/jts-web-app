import { EMOJI_CATEGORY_IDS } from './labels.js'

// Панель смайликов — наборы прототипа дословно (EMO и ECAT в docs/superpowers/specs/2026-11-11-birge-prototype.html;
// сверяет emoji.test.js). Имена вкладок — ключи прототипа, подписи на трёх языках — по CATEGORY_KEY.
//
// 🤬 и 🖕 в наборе нет намеренно (спека §7): лента учебная, а смайлик-ругательство прошёл бы мимо словаря мата.
// Сторожит тот же тест — в том числе для «Недавних» из хранилища.

export const EMO = {
 'Недавние':[],
 'Эмоции':'😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 🫠 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😶‍🌫️ 😏 😒 🙄 😬 😮‍💨 🤥 🫨 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 😈 💀 🤡 👻 👽 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊'.split(' '),
 'Сердца':'❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💨 💬 💭 💤 ✨ 🔥 ⭐ 🌟'.split(' '),
 'Жесты':'👋 🤚 🖐️ ✋ 🖖 🫱 🫲 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🧠 👀 👁️ 👄 🙋 🙋‍♀️ 🙋‍♂️ 🤷 🤷‍♀️ 🤷‍♂️ 🤦 🤦‍♀️ 🤦‍♂️ 🙆 🙅 💁 🙇 🧑‍🎓 👩‍🎓 👨‍🎓 🧑‍🏫 👩‍🏫 👨‍🏫 🧑‍💻 🏃 💃 🕺 🧘'.split(' '),
 'Учёба':'📚 📖 📝 ✏️ 🖊️ 📒 📓 📕 📗 📘 📙 🎓 🏫 💡 🔍 📌 📎 🗂️ 📅 ⏰ ⏳ ✅ ☑️ ❌ ❓ ❗ ‼️ ⁉️ 🔤 🔠 🅰️ 🗣️ 🎧 🎤 💻 📱 🏆 🥇 🥈 🥉 🎯 📈 🚀 🎉 🎊 🎁 🧩 🌐'.split(' '),
 'Природа':'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦄 🐝 🦋 🐢 🐙 🐬 🐳 🐎 🐫 🦅 🌸 🌹 🌻 🌷 🌱 🌿 🍀 🍁 🌵 🌴 🌍 🌙 ☀️ 🌈 ⛅ 🌧️ ❄️ ⚡ 🌊 ⛰️'.split(' '),
 'Еда':'🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥕 🌽 🥐 🍞 🧀 🥚 🍳 🥞 🍔 🍟 🍕 🌭 🥪 🌮 🍝 🍜 🍣 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍿 ☕ 🍵 🧋 🥤 🧃 🍯'.split(' '),
 'Хобби':'⚽ 🏀 🏐 🎾 🏓 🥊 🎮 🎲 🎨 🎬 🎵 🎸 🎹 ✈️ 🚗 🚕 🚌 🚲 🏠 🏙️ 🗽 🗼 🎡 🏖️ 🏔️ ⛺ 🧳 🎈 🛍️ 💼 ⌚ 📷 🔑'.split(' '),
 'Флаги':'🇰🇿 🇬🇧 🇺🇸 🇨🇦 🇦🇺 🇮🇪 🇳🇿 🇺🇿 🇰🇬 🇹🇷 🇷🇺 🇩🇪 🇫🇷 🇪🇸 🇮🇹 🇨🇳 🇯🇵 🇰🇷 🇦🇪 🇬🇪 🏁'.split(' ')
}

export const ECAT = {'Недавние':'🕘','Эмоции':'😀','Сердца':'❤️','Жесты':'👋','Учёба':'📚','Природа':'🐶','Еда':'🍕','Хобби':'⚽','Флаги':'🇰🇿'};

// Имя вкладки прототипа → id подписи (birge.emoji.cat.<id>). Порядок — порядок вкладок.
export const CATEGORY_KEY = Object.fromEntries(Object.keys(EMO).map((name, i) => [name, EMOJI_CATEGORY_IDS[i]]))

// Открытая по умолчанию вкладка — как в прототипе.
export const DEFAULT_CATEGORY = 'Эмоции'
export const RECENT_KEY = 'jts_birge_recent_emoji'
export const RECENT_MAX = 27

const KNOWN = new Set(Object.values(EMO).flat())

function defaultStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    // приватный режим Safari бросает уже на доступе к хранилищу
    return null
  }
}

/** Вкладки панели: «Недавние» — только когда в них что-то есть (прототип). */
export function categories(recent) {
  return Object.keys(EMO).filter((name) => name !== 'Недавние' || recent.length > 0)
}

export function emojisOf(category, recent) {
  return category === 'Недавние' ? recent : EMO[category] || []
}

/** «Недавние» с устройства. Только смайлики набора: чужое или старое в хранилище не протащит в панель 🤬 или 🖕. */
export function readRecent(storage = defaultStorage()) {
  try {
    const list = JSON.parse(storage?.getItem(RECENT_KEY) || '[]')
    if (!Array.isArray(list)) return []
    return [...new Set(list.filter((e) => typeof e === 'string' && KNOWN.has(e)))].slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

/** Выбранный смайлик — первым в «Недавних», без повтора, не больше 27. Список отдаётся и без хранилища. */
export function rememberEmoji(emoji, recent, storage = defaultStorage()) {
  const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, RECENT_MAX)
  try {
    storage?.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // нет места или приватный режим — «Недавние» проживут до перезагрузки
  }
  return next
}
