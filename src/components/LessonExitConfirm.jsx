import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n.jsx'

// Подтверждение выхода из незаконченного урока (Figma, «Выход из урока»).
//
// Один диалог на все уроки: «Обучение» (KingdomInteriorPage), онлайн-урок
// (LessonWorkspacePage) и живой урок (LiveLessonPage). Раньше та же карточка
// была ещё раз выписана разметкой внутри KingdomInteriorPage — при первой же
// правке макета экраны разъезжались молча.
//
// Портрета-арта в макете больше нет: заголовок и подпись слева, крестик
// справа в углу карточки, кнопки в ряд под разделителем. Деструктивное
// действие («Выйти из урока») стоит первым, как нарисовано, поэтому фокус при
// открытии уходит на «Отменить» — чтобы Enter по инерции не выбрасывал из
// урока.
export default function LessonExitConfirm({ onStay, onLeave }) {
  const { t } = useI18n()
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Esc закрывает диалог: он модальный, и клавиатурному пользователю иначе
  // остаётся только таб по кругу.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onStay?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onStay])

  return (
    <div className="lx-over" onClick={onStay}>
      <div
        className="lx-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lx-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lx-head">
          <div className="lx-texts">
            <h2 className="lx-title" id="lx-title">{t('lesson.exitAsk')}</h2>
            <p className="lx-sub">{t('lesson.exitAskSub')}</p>
          </div>
          <button type="button" className="lx-close" aria-label={t('common.close')} onClick={onStay}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4 14 14M14 4 4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="lx-acts">
          <button type="button" className="lx-leave" onClick={onLeave}>
            {t('lesson.exitLeave')}
          </button>
          <button type="button" className="lx-continue" ref={cancelRef} onClick={onStay}>
            {t('lesson.exitStay')}
          </button>
        </div>
      </div>
    </div>
  )
}
