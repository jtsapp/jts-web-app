import { useEffect, useMemo, useRef, useState } from 'react'
import PracticeBlock from '../workspace/blocks/PracticeBlock.jsx'
import { gradeQuestion } from '../workspace/practiceGrading.js'
import { useI18n } from '../../i18n.jsx'
import { getCourseCatalogLesson, saveHomeworkAnswer } from '../../api.js'
import { batchFullyAnswered, exerciseBatches, exerciseBlock, isAnswered, isUnitTestType, loadAnswers, revokedEverything, saveAnswers, serverAnswers } from './homeworkExercises.js'
import { groupByContext } from './exerciseContext.js'
import { sanitizeHtml } from '../workspace/sanitizeHtml.js'
import { canAttach } from './homeworkFormat.js'

// Задания, которые преподаватель добавил с живого урока. Рисует их тот же
// PracticeBlock, что и на уроке, — здесь только состояние ответов и отправка.
// Проверка тоже уроковая (gradeQuestion): у пропуска сверяется список допустимых
// ответов, у открытого засчитывается любой непустой.
//
// Каждая отправка — своя секция: преподаватель выдаёт задания по ходу занятий, и
// сваленные в одну кучу они не дают понять, что задано сегодня, а что на прошлом уроке.
/** Шапка группы: запись и текст, к которым относятся её задания. */
function ExerciseContext({ context }) {
  return (
    <div className="hw-context">
      {context.audioUrl && (
        <audio className="hw-context__audio" controls preload="none" src={context.audioUrl} />
      )}
      {context.articleHtml && (
        <div
          className="hw-context__article"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(context.articleHtml) }}
        />
      )}
    </div>
  )
}

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
  // batch.key пакета, который сейчас уезжает по «Завершить тест» — кнопка
  // на время запроса недоступна, чтобы двойной клик не отправил тест дважды.
  const [submittingBatch, setSubmittingBatch] = useState(null)

  // Тип урока каталога — по нему отличаем юнит-тест (без ключей, одна сдача
  // на пакет) от обычного урока (покарточная проверка, как раньше). В самом
  // назначении ДЗ типа нет — только catalogLessonId, след происхождения,
  // поэтому спрашиваем каталог отдельно, один раз на урок за сессию экрана.
  const [lessonTypes, setLessonTypes] = useState({})
  const askedLessonIds = useRef(new Set())
  useEffect(() => {
    if (!token) return
    const ids = [...new Set(batches.map((b) => b.catalogLessonId).filter((id) => id != null))]
    const missing = ids.filter((id) => !askedLessonIds.current.has(id))
    if (!missing.length) return
    missing.forEach((id) => askedLessonIds.current.add(id))
    let alive = true
    Promise.all(missing.map((id) =>
      getCourseCatalogLesson(id, token).then((r) => [id, r?.type ?? null]).catch(() => [id, null])
    )).then((pairs) => {
      if (!alive) return
      setLessonTypes((prev) => {
        const next = { ...prev }
        pairs.forEach(([id, type]) => { next[id] = type })
        return next
      })
    })
    return () => { alive = false }
  }, [batches, token])

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

  /**
   * «Завершить тест» — сдача юнит-теста целиком, одной кнопкой на пакет.
   *
   * У обычного урока каждый вопрос сдаётся своим «Проверить»; у юнит-теста
   * эталоны скрыты до этого момента — значит и сохранить все ответы, и
   * открыть разбор нужно разом, а не по одному. Вердикт по-прежнему считает
   * сервер (AutoGrading) — correct в запросе тот же формальный аргумент, что
   * и у обычного «Проверить».
   */
  const onSubmitBatch = (batch) => {
    if (!editable || !token || hw?.id == null) return
    const toSave = batch.exercises.filter((e) => isAnswered(shown[e.question.id]))
    if (toSave.length !== batch.exercises.length) return
    setSubmittingBatch(batch.key)
    Promise.all(toSave.map((e) => {
      const answer = shown[e.question.id]
      const { correct } = gradeQuestion(e.question, answer)
      return saveHomeworkAnswer(hw.id, e.id, token, answer, correct)
        .then((saved) => ({ ok: true, id: e.id, saved }))
        .catch(() => ({ ok: false, id: e.id }))
    })).then((results) => {
      setSubmittingBatch(null)
      // Открываем разбор только у того, что реально сохранилось — упавшему
      // вопросу нечего показывать, и «Завершить тест» на него можно нажать
      // снова: он остался в числе неотвеченных для toSave.
      setChecked((prev) => {
        const next = new Set(prev)
        results.filter((r) => r.ok).forEach((r) => next.add(`hw-${r.id}`))
        return next
      })
      const failedIds = results.filter((r) => !r.ok).map((r) => r.id)
      if (failedIds.length) {
        setFailed((prev) => {
          const next = new Set(prev)
          failedIds.forEach((id) => next.add(`hw-${id}`))
          return next
        })
      }
      const lastSaved = [...results].reverse().find((r) => r.ok)?.saved
      if (lastSaved) onSaved?.(lastSaved)
    })
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
        const unitTest = isUnitTestType(lessonTypes[batch.catalogLessonId])
        // Сдано — выводим из уже сохранённых ответов, без своего флага: как
        // только на сервере есть studentAnswer у каждого вопроса пакета,
        // пересдавать нечего, и разбор открыт сам, даже после перезагрузки.
        const submitted = unitTest && batchFullyAnswered(batch)
        const answeredInBatch = batch.exercises.filter((e) => isAnswered(shown[e.question.id])).length
        const canFinishTest = editable && !submitted && answeredInBatch === total && total > 0
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
              {groupByContext(batch.exercises).map((group) => (
                <div className="hw-group" key={group.key}>
                  {/* Запись и текст — один раз на всю группу: восемь вопросов к
                      одной записи приехали каждый со своей копией снимка. */}
                  {group.context && <ExerciseContext context={group.context} />}
                  {group.exercises.map((e) => {
                    const key = `hw-${e.id}`
                    return (
                      <div className="hw-exercise" key={e.id}>
                        <PracticeBlock
                          block={exerciseBlock(e)}
                          answers={shown}
                          checked={submitted || checked.has(key)}
                          onAnswer={onAnswer}
                          onCheck={() => onCheck(e)}
                          readOnly={!editable || submitted}
                          // У юнит-теста «Проверить» нет вовсе — эталон открывает
                          // только «Завершить тест» на весь пакет разом.
                          allowCheck={!unitTest}
                          showAnswerKey={!unitTest || submitted}
                        />
                        {failed.has(key) && <p className="hw-exercise__error">{t('homework.answerNotSaved')}</p>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {unitTest && !submitted && (
              <button
                type="button"
                className="hw-submit hw-submit--batch"
                disabled={!canFinishTest || submittingBatch === batch.key}
                onClick={() => onSubmitBatch(batch)}
              >
                {t('homework.finishTest')}
              </button>
            )}
          </section>
        )
      })}
    </>
  )
}
