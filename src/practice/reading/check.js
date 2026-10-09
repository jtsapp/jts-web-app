// Проверка ответов — порт checkEx из data/jtsreading.html (~:958–1010).
// Прототип проверял и красил DOM одной функцией; здесь проверка возвращает
// разбор данными, а красит его уже компонент. Семантику не меняем: пары и
// порядок считаются правильными по совпадению индекса с индексом, потому что
// данные лежат в правильном порядке, а перемешивает их initExercise.

import { exTotal, isChoice, isMatch, isOrder, norm, choiceItems } from './engine.js'

// Минимальная длина сочинения. Ниже — ноль очков независимо от ключевых идей:
// иначе «money trust» из двух слов давал бы полный балл (прототип, :972).
export const REFLECT_MIN_WORDS = 8

// iPhone и Word ставят типографский апостроф (don’t) — ключи в данных с
// ASCII-апострофом.
const reflectNorm = (s) =>
  String(s).toLowerCase().replace(/[‘’ʼ´`]/g, "'").replace(/\s+/g, ' ')
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Есть ли в ответе синоним ключевой идеи. Прототип искал его подстрокой где
 * угодно, и балл давали чужие слова: «so» в «also», «possible» в «impossible»,
 * «ai» в «said» (ревью 08.10.2026). Теперь ключ засчитывается только с начала
 * слова. Длинный ключ может продолжаться — как в прототипе, agreement
 * закрывает agree. Короткий (до трёх букв) — только целым словом или с
 * окончанием, иначе «so» сидел бы в «some», а «ok» в «okay». Ключ с апострофом
 * засчитывается и без него: dont с телефона — тот же don't.
 */
function hasKey(txt, alt) {
  const key = reflectNorm(alt).trim()
  if (!key) return false
  let tail = ''
  if (key.length <= 3) {
    // Окончания, которые подстрока прототипа засчитывала: cars, older, eaten,
    // удвоение перед окончанием (fitting) и d/n после немой e (aged, seen).
    // Голое d только после e: card — не форма car.
    const ends = ['s', 'es', 'ed', 'ing', 'er', 'est', 'en', `${escapeRe(key.slice(-1))}(?:ed|ing|er|est)`]
    if (key.endsWith('e')) ends.push('d', 'n')
    tail = `(?:${ends.join('|')})?(?![a-z0-9])`
  }
  // Начало слова — через (^|не-буква), а не lookbehind: его не знает Safari
  // на iOS до 16.4, и new RegExp там упал бы.
  return [key, key.replace(/'/g, '')].some((k) => new RegExp('(?:^|[^a-z0-9])' + escapeRe(k) + tail).test(txt))
}

/**
 * @param ex   упражнение из данных уровня
 * @param st   состояние ответа (см. initExercise)
 * @returns {{score:number,total:number,detail:object}}
 */
export function checkExercise(ex, st) {
  const total = exTotal(ex)

  if (isChoice(ex.type)) {
    // Подписи вариантов проверке не нужны — сравниваем индексы.
    const items = choiceItems(ex, { yes: '', no: '', notGiven: '' })
    const rows = items.map((it, k) => ({
      chosen: st.sel[k] === undefined ? null : st.sel[k],
      answer: it.a,
      ok: st.sel[k] === it.a,
      e: it.e,
    }))
    return { score: rows.filter((r) => r.ok).length, total, detail: { rows } }
  }

  if (ex.type === 'reflection') {
    const txt = reflectNorm(st.reflect || '')
    const words = txt.split(/\s+/).filter(Boolean).length
    // Ключевая идея засчитана, если в ответе есть ЛЮБОЙ её синоним (hasKey).
    const found = ex.keys.filter((alts) => alts.some((a) => hasKey(txt, a)))
    const short = words < REFLECT_MIN_WORDS
    return {
      score: short ? 0 : Math.min(total, found.length),
      total,
      detail: {
        short,
        words,
        foundCount: found.length,
        keysTotal: ex.keys.length,
        // Наружу отдаём по первому синониму каждой идеи — он в данных основной.
        found: found.map((k) => k[0]),
        missing: ex.keys.filter((k) => !found.includes(k)).map((k) => k[0]),
      },
    }
  }

  if (isMatch(ex.type)) {
    const rows = ex.pairs.map((_, k) => ({ ok: st.pairs[k] === k, chosen: st.pairs[k] ?? null }))
    return { score: rows.filter((r) => r.ok).length, total, detail: { rows } }
  }

  if (ex.type === 'gap') {
    const rows = st.answers.map((answer, k) => {
      const b = st.fill[k]
      const given = b === null || b === undefined ? null : st.bank[b]
      return { ok: given !== null && norm(given) === norm(answer), given, answer }
    })
    return { score: rows.filter((r) => r.ok).length, total, detail: { rows } }
  }

  if (isOrder(ex.type)) {
    const rows = st.seq.map((k, pos) => ({ ok: k === pos, item: ex.items[k] }))
    return { score: rows.filter((r) => r.ok).length, total, detail: { rows } }
  }

  return { score: 0, total, detail: {} }
}

/** Оценка настроения результата — пороги прототипа (viewResult, :1060). */
export function mood(pct) {
  if (pct >= 90) return 'great'
  if (pct >= 60) return 'good'
  return 'keep'
}
