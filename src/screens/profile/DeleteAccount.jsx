import { isStudentSectionHidden } from '../../config.js'
import { useI18n } from '../../i18n.jsx'
import { MaskIcon } from './MaskIcon.jsx'

// Что исчезнет вместе с аккаунтом — строки кадра «Удаление аккаунта» (Figma «Mobile», 7419:13214). Токены и призы
// на проде пока скрыты (isStudentSectionHidden): обещать удалить раздел, которого ученик не видел, незачем.
function deletedItems() {
  return [
    { key: 'profile', ico: 'person', title: 'profile.delete.itemProfile' },
    { key: 'lessons', ico: 'school', title: 'profile.delete.itemLessons', sub: 'profile.delete.itemLessonsSub' },
    { key: 'vocab', ico: 'menu_book', title: 'profile.delete.itemVocab', sub: 'profile.delete.itemVocabSub' },
    ...(isStudentSectionHidden('tokens') ? [] : [{ key: 'tokens', ico: 'emoji_events', title: 'profile.delete.itemTokens' }]),
  ]
}

/**
 * Содержимое подтверждения удаления: предупреждение, «Будет удалено» и две кнопки. Одно на все ширины — на телефоне
 * это экран профиля, на компьютере то же самое окном (своего кадра у десктопа нет). Красная кнопка — единственная,
 * что шлёт запрос; «Оставить аккаунт» вторым действием, как в макете.
 */
export default function DeleteAccount({ deletion, onKeep }) {
  const { t } = useI18n()
  const { busy, error, run } = deletion
  return (
    <div className="pfd">
      <section className="pfd-warn">
        <span className="pfd-warn__plate">
          <MaskIcon name="delete" />
        </span>
        <h2 className="pfd-warn__title">{t('profile.delete.heading')}</h2>
        <p className="pfd-warn__text">{t('profile.delete.text')}</p>
      </section>
      <section className="pfd-list">
        <h3 className="pfd-list__title">{t('profile.delete.listTitle')}</h3>
        {deletedItems().map((it) => (
          <div key={it.key} className={`pfd-row pfd-row--${it.key}`}>
            <span className="pfd-row__plate">
              <MaskIcon name={it.ico} />
            </span>
            <span className="pfd-row__txt">
              <b>{t(it.title)}</b>
              {it.sub && <span>{t(it.sub)}</span>}
            </span>
          </div>
        ))}
      </section>
      {error && (
        <p className="pfd-err" role="alert">
          {t(error)}
        </p>
      )}
      <div className="pfd-acts">
        <button type="button" className="pfd-del" disabled={busy} aria-busy={busy || undefined} onClick={run}>
          {busy ? t('profile.delete.busy') : t('profile.delete.confirm')}
        </button>
        <button type="button" className="pfd-keep" disabled={busy} onClick={onKeep}>
          {t('profile.delete.keep')}
        </button>
      </div>
    </div>
  )
}
