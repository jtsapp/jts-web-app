import { TariffLine } from './ui.jsx'
import { useMatchingT } from './texts.js'

// Шапка любого шага мастера (ТЗ §2.2): «← Назад», шаги с ✓ у пройденных, прогресс, строка тарифа (только чтение)
// и «Пусть менеджер подберёт». Шагов два у гарантии/IELTS/SAT — без «Формата».
export default function WizardHead({ steps, index, tariff, onBack, onManager, managerLabel }) {
  const { t } = useMatchingT()
  return (
    <div className="mt-stack">
      <div className="mt-row mt-between">
        <button type="button" className="mt-btn mt-btn--line mt-btn--sm" onClick={onBack}>
          {t('btn.back')}
        </button>
        <div className="mt-row">
          <TariffLine tariff={tariff} />
          <button type="button" className="mt-btn mt-btn--ghost mt-btn--sm" onClick={onManager}>
            {managerLabel || t('btn.managerPick')}
          </button>
        </div>
      </div>
      <div className="mt-steps" aria-label={t('step.' + steps[index])}>
        {steps.map((s, i) => (
          <span key={s} className="mt-row" style={{ gap: 8 }}>
            {i > 0 && <span className="mt-muted" aria-hidden="true">—</span>}
            <span className={`mt-step ${i < index ? 'mt-step--done' : i === index ? 'mt-step--on' : ''}`} aria-current={i === index ? 'step' : undefined}>
              <i>{i < index ? '✓' : i + 1}</i>
              {t('step.' + s)}
            </span>
          </span>
        ))}
      </div>
      <div className="mt-progress">
        <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
    </div>
  )
}
