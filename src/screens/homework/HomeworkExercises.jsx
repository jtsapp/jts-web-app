import { useEffect, useMemo, useState } from 'react'
import PracticeBlock from '../workspace/blocks/PracticeBlock.jsx'
import { gradeQuestion } from '../workspace/practiceGrading.js'
import { useI18n } from '../../i18n.jsx'
import { saveHomeworkAnswer } from '../../api.js'
import { exerciseBatches, exerciseGroups, groupBlock, groupKey, isAnswered, loadAnswers, revokedEverything, saveAnswers, serverAnswers } from './homeworkExercises.js'

// Задания, которые преподаватель добавил с живого урока. Рисует их тот же
// PracticeBlock, что и на уроке, — здесь только состояние ответов и отправка.
// Проверка тоже уроковая (gradeQuestion): у пропуска сверяется список допустимых
// ответов, у открытого засчитывается любой непустой.
//
// Каждая отправка — своя секция: преподаватель выдаёт задания по ходу занятий, и
// сваленные в одну кучу они не дают понять, что задано сегодня, а что на прошлом уроке.
export default function HomeworkExercises({ hw, token, onSaved, onAnswered }) {
  const { t, lang } = useI18n()
  const batches = useMemo(() => exerciseBatches(hw), [hw])

  // Что уже сохранено на сервере, важнее черновика: ученик мог отвечать с другого
  // устройства, а преподаватель — сбросить ответ через меню упражнения.
  // Смену работы отрабатывает key на компоненте (см. HomeworkDetail), поэтому
  // начальное состояние поднимается один раз и без эффекта.
  const [answers, setAnswers] = useState(() => ({ ...loadAnswers(hw?.id), ...serverAnswers(hw) }))
  const [checked, setChecked] = useState(() => new Set())
  const [failed, setFailed] = useState(() => new Set())

  // Сколько заданий отвечено прямо сейчас — вместе с черновиком, который ещё не
  // уехал на сервер. По этому числу оживает «Отправить на проверку»: решённая
  // работа должна сдаваться, даже если ученик не жал «Проверить» у каждого
  // задания. Отдаём с id работы, иначе при переключении между работами счёт
  // на мгновение относился бы к предыдущей.
  const answeredNow = useMemo(
    () => batches.reduce(
      (sum, batch) => sum + batch.exercises.filter((e) => isAnswered(answers[e.question.id])).length,
      0,
    ),
    [batches, answers],
  )
  useEffect(() => {
    onAnswered?.({ homeworkId: hw?.id, answered: answeredNow })
  }, [onAnswered, hw?.id, answeredNow])

  const onAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value }
      if (hw?.id != null) saveAnswers(hw.id, next)
      return next
    })
  }

  // «Проверить» — момент, когда ответ осмыслен: показываем разбор и отправляем
  // его преподавателю. Не сохранилось — говорим об этом, а не делаем вид, что
  // работа ушла: ученик должен знать, что его ответ преподаватель не увидит.
  // Кнопка теперь одна на карточку, а заданий под ней несколько, поэтому
  // отправляем ТОЛЬКО тронутые: нетронутые ушли бы на сервер пустыми, и
  // преподаватель увидел бы их неверными, хотя ученик до них не дошёл.
  const onCheck = (group) => {
    const key = groupKey(group)
    setChecked((prev) => new Set(prev).add(key))
    // Отметку «не сохранилось» снимаем один раз на нажатие, а не по каждому
    // успеху: под одним ключом уезжает несколько ответов, и успех второго
    // затирал бы отказ первого — ученик решил бы, что всё ушло.
    setFailed((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    if (!token || hw?.id == null) return
    for (const exercise of group.exercises) sendAnswer(exercise, key)
  }

  const sendAnswer = (exercise, key) => {
    const answer = answers[exercise.question.id] ?? null
    // Кнопка «Проверить» на нетронутом задании — просьба показать разбор, а не
    // ответ. Отправлять пустое нельзя: попытка записывалась как состоявшаяся и
    // неверная, и преподаватель получал красный крест с прочерком вместо
    // ответа — хуже, чем честное «ещё не отвечал». Разбор при этом показываем:
    // setChecked выше уже сработал.
    if (!isAnswered(answer)) return

    const { correct } = gradeQuestion(exercise.question, answer)
    saveHomeworkAnswer(hw.id, exercise.id, token, answer, correct)
      .then((saved) => {
        // Сервер возвращает работу целиком. Раньше её выбрасывали, и «Отправить
        // на проверку» весь сеанс считала по данным на момент открытия: ученик
        // решал задания, а кнопка оставалась мёртвой, пока он не перезагрузит
        // страницу.
        if (saved) onSaved?.(saved)
      })
      .catch(() => setFailed((prev) => new Set(prev).add(key)))
  }

  // Задания были, но их отозвали — говорим об этом. Молча спрятать секцию значит
  // оставить ученика гадать, куда делось вчерашнее задание.
  if (!batches.length && revokedEverything(hw)) {
    return <p className="hw__hint hw__hint--revoked">{t('homework.revokedAll')}</p>
  }
  if (!batches.length) return null

  const solvedIn = (list) => list.filter((e) => gradeQuestion(e.question, answers[e.question.id]).correct).length
  const dateOf = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang || 'ru', { day: 'numeric', month: 'long' })
  }

  return (
    <>
      {batches.map((batch) => {
        const solved = solvedIn(batch.exercises)
        const total = batch.exercises.length
        return (
          <section className="hw-block hw-block--exercises" key={batch.key}>
            <div className="hw-block__head">
              <div className="hw-batch__title">
                <h3 className="hw-block__title">{batch.lessonTitle || t('homework.exercises')}</h3>
                {/* Дата отправки: по ней ученик отличает сегодняшнюю выдачу от прошлой. */}
                {batch.addedAt && <span className="hw-batch__date">{t('homework.assignedOn', { date: dateOf(batch.addedAt) })}</span>}
              </div>
              <span className={`hw-exercises__count${total > 0 && solved === total ? ' hw-exercises__count--done' : ''}`}>
                {t('homework.exercisesSolved', { solved, total })}
              </span>
            </div>

            {/* Полоса прогресса — не украшение: заданий в отправке бывает два десятка,
                и по одному счётчику не видно, много ли осталось. */}
            <div
              className="hw-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={solved}
              aria-label={batch.lessonTitle || t('homework.exercises')}
            >
              <span className="hw-progress__bar" style={{ width: `${total ? (solved / total) * 100 : 0}%` }} />
            </div>

            <div className="hw-exercises">
              {exerciseGroups(batch.exercises).map((group) => {
                const key = groupKey(group)
                return (
                  <div className="hw-exercise" key={key}>
                    <PracticeBlock
                      block={groupBlock(group)}
                      answers={answers}
                      checked={checked.has(key)}
                      onAnswer={onAnswer}
                      onCheck={() => onCheck(group)}
                    />
                    {failed.has(key) && <p className="hw-exercise__error">{t('homework.answerNotSaved')}</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
