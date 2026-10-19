// «Word Rush» — какие звуки дал кадр. Движок про звук не знает и знать не
// должен: событие видно по разнице двух состояний забега, до кадра и после,
// поэтому звуки выводятся здесь, чисто, и проверяются тем же прогоном
// кадров, что и правила.
//
// Счётчики (`coins`, `boosts`, `hits`, `seq`) только растут, поэтому
// сравнения «стало больше» хватает. Снесённое в турбо препятствие отдельного
// счётчика не имеет — его узнаём по `smashed`, которого у того же id в
// прошлом кадре ещё не было.

export function cuesOf(prev, next) {
  if (!prev || !next) return []
  const out = []
  // Две монеты в одном кадре (длинный кадр после подвисания) — один звон:
  // два одинаковых тона в одну и ту же долю секунды слышны как один, только громче.
  if (next.coins > prev.coins) out.push('coin')
  if (next.boosts > prev.boosts) out.push('boost')
  if (next.hits > prev.hits) out.push('crash')
  if (smashedNow(prev, next)) out.push('smash')
  if (next.seq > prev.seq && next.last) out.push(next.last.hit ? 'correct' : 'wrong')
  return out
}

function smashedNow(prev, next) {
  if (!next.obstacles?.length) return false
  const before = new Set(prev.obstacles?.filter((o) => o.smashed).map((o) => o.id))
  return next.obstacles.some((o) => o.smashed && !before.has(o.id))
}
