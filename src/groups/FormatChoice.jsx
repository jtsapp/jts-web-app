'use client'

import { useGroupT } from './texts.js'
import { useGroupState } from './useGroupState.js'

// Выбор формата в «Мой учитель» (ТЗ кабинетов, 14): «Индивидуально с учителем» ведёт в подбор учителя, «В группе до 6
// человек» — в «Выбрать группу». Выбор можно менять до записи; записавшемуся показывается статус группы. Без ручек групп
// на стенде блок молчит, и «Мой учитель» остаётся прежним.
export default function FormatChoice({ token, onIndividual, onGroup }) {
  const { t } = useGroupT()
  const snap = useGroupState(token)
  if (snap.status !== 'ready') return null
  const enrollment = snap.state?.enrollment

  if (enrollment) {
    return (
      <div className="mt-banner mt-banner--brand" data-testid="format-in-group">
        <p>{t('fmt.inGroup', { name: enrollment.group.name })}</p>
        <button type="button" className="mt-btn mt-btn--sm" onClick={onGroup}>{t('fmt.open')}</button>
      </div>
    )
  }

  return (
    <section className="mt-card mt-stack" data-testid="format-choice">
      <h2 className="mt-h2">{t('fmt.title')}</h2>
      <p className="gp-field__hint">{t('fmt.sub')}</p>
      <div className="gp-format">
        <button type="button" className="gp-format__opt" onClick={onIndividual} data-testid="format-individual">
          <b>{t('fmt.individual')}</b>
          <span>{t('fmt.individual.d')}</span>
        </button>
        <button type="button" className="gp-format__opt" onClick={onGroup} data-testid="format-group">
          <b>{t('fmt.group')}</b>
          <span>{t('fmt.group.d')}</span>
        </button>
      </div>
    </section>
  )
}
