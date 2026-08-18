import { useMemo, useState } from 'react'
import PracticeBlock from '../workspace/blocks/PracticeBlock.jsx'
import { gradeQuestion } from '../workspace/practiceGrading.js'
import { useI18n } from '../../i18n.jsx'
import { exerciseBlock, lessonExercises, loadAnswers, saveAnswers } from './homeworkExercises.js'

// Задания, которые преподаватель добавил с живого урока. Рисует их тот же
// PracticeBlock, что и на уроке, — здесь только состояние ответов и счётчик
// решённого. Проверка тоже уроковая (gradeQuestion): у пропуска сверяется
// список допустимых ответов, у открытого пропуска засчитывается любой непустой.
export default function HomeworkExercises({ hw }) {
  const { t } = useI18n()
  const exercises = useMemo(() => lessonExercises(hw), [hw])

  // Ответы поднимаются из хранилища один раз при монтировании: ученик мог
  // закрыть вкладку на середине. Смену работы отрабатывает не эффект, а key
  // на компоненте (см. HomeworkDetail) — так состояние пересоздаётся честно,
  // без лишнего кадра с чужими ответами.
  const [answers, setAnswers] = useState(() => loadAnswers(hw?.id))
  const [checked, setChecked] = useState(() => new Set())

  const onAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value }
      if (hw?.id != null) saveAnswers(hw.id, next)
      return next
    })
  }

  const onCheck = (key) => setChecked((prev) => new Set(prev).add(key))

  if (!exercises.length) return null

  // gradeQuestion отдаёт {correct}, а не булево: объект истинен всегда, и без
  // .correct счётчик показывал бы «решено всё» с первого кадра.
  const solved = exercises.filter((e) => gradeQuestion(e.question, answers[e.question.id]).correct).length

  return (
    <section className="hw-block">
      <h3 className="hw-block__title">
        {t('homework.exercises')}
        <span className="hw-exercises__count">{t('homework.exercisesSolved', { solved, total: exercises.length })}</span>
      </h3>

      <div className="hw-exercises">
        {exercises.map((e) => {
          // Ключ проверки — сам вопрос: у каждого упражнения он ровно один,
          // и «Проверить» относится только к нему.
          const key = `hw-${e.id}`
          return (
            <PracticeBlock
              key={e.id}
              block={exerciseBlock(e)}
              answers={answers}
              checked={checked.has(key)}
              onAnswer={onAnswer}
              onCheck={() => onCheck(key)}
            />
          )
        })}
      </div>
    </section>
  )
}
