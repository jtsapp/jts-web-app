// Юнит «Практики», решённый в уроке конструктора.
//
// Преподаватель переносит упражнения юнита грамматики в урок (web-admin, «Из
// Практики»), и блок получает id `pg-<уровень>-<юнит>-<uuid>`. На странице урока
// id блока — это `data-tid` задания, а мост страницы на каждую проверку ученика
// шлёт родителю `{source:'jts-lesson', type:'task-checked', tid, pageTids}`
// (MaterialBridgeScriptInjector на бэкенде) — и при живой проверке, и когда
// проигрывает сохранённые ответы ученика из прошлых заходов.
//
// Юнит засчитывается, когда проверены все задания этого юнита на странице: сколько
// преподаватель взял, столько и надо решить (решение владельца 01.11.2026 — «любая
// взятая часть»). Как в самой «Практике», где юнит пройден, когда ученик дошёл до
// конца, счёт не важен: важно, что задание проверено.

const PRACTICE_TID = /^pg-([a-z]\d)-(\d{1,4})-/

/** Уровень и номер юнита из tid задания; `null` — задание не из «Практики». */
export function practiceUnitOf(tid) {
  const match = PRACTICE_TID.exec(String(tid ?? ''))
  return match ? { level: match[1], unitId: Number(match[2]) } : null
}

/** `{ tid, pageTids }` из сообщения рамки; `null` — это не сообщение о проверке. */
export function parseTaskCheckedMessage(data) {
  if (!data || data.source !== 'jts-lesson' || data.type !== 'task-checked') return null
  if (typeof data.tid !== 'string' || !data.tid) return null
  const pageTids = Array.isArray(data.pageTids) ? data.pageTids.filter((tid) => typeof tid === 'string') : []
  return { tid: data.tid, pageTids }
}

/**
 * Счётчик проверенных заданий одной рамки. `markDone(level, unitId)` зовётся один
 * раз на юнит: повтор отметки «Практике» не вредит, но каждый раз уходил бы отчёт в
 * домашку.
 */
export function createPracticeUnitCredit(markDone) {
  const checked = new Set()
  const credited = new Set()
  return {
    onChecked({ tid, pageTids }) {
      const unit = practiceUnitOf(tid)
      if (!unit) return
      checked.add(tid)
      const key = `${unit.level}:${unit.unitId}`
      if (credited.has(key)) return
      const prefix = `pg-${unit.level}-${unit.unitId}-`
      const unitTids = [tid, ...pageTids.filter((other) => other.startsWith(prefix))]
      if (unitTids.every((other) => checked.has(other))) {
        credited.add(key)
        markDone(unit.level, unit.unitId)
      }
    },
  }
}
