import { useI18n } from '../../i18n.jsx'

const JUDGE = {
  tfng: [['TRUE', 'tfng.true'], ['FALSE', 'tfng.false'], ['NOT GIVEN', 'tfng.ng']],
  ynng: [['YES', 'ynng.yes'], ['NO', 'ynng.no'], ['NOT GIVEN', 'ynng.ng']],
}

/**
 * Вопрос диагностики: верно/неверно/не сказано, выбор варианта, заголовок абзаца или ответ словами. Ключей у экрана
 * нет — он только собирает ответ; пропуск «____» в формулировке становится полем ввода прямо в строке.
 */
export default function DiagQuestion({ n, item, value, onChange, headings }) {
  const { t } = useI18n()
  const p = (k) => t(`ieltsOb.p.diag.input.${k}`)
  let control
  if (JUDGE[item.type]) {
    control = (
      <div className="ih-dq__choices" role="radiogroup">
        {JUDGE[item.type].map(([v, k]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'is-on' : ''} onClick={() => onChange(v)}>{p(k)}</button>
        ))}
      </div>
    )
  } else if (item.type === 'matching_headings') {
    control = (
      <select className="ih-dq__select" value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label={item.prompt}>
        <option value="">{p('choose')}</option>
        {(headings || []).map((h) => <option key={h.key} value={h.key}>{h.key} · {h.text}</option>)}
      </select>
    )
  } else if (item.options?.length) {
    control = (
      <div className="ih-dq__options" role="radiogroup">
        {item.options.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={value === o.key} className={value === o.key ? 'is-on' : ''} onClick={() => onChange(o.key)} lang="en">
            <b>{o.key}</b> {o.text}
          </button>
        ))}
      </div>
    )
  }

  const gap = !control && String(item.prompt || '').includes('____')
  const input = (
    <input
      className="ih-gap"
      lang="en"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      inputMode={item.inputmode === 'numeric' ? 'numeric' : undefined}
      aria-label={`${p('answerLabel')} ${n}`}
      autoComplete="off"
      spellCheck={false}
    />
  )
  return (
    <div className="ih-dq" id={`ih-dq-${item.id}`}>
      <span className="ih-dq__n">{n}</span>
      <div className="ih-dq__body">
        {gap ? (
          <p lang="en">
            {item.prompt.split('____').map((part, i, all) => (
              <span key={i}>{part}{i < all.length - 1 && input}</span>
            ))}
          </p>
        ) : (
          <p lang="en">{item.prompt}</p>
        )}
        {control || (!gap && input)}
      </div>
    </div>
  )
}
