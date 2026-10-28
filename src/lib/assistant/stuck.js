// «Застряли? Подсказать?» (28.10.2026, решение владельца): когда ученик ошибся
// дважды подряд или полторы минуты ничего не делает на задании, у кнопки Луны
// выходит облачко. Здесь — только счёт «пора или нет», без DOM и таймеров:
// снимки экрана и время приносит useStuckWatch.js.
//
// Ошибку видно по той же разметке, по которой Луна читает задание
// (screenSnapshot.js): «(отмечено как неверное)» у вариантов и полей и эталон
// «[верный ответ по заданию: …]» — его сайт ставит только после неверного
// ответа. Разделы при этом не трогаем: всё, что размечено для Луны,
// подхватывается само.
//
// «Подряд» — без верной проверки между ними, на одном экране, но не обязательно
// на одном задании: в уроках «Обучения» после ошибки сайт показывает ответ и
// ведёт дальше, и двух ошибок на одном задании там не бывает.

export const STUCK = { wrongLimit: 2, idleMs: 90_000, cooldownMs: 180_000, ignoreLimit: 2, showMs: 12_000 }

const WRONG_TOKEN = /\[[^\]]*отмечено как неверное[^\]]*\]|\[верный ответ по заданию: [^\]]*\]/g
const RIGHT_TOKEN = /\[[^\]]*отмечено как верное[^\]]*\]/g

const sig = (text, re) =>
  (String(text ?? '').match(re) || []).map((t) => t.replace(/\s+/g, ' ').trim()).join('|')

/** Подписи проверки на экране: всё неверное и всё верное — строками для сравнения. */
export function verdictMarks(text) {
  return { wrong: sig(text, WRONG_TOKEN), right: sig(text, RIGHT_TOKEN) }
}

export function createStuckTracker(opts = {}) {
  const o = { ...STUCK, ...opts }
  let screen = null
  let last = { wrong: '', right: '' }
  let errors = 0
  let shownAt = -Infinity
  let idleFor = null // простой, о котором уже сказали (его lastActionAt)
  let ignoredInRow = 0
  let off = false

  // Новый экран — новый счёт; его пометки (text) — то, что было до ученика.
  const enter = (id, text = '') => {
    if (id === screen) return
    screen = id
    last = verdictMarks(text)
    errors = 0
  }
  const canShow = (now) => !off && now - shownAt >= o.cooldownMs
  const show = (now) => {
    shownAt = now
    errors = 0
  }

  return {
    /** Экран открылся (или наблюдение началось): его пометки — не ошибки ученика. */
    baseline({ screen: id, text }) {
      screen = null
      enter(id, text)
    },
    /** Снимок после действия ученика: 'errors' — пора предложить подсказку. */
    observe({ screen: id, text, now }) {
      enter(id)
      const m = verdictMarks(text)
      // Пометка неверного появилась или сменилась (новый вариант, новый ввод) — это
      // новая проверка. Та же — ученик нажал что-то другое («Послушать»).
      if (m.wrong && m.wrong !== last.wrong) errors++
      else if (m.right && m.right !== last.right && !m.wrong) errors = 0
      last = m
      if (errors < o.wrongLimit || !canShow(now)) return null
      show(now)
      return 'errors'
    },
    /** Ученик ничего не делает с lastActionAt: 'idle' — один раз на простой. */
    idle({ screen: id, now, lastActionAt, task }) {
      enter(id)
      if (!task || now - lastActionAt < o.idleMs || idleFor === lastActionAt || !canShow(now)) return null
      idleFor = lastActionAt
      show(now)
      return 'idle'
    },
    /** Ученик нажал облачко. */
    taken() {
      ignoredInRow = 0
    },
    /** Облачко ушло без нажатия: дважды подряд — до конца визита его нет, оно мешает. */
    ignored() {
      ignoredInRow++
      if (ignoredInRow >= o.ignoreLimit) off = true
    },
    isOff: () => off,
  }
}
