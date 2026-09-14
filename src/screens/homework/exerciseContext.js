// Запись и текст, к которым относится задание из урока.
//
// На уроке они лежат соседними карточками шага, а в домашку уезжает снимок ОДНОГО
// вопроса — и ученик получал «Listen. Tick what she likes.» без единого плеера, а
// вопросы к статье («an American ___ called Arthur Aron») без самой статьи.
// Админка кладёт их прямо в снимок, рядом с `say` и `imageUrl`; бэкенд снимок не
// разбирает и передаёт как есть.
//
// Спека: docs/superpowers/specs/2026-09-14-homework-exercise-context.md

/** Контекст задания или null. Чужие и битые формы игнорируем молча: снимок мог
 *  прийти от старой админки, и это не повод ломать экран. */
export function exerciseContext(exercise) {
  const context = exercise?.question?.context
  if (!context || typeof context !== 'object') return null
  const audioUrl = typeof context.audioUrl === 'string' ? context.audioUrl.trim() : ''
  const articleHtml = typeof context.articleHtml === 'string' ? context.articleHtml.trim() : ''
  if (!audioUrl && !articleHtml) return null
  return {
    key: typeof context.key === 'string' && context.key ? context.key : null,
    ...(audioUrl ? { audioUrl } : {}),
    ...(articleHtml ? { articleHtml } : {}),
  }
}

/**
 * Упражнения одной отправки — группами по карточке-источнику.
 *
 * Восемь вопросов к одной записи приехали каждый со своей копией контекста (снимок
 * на то и снимок), но на экране плеер и статья должны стоять ОДИН раз над всей
 * группой: иначе статья повторится восемь раз и задание утонет.
 *
 * Группируем только ПОДРЯД идущие: преподаватель переставляет задания у каждого
 * ученика, и вклинившееся между ними чужое упражнение разрывает группу честно —
 * иначе экран собрал бы вместе то, что разведено в его порядке.
 */
export function groupByContext(exercises) {
  const out = []
  for (const exercise of exercises || []) {
    const context = exerciseContext(exercise)
    const last = out[out.length - 1]
    const sameGroup =
      last &&
      context &&
      last.context &&
      context.key &&
      last.context.key === context.key
    if (sameGroup) {
      last.exercises.push(exercise)
      continue
    }
    out.push({ key: `${exercise.id}`, context, exercises: [exercise] })
  }
  return out
}
