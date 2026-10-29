// Замок узла тропы «Обучения» — одно правило на тропу (KingdomInteriorPage) и на
// Луну (lib/assistant/items/catalog.js): «урок закрыт» она говорит ученику по тем же
// условиям, по которым его не откроет тропа (29.10.2026). Почему условия именно
// такие — комментарий у isUnlocked в KingdomInteriorPage.jsx.

/**
 * @param {number} i индекс узла на тропе
 * @param {{ trail: { code: string }[], done: Set<string>, moduleLocked?: boolean,
 *           moduleQuota?: number|null, unlockAll?: boolean }} s
 */
export function lessonUnlocked(i, { trail, done, moduleLocked = false, moduleQuota = null, unlockAll = false }) {
  return (
    !moduleLocked &&
    (moduleQuota == null || i < moduleQuota || Boolean(trail[i] && done.has(trail[i].code))) &&
    (unlockAll || i === 0 || Boolean(trail[i - 1] && done.has(trail[i - 1].code)))
  )
}
