// Проверка ответов — порт checkEx из data/jtsreading.html (~:958–1010).
// Прототип проверял и красил DOM одной функцией; здесь проверка возвращает
// разбор данными, а красит его уже компонент. Семантику не меняем: пары и
// порядок считаются правильными по совпадению индекса с индексом, потому что
// данные лежат в правильном порядке, а перемешивает их initExercise.

import { exTotal, isChoice, isMatch, isOrder, norm, choiceItems } from './engine.js'

// Минимальная длина сочинения. Ниже — ноль очков независимо от ключевых идей:
// иначе «money trust» из двух слов давал бы полный балл (прототип, :972).
export const REFLECT_MIN_WORDS = 8

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
    const raw = String(st.reflect || '')
    const txt = raw.toLowerCase()
    const words = txt.split(/\s+/).filter(Boolean).length
    // Ключевая идея засчитана, если в ответе есть ЛЮБОЙ её синоним. Проверка
    // подстрокой, а не по словам: так «agreement» закрывает ключ «agree».
    const found = ex.keys.filter((alts) => alts.some((a) => txt.includes(a.toLowerCase())))
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
