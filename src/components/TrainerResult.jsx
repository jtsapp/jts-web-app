import { useI18n } from '../i18n.jsx'

// Итоговый экран тренажёров Практики (аудирование, словарь): маскот win/lose,
// процент, счётчики неверных/верных ответов и кнопки «ещё раз» / «на главную».
// ≥50% → «победа» (зелёный %, маскот-победитель); ниже → «проигрыш».
// Стили lt-res-* живут в listening.css и берут палитру с контейнера .lt —
// рендерить только внутри <div className="lt">.
export default function TrainerResult({ correct, wrong, onAgain, onHome }) {
  const { t } = useI18n()
  const answered = correct + wrong
  const pct = answered ? Math.round((correct / answered) * 100) : 0
  const good = pct >= 50
  return (
    <div className={`lt-res ${good ? 'lt-res--good' : 'lt-res--bad'}`}>
      <div className="lt-res__hero">
        <img src={good ? '/practice/listening/win.png' : '/practice/listening/lose.png'} alt="" />
      </div>
      <div className="lt-res__info">
        <div className="lt-res__pct">{pct}%</div>
        <h2 className="lt-res__title">{good ? t('listening.resGood') : t('listening.resBad')}</h2>
        <div className="lt-res__stats">
          <div className="lt-res__stat">
            <span className="lt-res__num">
              <span className="lt-res__badge lt-res__badge--bad">☹</span>
              {wrong}
            </span>
            <span className="lt-res__label">{t('listening.wrongCount')}</span>
          </div>
          <div className="lt-res__stat">
            <span className="lt-res__num">
              <span className="lt-res__badge lt-res__badge--good">✓</span>
              {correct}
            </span>
            <span className="lt-res__label">{t('listening.correctCount')}</span>
          </div>
        </div>
        <button type="button" className="lt-primary lt-res__btn" onClick={onAgain}>
          {t('listening.again')}
        </button>
        <button type="button" className="lt-ghost" onClick={onHome}>{t('listening.home')}</button>
      </div>
    </div>
  )
}
