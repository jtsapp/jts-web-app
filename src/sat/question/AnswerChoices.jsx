import { KEYS } from './session.js'
import { NoCircleIcon, OkCircleIcon, StrikeIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

/**
 * Четыре варианта (Figma SAT 8, 26): буква в круге, текст, справа — зачеркнуть. Выбранный — фиолетовая рамка и
 * заливка; зачёркнутый — бледный текст с чертой, иконка тёмная (Bluebook «Option eliminator»).
 * verdict — после проверки в учебном режиме и в разборах: { answer, chosen } — верный зелёный, неверный выбор красный;
 * справа у них ✓ / ✗, остальные бледнеют; варианты больше не нажимаются. В экзамене и диагностике verdict не приходит вовсе.
 */
export default function AnswerChoices({ options, value, struck = [], onSelect, onStrike, verdict, disabled }) {
  const { t } = useI18n()
  const locked = disabled || !!verdict
  return (
    <div className="st-opts" role="radiogroup" aria-label={t('sat.run.choices')}>
      {options.map((html, i) => {
        const key = KEYS[i]
        const on = value === key
        const out = struck.includes(key)
        let state = ''
        if (verdict) {
          if (key === verdict.answer) state = 'is-right'
          else if (key === verdict.chosen) state = 'is-wrong'
          // остальные после проверки бледнеют: глаз сразу находит пару «ваш — верный» (Figma 24, 34)
          else state = 'is-rest'
        }
        return (
          // после проверки цвет говорит верность, а не выбор: фиолетовая рамка выбранного спорила бы с красной
          <div key={key} className={`st-opt ${on && !verdict ? 'is-on' : ''} ${out ? 'is-struck' : ''} ${state}`}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              className="st-opt__pick"
              disabled={locked}
              onClick={() => onSelect?.(key)}
            >
              <span className="st-opt__key">{key}</span>
              <span className="st-opt__text" dangerouslySetInnerHTML={{ __html: html }} />
            </button>
            {(state === 'is-right' || state === 'is-wrong') && (
              <span className="st-opt__mark" aria-hidden="true">{state === 'is-right' ? <OkCircleIcon size={20} /> : <NoCircleIcon size={20} />}</span>
            )}
            {!verdict && (
              <button
                type="button"
                className="st-opt__strike"
                aria-pressed={out}
                aria-label={t(out ? 'sat.run.unstrike' : 'sat.run.strike', { k: key })}
                title={t(out ? 'sat.run.unstrike' : 'sat.run.strike', { k: key })}
                disabled={disabled}
                onClick={() => onStrike?.(key)}
              >
                <StrikeIcon size={20} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
