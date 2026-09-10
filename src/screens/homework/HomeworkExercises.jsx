import { useEffect, useMemo, useState } from 'react'
import PracticeBlock from '../workspace/blocks/PracticeBlock.jsx'
import { gradeQuestion } from '../workspace/practiceGrading.js'
import { useI18n } from '../../i18n.jsx'
import { saveHomeworkAnswer } from '../../api.js'
import { exerciseBatches, exerciseBlock, isAnswered, loadAnswers, revokedEverything, saveAnswers, serverAnswers } from './homeworkExercises.js'
import { canAttach } from './homeworkFormat.js'

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
  // Работа, которую ученик уже не правит (сдана, взята в проверку, проверена),
  // закрыта целиком — не только для файлов. Раньше секция заданий оставалась
  // живой в любом статусе: ученик переписывал ответы, пока преподаватель
  // работу оценивал, и оценка вставала под другим содержимым. Сервер тут не
  // защищает вовсе — у эндпоинта ответа нет проверки статуса, — поэтому замок
  // держит клиент, тем же правилом, что и загрузку файлов.
  const editable = canAttach(hw)

  // Что уже сохранено на сервере, важнее черновика: ученик мог отвечать с другого
  // устройства, а преподаватель — сбросить ответ через меню упражнения.
  // Смену работы отрабатывает key на компоненте (см. HomeworkDetail), поэтому
  // начальное состояние поднимается один раз и без эффекта.
  const [answers, setAnswers] = useState(() => ({ ...loadAnswers(hw?.id), ...serverAnswers(hw) }))
  const [checked, setChecked] = useState(() => new Set())
  const [failed, setFailed] = useState(() => new Set())

  // На закрытой работе показываем ТОЛЬКО то, что дошло до сервера.
  //
  // Черновик из localStorage мог не уехать вовсе — отправка упала, ученик был
  // офлайн, — а в заблокированном поле он неотличим от сданного ответа: ученик
  // видит заполненное поле и уверен, что преподаватель его ответ получил, а
  // тот видит «ученик ещё не отвечал». Пока работу правят, разницы нет, и
  // черновик — то самое, что ученик набрал; как только править нельзя, экран
  // обязан показывать ровно то, что видит преподаватель.
  const shown = useMemo(() => (editable ? answers : serverAnswers(hw)), [editable, answers, hw])

  // Черновик закрытой работы не просто бесполезен — он всплывёт при следующем
  // открытии и снова притворится сданным ответом. Стираем его пустой записью:
  // отдельной чистилки в homeworkExercises.js нет, а saveAnswers уже переживает
  // приватный режим и переполненное хранилище. Порядок безопасен: HomeworkPage
  // дочитывает недосланное (pendingAnswers) синхронно, до смены статуса.
  useEffect(() => {
    if (!editable && hw?.id != null) saveAnswers(hw.id, {})
  }, [editable, hw?.id])

  // Сколько заданий отвечено прямо сейчас — вместе с черновиком, который ещё не
  // уехал на сервер. По этому числу оживает «Отправить на проверку»: решённая
  // работа должна сдаваться, даже если ученик не жал «Проверить» у каждого
  // задания. Отдаём с id работы, иначе при переключении между работами счёт
  // на мгновение относился бы к предыдущей.
  const answeredNow = useMemo(
    () => batches.reduce(
      (sum, batch) => sum + batch.exercises.filter((e) => isAnswered(shown[e.question.id])).length,
      0,
    ),
    [batches, shown],
  )
  useEffect(() => {
    onAnswered?.({ homeworkId: hw?.id, answered: answeredNow })
  }, [onAnswered, hw?.id, answeredNow])

  const onAnswer = (questionId, value) => {
    if (!editable) return
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
    if (!editable) return
    const key = `hw-${exercise.id}`
    setChecked((prev) => new Set(prev).add(key))
    if (!token || hw?.id == null) return

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
        setFailed((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
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

  const solvedIn = (list) => list.filter((e) => gradeQuestion(e.question, shown[e.question.id]).correct).length
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
              {batch.exercises.map((e) => {
                const key = `hw-${e.id}`
                return (
                  <div className="hw-exercise" key={e.id}>
                    <PracticeBlock
                      block={exerciseBlock(e)}
                      answers={shown}
                      checked={checked.has(key)}
                      onAnswer={onAnswer}
                      onCheck={() => onCheck(e)}
                      readOnly={!editable}
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
