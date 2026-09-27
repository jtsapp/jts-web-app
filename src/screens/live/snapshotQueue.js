// Кому преподаватель отдаёт ответ своей рамки на request-snapshot.
//
// Снимок рамки просят двое: «Внимание» (поток уходит всему классу) и ученик,
// вошедший посреди показа (catch-up, спека live-lesson-server-state §5.2), —
// ему поток уходит адресно. Рамка не говорит, на какой запрос отвечает, поэтому
// запрос один на всех ждущих, а «Внимание» перекрывает адресные просьбы: ждущие
// получат снимок общим каналом.
//
// Просьбы одного ученика чаще раза в `cooldownMs` не обслуживаются: ответ —
// весь поток рамки, и ученик на рвущейся связи гонял бы его по кругу. Часы
// подставляются (`now`) — отсечку проверяют тесты, а не секундомер.

const EMPTY = () => ({ everyone: false, students: new Set(), askedAt: null })

export function createSnapshotQueue({ cooldownMs, now = () => Date.now() }) {
  const lastAsked = new Map()
  let waiting = EMPTY()
  return {
    /** Ученик просит догнать класс. true — пора спросить рамку. */
    ask(studentId) {
      const t = now()
      const last = lastAsked.get(studentId)
      if (last != null && t - last < cooldownMs) return false
      lastAsked.set(studentId, t)
      waiting.students.add(studentId)
      if (waiting.everyone) return false
      if (waiting.askedAt != null && t - waiting.askedAt < cooldownMs) return false
      waiting.askedAt = t
      return true
    },
    /** «Внимание»: ответ рамки уходит всему классу. */
    askEveryone() {
      waiting.everyone = true
    },
    /** Ответ рамки пришёл — кому его отдать; очередь пустеет. */
    take() {
      const done = waiting
      waiting = EMPTY()
      return { everyone: done.everyone, students: [...done.students] }
    },
  }
}
