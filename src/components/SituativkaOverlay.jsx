import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { completeSituativka } from '../api.js'

/**
 * Просмотр ситуативки внутри приложения вместо прежней внешней ссылки
 * (`<a href={videoUrl} target="_blank">`). Причина не в удобстве: у внешней
 * вкладки нет события «прошёл», поэтому бэкендовый POST
 * /mobile/situativki/{id}/complete никогда не вызывался, а именно в нём сидит
 * проверка общей квоты ситуативок — то есть лимит из админки не работал вовсе.
 *
 * Засчитываем по явной кнопке, а не по onEnded: видео может не проиграться
 * (кодек/автоплей/сеть), и тогда студент остался бы без возможности отметить
 * прохождение. Окончание видео лишь подсвечивает кнопку.
 */
export default function SituativkaOverlay({ situativka: s, token, onClose, onCompleted }) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [watched, setWatched] = useState(false)
  // 'quota' — 403 от бэкенда (лимит исчерпан), 'error' — всё остальное.
  const [failure, setFailure] = useState(null)
  const closeRef = useRef(null)

  // Esc закрывает — оверлей перекрывает всю страницу, без клавиатуры из него
  // иначе не выйти.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const markDone = async () => {
    if (saving || s.completed) return
    setSaving(true)
    setFailure(null)
    try {
      await completeSituativka(token, s.id)
      onCompleted?.(s.id)
      onClose?.()
    } catch (e) {
      setFailure(e?.status === 403 ? 'quota' : 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sv-over" role="dialog" aria-modal="true" aria-label={s.title}>
      <div className="sv-card">
        <div className="sv-card__head">
          <div className="sv-card__title">{s.title}</div>
          <button ref={closeRef} type="button" className="sv-card__close" onClick={onClose} aria-label={t('common.back')}>
            ✕
          </button>
        </div>

        {s.videoUrl ? (
          <video
            className="sv-card__video"
            src={s.videoUrl}
            poster={s.coverUrl || undefined}
            controls
            playsInline
            onEnded={() => setWatched(true)}
          />
        ) : (
          <div className="sv-card__novideo">{t('situativka.noVideo')}</div>
        )}

        {failure === 'quota' && (
          <div className="sv-card__note" role="status">🔒 {t('situativka.quotaReached')}</div>
        )}
        {failure === 'error' && (
          <div className="sv-card__note" role="status">{t('situativka.saveError')}</div>
        )}

        <div className="sv-card__actions">
          {s.completed ? (
            <div className="sv-card__done">✓ {t('situativka.alreadyDone')}</div>
          ) : (
            <button
              type="button"
              className={`sv-card__btn${watched ? ' sv-card__btn--ready' : ''}`}
              onClick={markDone}
              disabled={saving}
            >
              {saving ? t('situativka.saving') : t('situativka.markDone')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
