import { useI18n } from '../../../i18n.jsx'
import { choiceItems } from '../../../practice/reading/engine.js'
import { loc } from '../../../practice/reading/loc.js'

// Вопрос с вариантами: before / mc / finish / vocab / tf / tfng. Все шесть
// типов одинаковы механически, различаются только подписи и раскладка кнопок
// (у true/false вариантов два-три и они в строку).
export default function ChoiceTask({ ex, st, onPick, res }) {
  const { t, lang } = useI18n()
  const labels = { yes: t('reading.true'), no: t('reading.false'), notGiven: t('reading.notGiven') }
  const items = choiceItems(ex, labels)
  const row = ex.type === 'tf' || ex.type === 'tfng'
  const rows = res ? res.detail.rows : null

  return (
    <>
      {items.map((it, k) => {
        const r = rows ? rows[k] : null
        return (
          <div className="rd-q" key={k}>
            <p className="rd-q__text" lang="en">{it.q}{ex.type === 'finish' ? ' …' : ''}</p>
            <div className={`rd-opts${row ? ' rd-opts--row' : ''}`} role="radiogroup" aria-label={it.q}>
              {it.o.map((o, j) => {
                const cls = ['rd-opt']
                if (rows) {
                  if (j === it.a) cls.push('is-correct')
                  else if (st.sel[k] === j) cls.push('is-wrong')
                }
                return (
                  <button
                    key={j}
                    type="button"
                    className={cls.join(' ')}
                    role="radio"
                    aria-checked={st.sel[k] === j}
                    disabled={!!res}
                    lang={row ? undefined : 'en'}
                    onClick={() => onPick(k, j)}
                  >
                    {o}
                  </button>
                )
              })}
            </div>
            {r && (
              <div className={`rd-fb ${r.ok ? 'is-ok' : 'is-bad'}`} aria-live="polite">
                {r.ok ? `✅ ${t('reading.correct')} ` : `❌ ${t('reading.wrong')} `}
                {loc(it.e, lang)}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
