// Позывной помощника. Луна: «Привет, Луна» / «Сәлем, Луна» (решение 16.10.2026) и
// просто «Луна» (19.10.2026). Айзере — помощник при казахском интерфейсе
// (lib/assistant/persona.js): «Сәлем, Айзере» / «Привет, Айзере» / «Айзере»
// (19.10.2026, решение владельца).
//
// Распознаватель ограничен грамматикой: он выбирает только между позывным,
// словами-ловушками (fillers.js) и «чем-то другим» ([unk]), поэтому не «слышит»
// помощника в каждой реплике урока. Слова обязаны быть в словаре модели — иначе
// грамматика тихо теряет слово:
// - Луна слушает русской моделью vosk-model-small-ru-0.22 (её Gr.fst проверен
//   16.10.2026: «привет», «салем», «луна» есть, «сәлем», «hey» и «айзере» — нет,
//   поэтому казахское «Сәлем» там ловится русским «салем»);
// - Айзере — казахской vosk-model-small-kz-0.42 (Gr.fst проверен 19.10.2026:
//   «айзере», «сәлем», «привет» есть). В русской модели её имени нет вовсе.
//
// Фразу из двух слов принимаем где угодно в распознанном, а одно имя — только
// ПЕРВЫМ словом реплики: «Айзере!», «Айзере, маған көмектесші» — да, «Мен кеше
// Айзеремен сөйлестім», «Полная луна сегодня» — нет (о помощнике, а не к нему).
// Замер 19.10.2026 (WAV голосом Айзере и четырьмя голосами Soniox через фальшивый
// микрофон Chrome, /wake-lab): позывные 35/35, ложных 0 из 94 обычных фраз (ru, kk,
// en). Пока в грамматике не было ловушек, ложных было 23 из 45, и имя одним словом
// приходило из любой фразы («Бүгін ауа райы өте жақсы» → «айзере»).

import { WAKE_COMMAND_WORDS } from '../voiceCommands.js'
import { AIZERE_NEAR, KK_COMMON, LUNA_NEAR, RU_COMMON, RU_COMMON_KK } from './fillers.js'

// Позывной первым, [unk] последним, ловушки — без повторов (общие слова и созвучные
// имени пересекаются: «она», «одна»).
const grammar = (wake, ...fillers) => [...wake, ...new Set(fillers.flat().filter((w) => !wake.includes(w))), '[unk]']

// Команды (21.10.2026, «Луна, дальше» — voiceCommands.js): «имя + команда» фразой — чтобы
// распознаватель слышал пару, а не тянул команду к ловушкам, — и сами команды ловушками:
// иначе «дальше» без имени грамматика притянула бы к ближайшему слову — к имени.
const withCommands = (name, cmds) => cmds.map((c) => `${name} ${c}`)

// Грамматика — фразы, имя, слова-ловушки (fillers.js: без них посторонняя речь
// ложилась на имя — 23 ложных срабатывания из 45), команды и [unk].
export const WAKE_SETS = {
  luna: {
    model: 'ru',
    grammar: grammar(['привет луна', 'салем луна', 'луна', ...withCommands('луна', WAKE_COMMAND_WORDS.ru)], RU_COMMON, LUNA_NEAR, WAKE_COMMAND_WORDS.ru),
    phrases: ['привет луна', 'салем луна'],
    name: 'луна',
  },
  aizere: {
    model: 'kk',
    grammar: grammar(
      ['сәлем айзере', 'привет айзере', 'айзере', ...withCommands('айзере', WAKE_COMMAND_WORDS.kk)],
      KK_COMMON,
      RU_COMMON_KK,
      AIZERE_NEAR,
      WAKE_COMMAND_WORDS.kk,
    ),
    // Сверка — после norm (ә → а), поэтому «салем», а не «сәлем».
    phrases: ['салем айзере', 'привет айзере'],
    name: 'айзере',
  },
}

/** Набор позывного персоны помощника; чужой id — Луна. */
export const wakeSet = (personaId) => WAKE_SETS[personaId] || WAKE_SETS.luna

// Прежние имена — позывной Луны.
export const WAKE_PHRASES = WAKE_SETS.luna.phrases
export const WAKE_NAME = WAKE_SETS.luna.name
export const WAKE_GRAMMAR = WAKE_SETS.luna.grammar

// ә → а — ради «сәлем» = «салем»; остальные казахские буквы — часть слова, а не
// разделитель (иначе «үлкен» распалось бы на обрывки).
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/ә/g, 'а')
    .replace(/[^a-zа-яғқңөұүһі\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Финальный текст распознавателя — позывной? Фраза — слова подряд где угодно, имя — первым словом. */
export function matchWake(text, set = WAKE_SETS.luna) {
  const t = norm(text)
  if (!t) return false
  if (set.phrases.some((p) => ` ${t} `.includes(` ${p} `))) return true
  // [unk] (шум, вдох; после norm — «unk») перед именем — не слово: «[unk] луна» — имя первым.
  return t.split(' ').find((w) => w !== 'unk') === set.name
}

/**
 * Где в итоге Vosk началось обращение (сек от начала прослушивания): имя или приветствие
 * перед ним. По нему «ухо» отрезает звук команды, сказанной одним духом (preroll.js).
 */
export function wakeStartSec(words, set = WAKE_SETS.luna) {
  const list = Array.isArray(words) ? words : []
  const i = list.findIndex((w) => norm(w?.word) === set.name)
  if (i < 0) return null
  const greet = i > 0 && ['привет', 'салем'].includes(norm(list[i - 1]?.word)) ? list[i - 1] : null
  const start = Number((greet || list[i]).start)
  return Number.isFinite(start) ? start : null
}
