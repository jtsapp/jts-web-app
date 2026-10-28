'use client'

import { DAYPARTS, DAYS, DIRECTIONS, LANGUAGES, LEVELS, toggled, wishesReady } from './groupLogic.js'
import { useGroupT } from './texts.js'

// Пожелания ученика: направление, уровень, язык, дни и время суток (ТЗ кабинетов, 14). Уровень подставляет вызывающий по
// результату теста — ученик может взять соседний.
export default function WishesForm({ wishes, onChange, onSubmit, busy }) {
  const { t } = useGroupT()
  const set = (patch) => onChange({ ...wishes, ...patch })
  const ready = wishesReady(wishes)

  return (
    <form
      className="mt-card mt-stack"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready && !busy) onSubmit()
      }}
      data-testid="wishes-form"
    >
      <h2 className="mt-h2">{t('wish.title')}</h2>
      <div className="gp-grid">
        <label className="gp-field">
          <span className="gp-field__label">{t('wish.direction')}</span>
          <select className="mt-select" value={wishes.direction} onChange={(e) => set({ direction: e.target.value })}>
            {DIRECTIONS.map((value) => (
              <option key={value} value={value}>{t('direction.' + value)}</option>
            ))}
          </select>
        </label>
        <label className="gp-field">
          <span className="gp-field__label">{t('wish.level')}</span>
          <select className="mt-select" value={wishes.level} onChange={(e) => set({ level: e.target.value })}>
            {LEVELS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <span className="gp-field__hint">{t('wish.levelHint')}</span>
        </label>
        <label className="gp-field">
          <span className="gp-field__label">{t('wish.language')}</span>
          <select className="mt-select" value={wishes.language} onChange={(e) => set({ language: e.target.value })}>
            {LANGUAGES.map((value) => (
              <option key={value} value={value}>{t('language.' + value)}</option>
            ))}
          </select>
        </label>
      </div>

      <Toggles label={t('wish.days')} values={DAYS} picked={wishes.days} text={(v) => t('day.' + v)} onToggle={(v) => set({ days: toggled(wishes.days, v, DAYS) })} />
      <Toggles label={t('wish.dayparts')} values={DAYPARTS} picked={wishes.dayparts} text={(v) => t('daypart.' + v)} onToggle={(v) => set({ dayparts: toggled(wishes.dayparts, v, DAYPARTS) })} />

      {!ready && <p className="gp-field__hint">{t('wish.need')}</p>}
      <div>
        <button type="submit" className="mt-btn" disabled={!ready || busy}>{t('wish.find')}</button>
      </div>
    </form>
  )
}

function Toggles({ label, values, picked, text, onToggle }) {
  return (
    <div className="gp-field" role="group" aria-label={label}>
      <span className="gp-field__label">{label}</span>
      <div className="gp-toggles">
        {values.map((value) => (
          <button key={value} type="button" className="gp-toggle" aria-pressed={picked.includes(value)} onClick={() => onToggle(value)}>
            {text(value)}
          </button>
        ))}
      </div>
    </div>
  )
}
