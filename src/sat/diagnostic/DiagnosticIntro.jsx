import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon, EventIcon, FlagIcon, InfoIcon, MenuBookIcon } from '../../ielts/icons.jsx'
import { GridIcon, InsightsIcon, SigmaIcon } from '../icons.jsx'

/**
 * Старт диагностики (Figma SAT 7): что будет, сколько вопросов по секциям, что получите в конце, и честно — это не
 * балл SAT. Строку макета «Уже сдавали SAT? Результат добавите в «Пробники»…» не рисуем: экран 35 «Добавить
 * результат» убран по решению школы (PLAN §3, решение B), и ссылаться на него нечестно.
 * last — дата прошлой сдачи: повторная диагностика прежнюю не стирает (прототип diag.retakeNote).
 */
export default function DiagnosticIntro({ examDate, last, resuming, busy, error, onStart }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (iso, opts) => new Intl.DateTimeFormat(loc, { timeZone: 'UTC', ...opts }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
  return (
    <main className="st-dx">
      <span className="st-dx__icon"><InsightsIcon size={28} /></span>
      <h1>{t('sat.dx.title')}</h1>
      <p className="st-dx__lead">{t('sat.dx.lead')}</p>
      <div className="st-dx__sections">
        <div className="st-card st-dx__sec">
          <span className="st-dx__secicon is-rw"><MenuBookIcon size={22} /></span>
          <div>
            <b>Reading and Writing</b>
            <span>{t('sat.dx.rwSub')}</span>
          </div>
          <strong className="is-rw">12</strong>
        </div>
        <div className="st-card st-dx__sec">
          <span className="st-dx__secicon is-math"><SigmaIcon size={22} /></span>
          <div>
            <b>Math</b>
            <span>{t('sat.dx.mathSub')}</span>
          </div>
          <strong className="is-math">12</strong>
        </div>
      </div>
      <div className="st-card st-dx__gets">
        <h2>{t('sat.dx.getTitle')}</h2>
        <div className="st-dx__getgrid">
          <div>
            <span className="st-dx__geticon"><GridIcon size={18} /></span>
            <b>{t('sat.dx.get1')}</b>
            <p>{t('sat.dx.get1Text')}</p>
          </div>
          <div>
            <span className="st-dx__geticon"><FlagIcon size={18} /></span>
            <b>{t('sat.dx.get2')}</b>
            <p>{t('sat.dx.get2Text')}</p>
          </div>
          <div>
            <span className="st-dx__geticon"><EventIcon size={18} /></span>
            <b>{examDate ? t('sat.dx.get3', { date: fmt(examDate, { day: 'numeric', month: 'long' }) }) : t('sat.dx.get3NoDate')}</b>
            <p>{t('sat.dx.get3Text')}</p>
          </div>
        </div>
      </div>
      <p className="st-dx__note"><InfoIcon size={20} />{t('sat.dx.note')}</p>
      {error && <p className="st-error" role="alert">{error}</p>}
      <div className="st-dx__cta">
        <button type="button" className="ih-cta st-dx__start" disabled={busy} onClick={onStart}>
          {t(resuming ? 'sat.dx.continue' : last ? 'sat.dx.retake' : 'sat.dx.start')}<ArrowForwardIcon size={20} />
        </button>
        {/* Нет в Figma: строка о прошлой сдаче — адаптация прототипа diagnostic.js (diag.alreadyTaken / retakeNote) */}
        {last && !resuming && <span className="st-muted">{t('sat.dx.lastTaken', { date: fmt(last, { day: 'numeric', month: 'long' }) })}</span>}
      </div>
    </main>
  )
}
