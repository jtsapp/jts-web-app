// Сборка сессии сцены — порт poolFor/shuffle/buildSession/separateConfusables
// из data/jtswords.html (~:243, 335, 500). Сессия сцены — это её пул слов,
// нарезанный на раунды: показывать двадцать спрайтов разом некуда, слоты
// кончатся.
//
// Ни DOM, ни Math.random: ориентация приходит аргументом, случайность — сидом.
// Иначе движок нечем накрыть тестом и не с чем сверить оракул
// (__fixtures__/oracle-<section>.json, считает сам прототип).

// Слов в раунде. В портрете меньше: сцена уже, и восемь спрайтов там
// налезают друг на друга.
export const ROUND_SIZE = 8
export const ROUND_SIZE_PORTRAIT = 6

/**
 * mulberry32 — короткий воспроизводимый ГПСЧ. Тот же, что в экстракторе:
 * фикстуры и рантайм обязаны мешать одинаково, иначе оракул проверяет не то.
 */
export function makeRng(seed) {
  let a = seed >>> 0
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Тасование Фишера—Йетса, как в прототипе: с конца, с копией на входе. */
export function shuffle(list, rng) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Пул сцены: её домашние слова плюс гости из соседней (`also`).
 * Слова без картинки сюда не доезжают — их отбрасывает ещё экстрактор.
 */
export function poolFor(scene, words) {
  return words.filter((w) => w.env === scene.id || w.also === scene.id)
}

/**
 * Разводит визуально путаемые пары по разным раундам: frog и toad в одном
 * задании превращают «услышь и найди» в угадайку. Меняет местами одного из
 * пары со словом соседнего раунда, которое само ни с кем в этом раунде не
 * путается. Три прохода — как в прототипе: обмен может свести новую пару.
 */
export function separateConfusables(rounds, confusable) {
  if (!confusable || !confusable.length || rounds.length < 2) return rounds
  for (let pass = 0; pass < 3; pass++) {
    for (const [a, b] of confusable) {
      const ra = rounds.findIndex((r) => r.some((x) => x.id === a))
      const rb = rounds.findIndex((r) => r.some((x) => x.id === b))
      if (ra < 0 || rb < 0 || ra !== rb) continue
      const other = (ra + 1) % rounds.length
      const j = rounds[other].findIndex(
        (x) => !confusable.some((p) => p.includes(x.id) && rounds[ra].some((y) => p.includes(y.id) && y.id !== x.id)),
      )
      if (j < 0) continue
      const bi = rounds[ra].findIndex((x) => x.id === b)
      const tmp = rounds[ra][bi]
      rounds[ra][bi] = rounds[other][j]
      rounds[other][j] = tmp
    }
  }
  return rounds
}

/**
 * Сессия сцены: перемешанный пул, нарезанный на раунды примерно поровну.
 * Именно поровну, а не «по восемь и остаток»: иначе последний раунд был бы
 * из одного слова.
 *
 * Генератор можно передать готовым (`rng`), а не сидом: сцена сначала мешает
 * пул, потом раскладывает раунд, и в прототипе это ОДНА последовательность
 * случайных чисел. Оракул снят с неё же — поэтому тест делит один rng между
 * buildSession и placeRound.
 *
 * @param {{id: string, slots: Array}} scene
 * @param {Array} words — слова секции
 * @param {{seed?: number, rng?: Function, portrait?: boolean, confusable?: Array}} opts
 */
export function buildSession(scene, words, { seed = Date.now(), rng: given, portrait = false, confusable = [] } = {}) {
  const rng = given || makeRng(seed)
  const size = portrait ? ROUND_SIZE_PORTRAIT : ROUND_SIZE
  const pool = shuffle(poolFor(scene, words), rng)
  const count = Math.max(1, Math.ceil(pool.length / size))
  const per = Math.ceil(pool.length / count)
  const rounds = []
  for (let i = 0; i < pool.length; i += per) rounds.push(pool.slice(i, i + per))
  separateConfusables(rounds, confusable)
  return { scene, pool, rounds }
}
