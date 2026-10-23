// Быстрые голосовые команды (21.10.2026, решение владельца: «Луна, дальше» — сразу
// нажатие). Короткую команду узнаёт само устройство — по итогу Vosk «уха» (wake/) или
// по тексту микрофона окна и звонка, — и кнопку на экране окно жмёт без сервера и без
// модели: это большая часть голосового управления, и ждать ради неё ответа модели
// (3–4 с) незачем. Всё, что не ровно команда, идёт модели обычным вопросом.
//
// Здесь же — «назвал ли ученик кнопку сам» (namedByStudent): им clickPolicy.js
// проверяет нажатие на непроверенном задании, а синонимы команд нужны и там —
// «дальше» называет «Далее», «включи» — «Послушать».

/** Сверка слов: нижний регистр, ё → е, ә → а (как у позывного, matchWake.js), без знаков. */
export const normCmd = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ә/g, 'а')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const words = (s) => normCmd(s).split(' ').filter(Boolean)

// say — как ученик это говорит; buttons — с чего начинается подпись кнопки.
export const COMMANDS = [
  {
    id: 'next',
    say: ['дальше', 'далее', 'следующий', 'следующая', 'продолжи', 'продолжай', 'продолжить', 'келесі', 'әрі қарай', 'ары қарай', 'next', 'continue'],
    buttons: ['далее', 'дальше', 'следующ', 'продолж', 'келесі', 'жалғастыр', 'next', 'continue'],
  },
  { id: 'back', say: ['назад', 'вернись', 'артқа', 'кері', 'back'], buttons: ['назад', 'артқа', 'back'] },
  { id: 'check', say: ['проверь', 'проверить', 'тексер', 'тексеру', 'check'], buttons: ['провер', 'тексер', 'check'] },
  {
    id: 'replay',
    say: ['повтори', 'послушать', 'послушай', 'ещё раз', 'включи', 'қайтала', 'тыңда', 'play', 'replay'],
    buttons: ['послуша', 'прослуша', 'повтор', 'ещё раз', 'тыңда', 'қайтала', 'play', 'replay', 'listen'],
  },
  { id: 'stop', say: ['стоп', 'хватит', 'пауза', 'тоқта', 'stop', 'pause'], buttons: ['пауза', 'стоп', 'тоқтат', 'pause', 'stop'] },
  { id: 'close', say: ['закрой', 'закрыть', 'жап', 'жабу', 'close'], buttons: ['закрыть', 'жабу', 'close'] },
]

// Слова команд для грамматики «уха» — ровно в формах словаря модели (Gr.fst сверен
// 21.10.2026: в русской «ещё» только через «ё»; в казахской есть и русские «дальше»,
// «назад», «стоп», а «проверь» нет). Слово не из словаря грамматика тихо теряет.
export const WAKE_COMMAND_WORDS = {
  ru: ['дальше', 'далее', 'следующий', 'продолжи', 'назад', 'вернись', 'проверь', 'проверить', 'повтори', 'послушай', 'послушать', 'ещё раз', 'включи', 'стоп', 'хватит', 'пауза', 'закрой', 'давай', 'нажми', 'пожалуйста'],
  kk: ['келесі', 'әрі қарай', 'ары қарай', 'артқа', 'кері', 'тексер', 'тексеру', 'қайтала', 'тыңда', 'тоқта', 'жап', 'жабу', 'дальше', 'назад', 'стоп', 'бас', 'өтінемін', 'давай'],
}

// Вежливые слова и «нажми» вокруг команды: «давай дальше», «нажми проверить, пожалуйста».
const POLITE = new Set(['давай', 'давайте', 'пожалуйста', 'нажми', 'нажмите', 'ну', 'а', 'и', 'бас', 'басыңыз', 'өтінемін', 'кәне', 'please'].map(normCmd))
const GREET = new Set(['привет', 'салем'])

const SAY = COMMANDS.map((c) => ({ c, say: new Set(c.say.map(normCmd)) }))

/**
 * Ровно ли команда. С name — итог «уха»: сначала позывной («луна», «привет луна»),
 * после него только команда. [unk] после имени — непонятое слово, и команда тогда не
 * команда («луна [unk] дальше» могло быть «луна, не дальше»): пусть решает модель.
 */
export function matchCommand(text, { name = null } = {}) {
  let w = words(text)
  if (name) {
    while (w[0] === 'unk') w = w.slice(1)
    if (GREET.has(w[0]) && w[1] === name) w = w.slice(1)
    if (w[0] !== name) return null
    w = w.slice(1)
  }
  if (w.includes('unk')) return null
  w = w.filter((x) => !POLITE.has(x))
  if (!w.length || w.length > 3) return null
  const phrase = w.join(' ')
  return SAY.find((s) => s.say.has(phrase))?.c || null
}

const CLOSE_MARKS = new Set(['×', '✕', '✖'])

/** Кнопка команды — подпись начинается с одного из её корней («Далее →», «Следующий урок»). */
export function commandButton(command, label) {
  if (command.id === 'close' && CLOSE_MARKS.has(String(label ?? '').trim())) return true
  const n = normCmd(label)
  return Boolean(n) && command.buttons.some((b) => n.startsWith(normCmd(b)))
}

/** Кнопки команды среди номеров снимка (screenSnapshot.snapshotWithRefs). */
export function findCommandButtons(refs, command) {
  const out = []
  for (const [ref, v] of refs || []) if (commandButton(command, v.label)) out.push({ ref, ...v })
  return out
}

/** Слова итога Vosk после имени: есть — ученик сказал что-то кроме позывного. */
export function wakeTail(text, name) {
  const w = words(text)
  const i = w.indexOf(name)
  return i < 0 ? [] : w.slice(i + 1)
}

const LEAD = {
  luna: /^\s*(?:(?:привет|салем|сәлем|hi|hey)[\s,!.]+)?(?:луна|луну|luna)(?:[\s,!.:;—–-]+|$)/iu,
  aizere: /^\s*(?:(?:привет|салем|сәлем|hi|hey)[\s,!.]+)?(?:айзере|aizere)(?:[\s,!.:;—–-]+|$)/iu,
}

/** Распознанная фраза «Луна, …» без обращения — то, что ученик просит. */
export function stripWake(text, personaId) {
  const lead = LEAD[personaId] || LEAD.luna
  return String(text ?? '').replace(lead, '').trim()
}

// Основа слова: у русских форм общая голова («проверь» / «проверить», «закрой» / «закрыть»).
const sameStem = (a, b) => {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i >= 4
}

/**
 * Ученик сам назвал кнопку: не меньше половины слов подписи есть в его словах (с
 * основами) — «выбери like» называет «like», но не «don't like», — или он сказал
 * команду, к которой эта кнопка относится («дальше» → «Далее»).
 */
export function namedByStudent(label, userText) {
  const want = words(label)
  const said = words(userText)
  if (!want.length || !said.length) return false
  const hits = want.filter((w) => said.some((s) => sameStem(w, s))).length
  if (hits > 0 && hits * 2 >= want.length) return true
  const phrase = ` ${said.filter((x) => !POLITE.has(x)).join(' ')} `
  return SAY.some((s) => [...s.say].some((p) => phrase.includes(` ${p} `)) && commandButton(s.c, label))
}
