// Сдачи игр «Грамматики · игр» на бэкенд (POST /mobile/grammar-games/result).
//
// Сбой сети не должен ни отменять экран результата, ни терять звёзды: сдача
// остаётся в очереди (память вкладки) и уходит вместе со следующей — или при
// следующем заходе в раздел. Монеты за неё придут тогда же: их считает только
// бэкенд, по своему лучшему результату, поэтому повторная отправка не
// начисляет дважды.
//
// 409 — та же сдача этой игры уже записывается (две вкладки, двойной клик):
// бэкенд просит повторить, а не отказывает. 400 и 404 — отказ по существу (тема
// скрыта методистом, игра не из набора темы): такую сдачу не копим, иначе она
// висела бы в очереди и уходила с каждой следующей. 401/403/429 — не про сдачу, а
// про сессию или нагрузку (ноутбук проснулся с протухшим access): ждут повтора.

const key = (b) => `${b.topicId}|${b.game}`
const REFUSED = new Set([400, 404, 422])

/**
 * @param {(body: {topicId: string, game: string, stars: number}) => Promise<{best?: number, coins?: number}>} send
 * @param {{wait?: (ms: number) => Promise<void>}} [opts]
 */
export function createResultQueue(send, { wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const pending = new Map()
  let chain = Promise.resolve()

  async function postOne(body) {
    for (let i = 0; ; i++) {
      try {
        return await send(body)
      } catch (e) {
        if (e?.status === 409 && i < 3) {
          await wait(500 * (i + 1))
          continue
        }
        throw e
      }
    }
  }

  // Отправляет всё, что ждёт; сдачи одной игры не дублируются — в очереди лежит лучшая.
  async function flushNow() {
    let coins = 0
    const done = new Map()
    for (const [k, body] of [...pending]) {
      try {
        const r = await postOne(body)
        coins += Math.max(0, Number(r?.coins) || 0)
        done.set(k, Number.isFinite(Number(r?.best)) ? Number(r.best) : body.stars)
        // за время запроса могла прийти сдача лучше — её не стираем
        if (pending.get(k) === body) pending.delete(k)
      } catch (e) {
        if (REFUSED.has(e?.status)) pending.delete(k)
      }
    }
    return { coins, done }
  }

  function run() {
    const p = chain.then(flushNow)
    chain = p.catch(() => {})
    return p
  }

  return {
    /** Монеты за все ушедшие сейчас сдачи и лучший результат этой; null — эта не дошла. */
    submit({ topicId, game, stars }) {
      // Только поля контракта: бэкенд строгий, лишнее поле — 400.
      const body = { topicId, game, stars }
      const prev = pending.get(key(body))
      if (!prev || prev.stars < stars) pending.set(key(body), body)
      return run().then(({ coins, done }) => (done.has(key(body)) ? { coins, best: done.get(key(body)) } : null))
    },
    /** Дослать ждущее (заход в раздел); монеты за дошедшие. */
    flush() {
      return run().then((r) => r.coins)
    },
    /** Звёзды, которых сервер ещё не видел: экран кладёт их поверх ответа /progress. */
    pendingStars() {
      const out = {}
      for (const b of pending.values()) (out[b.topicId] ||= {})[b.game] = b.stars
      return out
    },
  }
}
