import { useI18n } from '../../i18n.jsx'

// Переход между шагами урока кнопками «Назад» / «Далее».
//
// До этого сменить шаг можно было только кликом по маршруту в левой колонке:
// маршрут показывает, где ты, но вести по уроку он не должен — ученик читает
// центр, а рука уходит за край экрана. В исходном файле курса ровно эта пара
// кнопок и счётчик «Stage 3 of 7» стоят под заданием, и урок проходится ими.
//
// Состояния своего не держит: активный шаг и список приходят сверху, наружу
// уходит только id выбранного — тот же контракт, что у LessonRoute.
// «Далее» не ждёт, пока шаг решён. Такое условие тут стояло — и мешало: ученик
// вправе посмотреть дальше, вернуться, пройти шаги не по порядку, а на задании,
// которое почему-либо не отвечается, запертая кнопка не оставляла выхода вовсе.
// Кнопка гаснет только на последнем шаге — вести дальше действительно некуда.
export default function StepNav({ steps, activeStepId, onSelect, onFinish }) {
  const { t } = useI18n()
  const list = steps || []
  const index = list.findIndex((step) => step.id === activeStepId)

  // Один шаг вести некуда, и до первого выбора вести неоткуда: кнопки, которые
  // ничего не делают, на экране не нужны (§0.6 спеки).
  if (list.length < 2 || index < 0) return null

  const hasPrev = index > 0
  const hasNext = index < list.length - 1

  return (
    <nav className="lw-stepnav" aria-label={t('lesson.ws.stepPosition', { current: index + 1, total: list.length })}>
      <button
        type="button"
        className="lw-stepnav__btn lw-stepnav__btn--ghost"
        disabled={!hasPrev}
        onClick={() => onSelect(list[index - 1].id)}
      >
        {t('lesson.ws.prevStep')}
      </button>

      <span className="lw-stepnav__pos">
        {t('lesson.ws.stepPosition', { current: index + 1, total: list.length })}
      </span>

      {/* На последнем шаге вести дальше некуда, и серая «Далее» там читалась как
          поломка: ученик дошёл до конца материала и упёрся в мёртвую кнопку.
          Меняем на «Завершить» — она честно говорит, что материал кончился, и
          выводит из него. Сам урок закрывает преподаватель, это не про него. */}
      {hasNext ? (
        <button
          type="button"
          className="lw-stepnav__btn lw-stepnav__btn--primary"
          onClick={() => onSelect(list[index + 1].id)}
        >
          {t('lesson.ws.nextStep')}
        </button>
      ) : (
        <button
          type="button"
          className="lw-stepnav__btn lw-stepnav__btn--primary"
          disabled={!onFinish}
          onClick={() => onFinish?.()}
        >
          {t('lesson.finish')}
        </button>
      )}
    </nav>
  )
}
