import { canJoin, lessonEnd, parseLessonDate } from './lessonFormat.js'

// Идущий прямо сейчас урок — среди всех занятий, а не только выбранного дня.
//
// Календарь показывает один день, и по умолчанию это сегодня. Урок, который
// преподаватель начал вчера вечером и не закрыл, остаётся IN_PROGRESS, но лежит
// на вчерашней клетке: ученик открывает расписание, видит «Преподаватель ещё не
// начал урок» про сегодняшнее занятие и уходит. Учитель в это время ведёт урок
// и ждёт его. Поэтому идущий урок ищется по всему списку и показывается поверх
// календаря.
export function findLiveOccurrence(occurrences) {
  const live = (occurrences || []).filter((o) => canJoin(o.lessonStatus))
  if (live.length === 0) return null
  // Если почему-то идут два — берём тот, что начался раньше: он и есть текущий.
  return live.slice().sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))[0]
}

// Урок для карточки над календарём: идущий сейчас, а если такого нет —
// ближайший, который ещё не кончился по часам. Просроченные (время вышло, а
// преподаватель урок так и не открыл) сюда не попадают: предлагать «войти» в
// занятие, которого уже не будет, — обман.
export function pickFeaturedOccurrence(occurrences, now = new Date()) {
  const live = findLiveOccurrence(occurrences)
  if (live) return live

  // Без durationMinutes конец совпадает с началом, и урок пропадал бы из
  // карточки ровно в назначенную минуту — хотя преподаватель ещё может открыть
  // класс с опозданием. Считаем такому уроку стандартный час.
  const endOf = (o) => (o.durationMinutes
    ? lessonEnd(o)
    : new Date(parseLessonDate(o.scheduledAt).getTime() + 60 * 60000))

  return (occurrences || [])
    .filter((o) => o.lessonStatus === 'SCHEDULED' && endOf(o) >= now)
    .sort((a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt))[0] || null
}
