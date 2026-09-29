// Кому преподаватель отдаёт ответ своей рамки на request-snapshot.
//
// Снимок рамки просят двое: «Внимание» (поток уходит всему классу) и ученик,
// вошедший посреди показа (catch-up, спека live-lesson-server-state §4.3), —
// ему поток уходит адресно. Рамка не говорит, на какой запрос отвечает, поэтому
// в полёте не больше одного запроса: просьбы, пришедшие до ответа, ждут его же.
// «Внимание» перекрывает адресные просьбы — ждущие получат снимок общим каналом.
// Ответ, которого никто не ждёт (второй подряд, запоздалый), выбрасывается: без
// адресата он ушёл бы всему классу и повторил поток на уже пройденных страницах.
//
// Запрос в полёте и «Внимание» истекают через `timeoutMs` без ответа: рамка
// могла грузиться и потерять запрос, и без истечения очередь молчала бы до
// конца урока. Просьбы про одну пару (ученик, материал) чаще раза в `cooldownMs`
// не обслуживаются: ответ — весь поток рамки, и ученик на рвущейся связи гонял
// бы его по кругу. Часы подставляются (`now`) — сроки проверяют тесты, а не
// секундомер.

export function createSnapshotQueue({ cooldownMs, timeoutMs, now = () => Date.now() }) {
  const lastAsked = new Map()
  let waiting = new Set()
  // Когда ушёл запрос, ответа на который ещё нет, и когда его просили для
  // всего класса. null — нет.
  let requestedAt = null
  let forClassAt = null
  const fresh = (at) => at != null && now() - at < timeoutMs
  const reset = () => {
    waiting = new Set()
    requestedAt = forClassAt = null
  }

  return {
    /** Ученик просит догнать класс на материале. true — пора спросить рамку. */
    ask(studentId, materialId) {
      const t = now()
      const pair = `${studentId}:${materialId}`
      const last = lastAsked.get(pair)
      if (last != null && t - last < cooldownMs) return false
      lastAsked.set(pair, t)
      waiting.add(studentId)
      if (fresh(requestedAt)) return false
      requestedAt = t
      return true
    },
    /** «Внимание»: запрос в рамку уже ушёл, ответ — всему классу. */
    askEveryone() {
      requestedAt = forClassAt = now()
    },
    /** Ответ рамки пришёл — кому его отдать; очередь пустеет. */
    take() {
      const answer = { everyone: fresh(forClassAt), students: [...waiting] }
      reset()
      return answer
    },
    /** Класс отпустили или материал сменился — ответ старой страницы ничей. */
    reset,
  }
}
