import { useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { requestTrialLesson } from '../../api.js'

/**
 * Карточка «Скоро с вами свяжется менеджер» — стоит ВМЕСТО расписания у того,
 * кому преподаватель ещё не назначен (LessonSchedule решает это по ответу
 * бэкенда, а не по пустому календарю: у ученика с преподавателем календарь
 * тоже бывает пустым, и обещать ему звонок менеджера нельзя).
 *
 * Заявка не создаёт урок и не занимает окно преподавателя — учёта их свободного
 * времени в системе нет. Она помечает человека в очереди менеджера как «сам
 * попросил урок», поэтому тексты обещают ровно звонок и ничего больше.
 *
 * Состояние приходит сверху и обновляется ответом POST (он отдаёт тот же DTO,
 * что и GET), — своей копии «заявка отправлена» карточка не держит.
 */
export default function TrialRequestCard({ token, state, onRequested }) {
  const { t } = useI18n()
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  // Гард ставим ДО первого await и в ref, а не в state: между двумя кликами
  // одного тика перерисовки с disabled может ещё не быть, и второй клик прошёл
  // бы в сеть. Бэкенд идемпотентен, но лишний запрос — всё равно запрос.
  const sendingRef = useRef(false)

  const submit = async () => {
    if (sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setFailed(false)
    try {
      onRequested(await requestTrialLesson(token))
    } catch {
      setFailed(true)
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const done = state.requested
  // Менеджер уже взял человека себе — говорим об этом: обещание «свяжемся»
  // перестало висеть в пустоте, и ждущему полезно это знать.
  const doneText = state.managerAssigned ? 'trial.doneManager' : 'trial.doneText'

  return (
    <div className="sch-trial">
      {/* Текст меняется прямо под курсором после нажатия — озвучиваем смену
          состояния тем, кто кнопку не видит. */}
      <div className="sch-trial__body" aria-live="polite">
        {/* Заголовок остаётся заголовком: карточка стоит вместо секции
            расписания с её h2, и без него у секции нет названия вовсе. */}
        <h2 className={`sch-trial__title ${done ? 'sch-trial__title--done' : ''}`}>
          {t(done ? 'trial.doneTitle' : 'trial.title')}
        </h2>
        <span className="sch-trial__text">{t(done ? doneText : 'trial.text')}</span>
      </div>

      {/* Заявка уже оставлена — нажимать нечего: повторная ничего не меняет. */}
      {!done && (
        <button type="button" className="sch-trial__cta" disabled={sending} onClick={submit}>
          {t(sending ? 'trial.sending' : 'trial.cta')}
        </button>
      )}
      {/* role="alert" на самом абзаце, а не на области выше: живая область
          объявляет изменения ВНУТРИ себя, а при неудаче внутри неё не меняется
          ни символа — абзац появляется её соседом, и диктор промолчал бы. Так же
          сделано у соседей (TutorCallReportPage, GapQuestion, SituativkaOverlay). */}
      {failed && <p className="sch-trial__error" role="alert">{t('trial.failed')}</p>}
    </div>
  )
}
