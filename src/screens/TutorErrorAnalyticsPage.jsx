import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

const BLOCKS = [
  {
    h: '1. Грамматика — времена',
    p: 'Несколько раз проскакивало смешение Past Simple и Present Perfect. Например, вместо «I have been to London last year» правильно «I went to London last year» — если есть конкретное время в прошлом (last year), используем Past Simple, а Present Perfect оставляем для опыта без привязки к дате («I have been to London»).',
  },
  {
    h: '2. Лексика — не то слово',
    p: 'В моменте, где ты говорил про работу, проскочило «I\'m boring» вместо «I\'m bored». Это классическая ошибка — «-ing» описывает то, что вызывает скуку (the movie is boring), а «-ed» — твоё состояние (I\'m bored). Похожая история с «interested/interesting», «excited/exciting» — следи за этой парой.',
  },
  {
    h: '3. Естественность фраз',
    p: 'Фраза «I very like it» — грамматически цепляет слух носителя, потому что «very» не ставится перед глаголом. Правильно: «I really like it» или «I like it a lot». В целом старайся заменять дословный перевод с русского на устойчивые английские конструкции — они звучат естественнее, даже если грамматика формально не нарушена.',
  },
]

export default function TutorErrorAnalyticsPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onToPlan,
  onRetry,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={t('erran.title')}
      layout="flow"
    >
      <div className="t-erran">
        <div className="t-erran__card">
          <img src={avatar} alt="" />
          <div className="t-erran__cardtext">
            <span>{t('erran.by')}</span>
            <b>{name}</b>
          </div>
        </div>

        <div className="t-erran__blocks">
          {BLOCKS.map((b) => (
            <div className="t-erran__block" key={b.h}>
              <h3>{b.h}</h3>
              <p>{b.p}</p>
            </div>
          ))}
        </div>

        <div className="t-erran__btns">
          <button className="t-pill t-pill--blue t-erran__btn" type="button" onClick={onToPlan}>
            {t('erran.toPlan')}
          </button>
          <button className="t-pill t-pill--primary t-erran__btn" type="button" onClick={onRetry}>
            {t('erran.retry')}
          </button>
        </div>
      </div>
    </TutorShell>
  )
}
