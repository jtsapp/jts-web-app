// Ситуативки бэкенда, которые повторяют сценарии статики «Ситуаций».
//
// На бэкенде (и прод, и дев; на проде — с 06.07.2026) лежат ситуативки id 1–50
// со slug `situ-<уровень>-<NN>` — это те же пятьдесят сценариев A1–C1, что у
// нас в public/practice/situations/ (названия совпадают). Админка нужна им ради
// замков: закрыл ученику все ситуативки уровня — уровень статики пропадает
// (levelLocked в PracticePage). Но «Практика» рисовала их ещё и карточками
// рядом со статикой, и открывались они голым роликом с кнопкой «Отметить
// пройденной» вместо экрана сценария. На деве (11.11.2026) под «Все» было 60
// карточек: 10 сценариев A1 и 50 дублей. На проде тестовому ученику админ
// закрыл всё, кроме B1, — статика A1 пропала, и остались одни дубли (жалоба
// 11.11.2026). Зеркало — только источник замка, своей карточки у него нет.
import { SITUATION_LEVELS } from './levels.js'
import { nearestLevelCode } from '../practiceLevel.js'

const MIRROR_SLUG = /^situ-([a-c][0-2])-(\d{2})$/

/** Сценарий статики, который повторяет ситуативка бэкенда, — `{ level, id }` или null. */
export function staticMirrorOf(situativka) {
  const m = MIRROR_SLUG.exec(String(situativka?.slug || '').trim().toLowerCase())
  if (!m) return null
  const lvl = SITUATION_LEVELS.find((l) => l.code === m[1])
  const id = Number(m[2])
  // Номер сверяем с числом сценариев уровня: ситуативка `situ-b1-11`, заведённая
  // методистом сверх статики, — уже своя, и прятать её нельзя.
  if (!lvl || id < 1 || id > lvl.items) return null
  return { level: lvl.code, id }
}

export function isStaticMirror(situativka) {
  return staticMirrorOf(situativka) != null
}

/**
 * Уровень, чьи сценарии статики показывает раздел.
 *
 * Выбранный уровень — он сам (C2 — ближайший C1). На «Все» раньше всегда
 * брался A1, и ученик, которому админ закрыл A1 (на проде так у тестового
 * ученика: открыт один B1), видел пустоту — а с зеркалами вместо неё ролики.
 * Теперь «Все» — первый открытый уровень.
 */
export function pickSituationsLevel(level, codes, lockedCodes) {
  if (level != null) return nearestLevelCode(level, codes)
  return codes.find((c) => !lockedCodes.has(c)) ?? null
}
