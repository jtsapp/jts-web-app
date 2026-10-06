import { isLessonLive, lessonEnd, parseLessonDate } from './lessonFormat.js'

// Без durationMinutes конец совпадает с началом, и урок пропадал бы из
// карточки ровно в назначенную минуту — хотя преподаватель ещё может открыть
// класс с опозданием. Считаем такому уроку стандартный час.
function endOf(o) {
  return o.durationMinutes
    ? lessonEnd(o)
    : new Date(parseLessonDate(o.scheduledAt).getTime() + 60 * 60000)
}

// Сколько урок со статусом «идёт» ещё считается идущим после конца по
// расписанию. Бэкенд сам урок не закрывает: если преподаватель не нажал
// «Завершить», урок остаётся IN_PROGRESS навсегда. На проде 01.10.2026 так
// незакрытый урок 21 сентября занял карточку над календарём, и кнопка
// «Присоединиться к уроку» вела в него, а не в сегодняшний (у этого ученика
// «Проведено: 0» — ни один урок не закрыт). Трёх часов хватает и на урок,
// который преподаватель начал с опозданием, и на урок, перешедший за полночь.
export const LIVE_STALE_AFTER_MS = 3 * 60 * 60000

// Идущий прямо сейчас урок — среди всех занятий, а не только выбранного дня.
//
// Календарь показывает один день, и по умолчанию это сегодня. Урок, который
// преподаватель начал поздно вечером, после полуночи лежит на вчерашней клетке:
// ученик открывает расписание, видит «Преподаватель ещё не начал урок» про
// сегодняшнее занятие и уходит, а учитель в это время ведёт урок и ждёт его.
// Поэтому идущий урок ищется по всему списку и показывается поверх календаря —
// но только пока он не кончился по расписанию больше чем на
// LIVE_STALE_AFTER_MS: забытый незакрытый урок прошлой недели не идёт.
export function findLiveOccurrence(occurrences, now = new Date()) {
  const live = (occurrences || []).filter(
    (o) => isLessonLive(o.lessonStatus) && endOf(o).getTime() + LIVE_STALE_AFTER_MS >= now.getTime()
  )
  if (live.length === 0) return null
  // Если почему-то идут два — берём тот, что начался раньше: он и есть текущий.
  return live.slice().sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))[0]
}

// Урок для карточки над календарём: идущий сейчас, а если такого нет —
// ближайший, который ещё не кончился по часам. Просроченные (время вышло, а
// преподаватель урок так и не открыл) сюда не попадают: предлагать «войти» в
// занятие, которого уже не будет, — обман.
export function pickFeaturedOccurrence(occurrences, now = new Date()) {
  const live = findLiveOccurrence(occurrences, now)
  if (live) return live

  return (occurrences || [])
    .filter((o) => o.lessonStatus === 'SCHEDULED' && endOf(o) >= now)
    .sort((a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt))[0] || null
}
