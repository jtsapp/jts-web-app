import { useMemo, useState } from 'react'
import PracticeBlock from '../workspace/blocks/PracticeBlock.jsx'
import { gradeQuestion } from '../workspace/practiceGrading.js'
import { useI18n } from '../../i18n.jsx'
import { saveHomeworkAnswer } from '../../api.js'
import {
  exerciseBatches,
  exerciseGroups,
  groupBlock,
  hasAnswer,
  loadAnswers,
  saveAnswers,
  serverAnswers,
} from './homeworkExercises.js'

// Задания, которые преподаватель добавил с живого урока. Рисует их тот же
// PracticeBlock, что и на уроке, — здесь только состояние ответов и отправка.
// Проверка тоже уроковая (gradeQuestion): у пропуска сверяется список допустимых
// ответов, у открытого засчитывается любой непустой.
//
// Каждая отправка — своя секция: преподаватель выдаёт задания по ходу занятий, и
// сваленные в одну кучу они не дают понять, что задано сегодня, а что на прошлом
// уроке. Внутри секции задания под общей инструкцией стоят одной карточкой — так
// же, как в уроке, откуда они и пришли.
export default function HomeworkExercises({ hw, token }) {
  const { t, lang } = useI18n()
  const sections = useMemo(
    () => exerciseBatches(hw).map((batch) => ({ ...batch, groups: exerciseGroups(batch.exercises) })),
    [hw],
  )

  // Что уже сохранено на сервере, важнее черновика: ученик мог отвечать с другого
  // устройства, а преподаватель — сбросить ответ через меню упражнения.
  // Смену работы отрабатывает key на компоненте (см. HomeworkDetail), поэтому
  // начальное состояние поднимается один раз и без эффекта.
  const [answers, setAnswers] = useState(() => ({ ...loadAnswers(hw?.id), ...serverAnswers(hw) }))
  const [checked, setChecked] = useState(() => new Set())
  const [failed, setFailed] = useState(() => new Set())

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
  //
  // Уходят только отвеченные вопросы группы: нетронутые преподаватель увидел бы
  // неверными, хотя ученик до них не дошёл.
  const onCheck = (group) => {
    setChecked((prev) => new Set(prev).add(group.key))
    if (!token || hw?.id == null) return

    const answered = group.exercises.filter((e) => hasAnswer(answers[e.question.id]))
    if (!answered.length) return

    Promise.all(answered.map((e) => {
      const answer = answers[e.question.id]
      const { correct } = gradeQuestion(e.question, answer)
      return saveHomeworkAnswer(hw.id, e.id, token, answer, correct)
    }))
      .then(() => setFailed((prev) => {
        const next = new Set(prev)
        next.delete(group.key)
        return next
      }))
      .catch(() => setFailed((prev) => new Set(prev).add(group.key)))
  }

  if (!sections.length) return null

  const solvedIn = (list) => list.filter((e) => gradeQuestion(e.question, answers[e.question.id]).correct).length
  const dateOf = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang || 'ru', { day: 'numeric', month: 'long' })
  }

  return (
    <>
      {sections.map((batch) => {
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
              {batch.groups.map((group) => (
                <div className="hw-exercise" key={group.key}>
                  <PracticeBlock
                    block={groupBlock(group)}
                    answers={answers}
                    checked={checked.has(group.key)}
                    onAnswer={onAnswer}
                    onCheck={() => onCheck(group)}
                  />
                  {failed.has(group.key) && <p className="hw-exercise__error">{t('homework.answerNotSaved')}</p>}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
