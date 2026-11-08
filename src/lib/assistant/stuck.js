// «Застряли? Подсказать?» (28.10.2026, решение владельца): когда ученик ошибся
// (с 08.11 — с первого раза, см. STUCK) или долго ничего не делает на задании,
// у кнопки Луны выходит облачко. Здесь — только счёт «пора или нет», без DOM и таймеров:
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

// ТЗ v2.0, 7.2б (08.11.2026): «Подсказать?» — после ПЕРВОГО неверного ответа (было две ошибки). Дальше ступени ведёт
// окно (hintSteps.js): второй неверный ответ на задании, где подсказка уже была, сам даёт следующую ступень — для этого
// счётчик ошибок (wrongs) виден снаружи.
// Простой — два уровня (ТЗ 7.2, кейс 6): первый — «Подсказать?» через idleMs (ТЗ пишет 60 с, владелец 28.10.2026
// поставил 90 — оставляем его), второй — ещё через idle2Ms «Передохнуть?» (перерыв 5 минут или разобрать проще); дальше
// тишина до действия ученика: не больше двух уровней на шаг.
export const STUCK = { wrongLimit: 1, idleMs: 90_000, idle2Ms: 60_000, cooldownMs: 180_000, ignoreLimit: 2, showMs: 12_000 }

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
  let idle2For = null // …и второй уровень этого же простоя
  let ignoredInRow = 0
  let off = false
  let wrongs = 0 // всех неверных проверок за визит — по росту окно видит «ещё одна ошибка»

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
    /**
     * Снимок после действия ученика: 'errors' — пора предложить подсказку. quiet — только счёт (окно открыто, другое
     * облачко): ошибку видно для ступеней подсказки, а облачко и его пауза не тратятся.
     */
    observe({ screen: id, text, now, quiet = false }) {
      enter(id)
      const m = verdictMarks(text)
      // Пометка неверного появилась или сменилась (новый вариант, новый ввод) — это
      // новая проверка. Та же — ученик нажал что-то другое («Послушать»).
      if (m.wrong && m.wrong !== last.wrong) {
        errors++
        wrongs++
      } else if (m.right && m.right !== last.right && !m.wrong) errors = 0
      last = m
      if (quiet || errors < o.wrongLimit || !canShow(now)) return null
      show(now)
      return 'errors'
    },
    /**
     * Ученик ничего не делает с lastActionAt: 'idle' — первый уровень, 'idle2' — второй (тот же простой ещё idle2Ms
     * после первого). Каждый — один раз на простой; второй не ждёт паузы облачка: это продолжение того же простоя.
     */
    idle({ screen: id, now, lastActionAt, task }) {
      enter(id)
      if (!task || off) return null
      const quiet = now - lastActionAt
      if (idleFor !== lastActionAt) {
        if (quiet < o.idleMs || !canShow(now)) return null
        idleFor = lastActionAt
        show(now)
        return 'idle'
      }
      if (idle2For === lastActionAt || quiet < o.idleMs + o.idle2Ms) return null
      idle2For = lastActionAt
      show(now)
      return 'idle2'
    },
    /** Ученик нажал облачко. */
    taken() {
      ignoredInRow = 0
    },
    /**
     * Облачко ушло без нажатия: дважды подряд — до конца визита его нет, оно мешает. Второй уровень простоя в счёт не
     * идёт: он и так последний на этот простой, а «выключить облачко на весь визит» из-за него — лишнее.
     */
    ignored(reason) {
      if (reason === 'idle2') return
      ignoredInRow++
      if (ignoredInRow >= o.ignoreLimit) off = true
    },
    isOff: () => off,
    wrongs: () => wrongs,
  }
}
