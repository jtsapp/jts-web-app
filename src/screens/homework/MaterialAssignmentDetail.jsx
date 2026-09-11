import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { startMaterialAssignment, materialAssignmentRenderUrl } from '../../api.js'
import { homeworkStateKey } from './homeworkFormat.js'
import { isInteractiveMaterial } from './materialAssignments.js'

/**
 * Задание с живого урока, открытое в «Домашней работе».
 *
 * Файлов ответа и кнопки «Отправить на проверку» здесь нет: у назначенного
 * материала свой цикл — ученик решает прямо в нём (интерактив шлёт ответы
 * сам через bridge-скрипт), а преподаватель ставит балл в админке. Экран
 * только открывает задание и показывает результат проверки.
 */
export default function MaterialAssignmentDetail({ card, token }) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'
  const a = card.assignment
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const stateKey = homeworkStateKey(card)
  const due = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const open = async () => {
    setError(null)
    // Обычный файл (PDF/видео/ссылка) открывается как есть. Интерактив идёт
    // через render-эндпоинт: там в страницу внедряется bridge-скрипт, а для
    // материала с проверкой сначала стартует сессия — иначе ответы ученика
    // не дойдут до преподавателя. Повторный старт возвращает ту же сессию.
    if (!isInteractiveMaterial(a)) {
      if (a.fileUrl) window.open(a.fileUrl, '_blank', 'noopener')
      return
    }
    setBusy(true)
    try {
      const session = a.isGraded ? await startMaterialAssignment(token, a.id) : null
      window.open(materialAssignmentRenderUrl(a.materialId, a.id, token, session?.id), '_blank', 'noopener')
    } catch {
      setError(t('homework.openFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hw-detail">
      <div className="hw-detail__head">
        <h2 className="hw-detail__title">{card.title}</h2>
        <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
      </div>
      <div className="hw-detail__meta">
        <span>{t('homework.lessonTask')}</span>
        {due && <span>{t('homework.due', { date: due })}</span>}
      </div>

      <section className="hw-block">
        <h3 className="hw-block__title">{t('homework.task')}</h3>
        <button type="button" className="hw-submit" disabled={busy} onClick={open}>
          {t('homework.open')}
        </button>
        {error && <p className="hw__error">{error}</p>}
      </section>

      {(card.grade != null || a.teacherFeedback) && (
        <section className="hw-block hw-block--review">
          <h3 className="hw-block__title">{t(card.grade != null ? 'homework.review' : 'homework.feedback')}</h3>
          {card.grade != null && (
            <div className="hw-grade">
              <span className="hw-grade__num">{card.grade}</span>
              <span className="hw-grade__label">{t('homework.grade')}</span>
            </div>
          )}
          {a.teacherFeedback && <p className="hw-comment">{a.teacherFeedback}</p>}
        </section>
      )}
    </div>
  )
}
