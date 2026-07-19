import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

function FileScanIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M20 2a1 1 0 0 1 1 1v4h-2V4H5v16h14v-3h2v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h16Zm2 9v2h-9v-2h9Zm-2-4v2h-7V7h7Zm0 8v2h-7v-2h7Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Экран результата практики. variant: 'fail' | 'pass'.
export default function TutorPracticeResultPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  title = 'Практика Present Continious',
  variant = 'fail',
  percent,
  onAnalytics,
  onRetry,
  onToPlan,
}) {
  const t = useT()
  const fail = variant === 'fail'
  const pct = percent ?? (fail ? '12%' : '85%')
  const heading = fail ? t('pract.headingFail') : t('pract.headingPass')
  const subtitle = fail
    ? t('pract.subFail', { title })
    : t('pract.subPass', { title })
  const stats = [
    { v: '64%', label: t('pract.stat.grammar') },
    { v: '45%', label: t('pract.stat.accent') },
    { v: '67%', label: t('pract.stat.lesson') },
  ]
  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={title}
      layout="flow"
    >
      <div className="t-result2">
        <img
          className="t-result2__mascot"
          src={fail ? '/tutor/result-fail.png' : '/tutor/result-pass.png'}
          alt=""
        />

        <div className="t-result2__side">
          <div className={'t-result2__badge ' + (fail ? 'is-fail' : 'is-pass')}>
            {pct}
          </div>
          <h1 className="t-result2__title">{heading}</h1>
          <p className="t-result2__sub">{subtitle}</p>

          <div className="t-result2__stats">
            {stats.map((s) => (
              <div className="t-stat" key={s.label}>
                <b>{s.v}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {fail ? (
            <>
              <button
                className="t-pill t-pill--blue t-result2__btn"
                type="button"
                onClick={onAnalytics}
              >
                <FileScanIcon size={22} />
                {t('pract.analytics')}
              </button>
              <button
                className="t-pill t-pill--primary t-result2__btn t-result2__btn--tall"
                type="button"
                onClick={onRetry}
              >
                {t('pract.retry')}
              </button>
            </>
          ) : (
            <button
              className="t-pill t-pill--primary t-result2__btn t-result2__btn--tall"
              type="button"
              onClick={onToPlan}
              style={{ marginTop: 56 }}
            >
              {t('pract.toPlan')}
            </button>
          )}
        </div>
      </div>
    </TutorShell>
  )
}
