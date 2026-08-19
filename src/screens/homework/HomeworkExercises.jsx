import { useMemo, useState } from 'react'
import PracticeBlock from '../workspace/blocks/PracticeBlock.jsx'
import { gradeQuestion } from '../workspace/practiceGrading.js'
import { useI18n } from '../../i18n.jsx'
import { saveHomeworkAnswer } from '../../api.js'
import { exerciseBlock, lessonExercises, loadAnswers, saveAnswers, serverAnswers } from './homeworkExercises.js'

// Задания, которые преподаватель добавил с живого урока. Рисует их тот же
// PracticeBlock, что и на уроке, — здесь только состояние ответов и отправка.
// Проверка тоже уроковая (gradeQuestion): у пропуска сверяется список допустимых
// ответов, у открытого засчитывается любой непустой.
export default function HomeworkExercises({ hw, token }) {
  const { t } = useI18n()
  const exercises = useMemo(() => lessonExercises(hw), [hw])

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
  const onCheck = (exercise) => {
    const key = `hw-${exercise.id}`
    setChecked((prev) => new Set(prev).add(key))
    if (!token || hw?.id == null) return

    const answer = answers[exercise.question.id] ?? null
    const { correct } = gradeQuestion(exercise.question, answer)
    saveHomeworkAnswer(hw.id, exercise.id, token, answer, correct)
      .then(() => setFailed((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      }))
      .catch(() => setFailed((prev) => new Set(prev).add(key)))
  }

  if (!exercises.length) return null

  const solved = exercises.filter((e) => gradeQuestion(e.question, answers[e.question.id]).correct).length

  return (
    <section className="hw-block">
      <h3 className="hw-block__title">
        {t('homework.exercises')}
        <span className="hw-exercises__count">{t('homework.exercisesSolved', { solved, total: exercises.length })}</span>
      </h3>

      <div className="hw-exercises">
        {exercises.map((e) => {
          const key = `hw-${e.id}`
          return (
            <div className="hw-exercise" key={e.id}>
              <PracticeBlock
                block={exerciseBlock(e)}
                answers={answers}
                checked={checked.has(key)}
                onAnswer={onAnswer}
                onCheck={() => onCheck(e)}
              />
              {failed.has(key) && <p className="hw-exercise__error">{t('homework.answerNotSaved')}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
