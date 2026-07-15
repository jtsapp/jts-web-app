// Shared inputs + results card for the IELTS objective sections
// (Listening / Reading). Ported from felix components/jts/IeltsSectionShared.

export function GapInput({ q, index, value, onChange, disabled }) {
  const [before, after] = q.prompt.split('___')
  return (
    <div className="ie-q">
      <div className="ie-q__line">
        <span className="ie-q__num">{index}.</span>
        {before}
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="ie-q__gap"
          placeholder="ответ"
        />
        {after}
      </div>
    </div>
  )
}

export function McqOptions({ q, index, value, onChange, disabled }) {
  return (
    <div className="ie-q">
      <div className="ie-q__prompt">
        <span className="ie-q__num">{index}.</span>
        {q.prompt}
      </div>
      <div className="ie-q__opts">
        {q.options.map((o) => (
          <label
            key={o.key}
            className={`ie-opt ${value === o.key ? 'ie-opt--on' : ''} ${
              disabled ? 'ie-opt--off' : ''
            }`}
          >
            <input
              type="radio"
              name={q.id}
              checked={value === o.key}
              disabled={disabled}
              onChange={() => onChange(o.key)}
            />
            <span className="ie-opt__key">{o.key}</span>
            <span>{o.text}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

const TFNG_KEYS = ['TRUE', 'FALSE', 'NOT GIVEN']

export function TfngOptions({ q, index, value, onChange, disabled }) {
  return (
    <div className="ie-q">
      <div className="ie-q__line">
        <span className="ie-q__num">{index}.</span>
        {q.statement}
      </div>
      <div className="ie-q__tfng">
        {TFNG_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onChange(k)}
            className={`ie-tfng ${value === k ? 'ie-tfng--on' : ''}`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}

export function bandColor(band) {
  if (band >= 7) return '#00a876'
  if (band >= 5.5) return '#e8892b'
  return '#d64545'
}

/**
 * @param {{ result: object, saved: boolean|null, questionLabel: (id:string)=>string,
 *           onRetry: () => void, onGo: (screen: string) => void }} props
 *   `saved` is null while the persist POST is in flight, then true/false.
 */
export function SectionResults({ result, saved, questionLabel, onRetry, onGo }) {
  return (
    <div className="ie-res">
      <div className="ie-res__top">
        <span className="ie-res__score">
          {result.correct} из {result.total}
        </span>
        <span className="ie-res__band" style={{ background: bandColor(result.band) }}>
          Band ≈ {result.band.toFixed(1)}
        </span>
        <span className="ie-res__note">
          оценочно — полный банд считается по тесту из 40 вопросов
        </span>
      </div>

      <div className="ie-res__list">
        {result.perQuestion.map((p, i) => (
          <div key={p.id} className={`ie-row ${p.correct ? 'ie-row--ok' : 'ie-row--bad'}`}>
            <span className={`ie-row__mark ${p.correct ? 'ie-row__mark--ok' : ''}`}>
              {p.correct ? '✓' : '✕'}
            </span>
            <div className="ie-row__body">
              <div className="ie-row__q">
                {i + 1}. {questionLabel(p.id)}
              </div>
              <div className="ie-row__a">
                Твой ответ: {p.userAnswer.trim() || '—'}
                {!p.correct && <b> · Правильно: {p.expected}</b>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ie-res__saved">
        {saved === null
          ? 'Сохраняю результат…'
          : saved
            ? 'Результат сохранён в твой прогресс.'
            : 'Результат не сохранён (офлайн-режим) — он останется на этом экране.'}
      </div>

      <div className="ie-cta">
        <button type="button" className="ie-btn" onClick={() => onGo?.('ielts-progress')}>
          Мой прогресс
        </button>
        <button type="button" className="ie-btn ie-btn--ghost" onClick={onRetry}>
          Пройти ещё раз
        </button>
      </div>
    </div>
  )
}
