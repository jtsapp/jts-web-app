import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, FlagIcon, InfoIcon, MenuBookIcon } from '../../ielts/icons.jsx'
import { RouteIcon, SigmaIcon } from '../icons.jsx'
import { bands } from '../model/plan.js'
import TimingBanner from '../plan/TimingBanner.jsx'
import { domainShares } from '../model/profile.js'
import { TAXONOMY, domainName, domainSection } from '../names.js'

const R = 44
const C = 2 * Math.PI * R

/** Кольцо доли верных (Figma 9, «42 % верно»). */
function Ring({ pct }) {
  return (
    <svg className="st-rep__ring" viewBox="0 0 104 104" aria-hidden="true">
      <circle cx="52" cy="52" r={R} fill="none" stroke="#ededf2" strokeWidth="10" />
      {pct > 0 && (
        <circle cx="52" cy="52" r={R} fill="none" stroke="var(--ih-violet)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 52 52)" />
      )}
    </svg>
  )
}

/** Три точки домена: сколько из трёх верно (Figma 9). */
function Dots({ correct, total }) {
  return (
    <span className="st-rep__dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < correct ? 'is-on' : ''} />)}
    </span>
  )
}

/**
 * Карта по итогам диагностики (Figma SAT 9). Не балл SAT — доля верных по секциям и доменам, три полосы и два
 * приоритета, с которых откроется план. startKey — ключ первой фазы с занятиями (её и называет макет).
 * Внизу (Figma «NEW 2», 17:1194): «Посмотреть план» (onRoadmap — роудмап поверх отчёта) и «Дальше: Bluebook Test N»
 * (onNext — «План» с открытой фазой 1, где вводятся баллы теста; nextTest — его номер).
 */
export default function DiagnosticReport({ result, finishedAt, startKey, timing, nextTest = 6, onManager, onRoadmap, onNext }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const total = result.total || 0
  const pct = total ? Math.round((result.correct * 100) / total) : 0
  const minutes = Math.max(1, Math.round((result.elapsedSec || 0) / 60))
  const date = finishedAt ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(new Date(finishedAt)) : ''
  const grouped = bands(result.domains)
  const focus = result.focus || []
  const first = focus[0]
  let focusNote = null
  if (first) {
    const section = domainSection(first)
    const share = domainShares(TAXONOMY, section).find((d) => d.id === first)?.percent
    focusNote = t('sat.rep.focusNote', {
      domain: domainName(first, lang),
      pct: String(share ?? ''),
      section: section === 'math' ? 'Math' : 'R&W',
      phase: t(`sat.phase.${startKey || 'foundations1'}`),
    })
  }

  const sec = (key, label) => {
    const s = result.sections?.[key] || { correct: 0, total: 0 }
    const p = s.total ? Math.round((s.correct * 100) / s.total) : 0
    return (
      <div className={`st-card st-rep__sec is-${key}`}>
        <span className="st-rep__seclabel"><i />{label}</span>
        <strong>{p}%</strong>
        <span className="st-rep__bar"><i style={{ width: `${p}%` }} /></span>
        <span className="st-muted">{t('sat.rep.ofCorrect', { c: String(s.correct), n: String(s.total) })}</span>
      </div>
    )
  }

  return (
    <main className="st-rep">
      <div className="st-rep__head">
        <div>
          <h1>{t('sat.rep.title')}</h1>
          <p className="st-muted">{t('sat.rep.sub', { n: String(total), date })}</p>
        </div>
        <span className="st-rep__notscore"><InfoIcon size={18} />{t('sat.rep.notScore')}</span>
      </div>

      <div className="st-rep__top">
        <div className="st-card st-rep__overall">
          <div className="st-rep__ringbox">
            <Ring pct={pct} />
            <span><b>{pct}%</b><small>{t('sat.rep.right')}</small></span>
          </div>
          <div>
            <b className="st-rep__big">{t('sat.rep.ofTotal', { c: String(result.correct), n: String(total) })}</b>
            <span className="st-muted">{t('sat.rep.minutes', { m: String(minutes) })}</span>
          </div>
        </div>
        {sec('rw', 'R&W')}
        {sec('math', 'Math')}
        <div className="st-rep__focus">
          <span className="st-rep__eyebrow">{t('sat.rep.startWith')}</span>
          <div className="st-rep__chips">
            {focus.map((id) => (
              <span key={id} className="st-rep__chip">
                {domainSection(id) === 'math' ? <SigmaIcon size={16} /> : <MenuBookIcon size={16} />}
                {domainName(id, lang)}
              </span>
            ))}
          </div>
          {focusNote && <p>{focusNote}</p>}
        </div>
      </div>

      <div className="st-rep__bands">
        {['weak', 'shaky', 'strong'].map((band) => (
          <div key={band} className="st-card st-rep__band">
            <div className="st-rep__bandhead">
              <span className={`st-rep__bandchip is-${band}`}><i />{t(`sat.rep.band.${band}`)}</span>
              <span className="st-muted">{plural(t, lang, 'sat.rep.domains', grouped[band].length)}</span>
            </div>
            <p className="st-rep__advice">{t(`sat.rep.advice.${band}`)}</p>
            <ul>
              {grouped[band].map((d) => (
                <li key={d.id} className={focus.includes(d.id) ? 'is-focus' : ''}>
                  <i className={`st-dot is-${d.section}`} />
                  <b>{domainName(d.id, lang)}</b>
                  {focus.includes(d.id) && <FlagIcon size={16} />}
                  <Dots correct={d.correct} total={d.total} />
                  <span className="st-rep__pct">{Math.round(d.share * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {result.paperItems > 0 && (
        // Нет в Figma: пометка о вопросах пробника — временная, пока банк R&W ждёт решения по College Board
        <p className="st-rep__paper"><InfoIcon size={18} />{t('sat.rep.paperItems', { n: String(result.paperItems) })}</p>
      )}

      {/* план строится впервые — сразу видно, помещается ли он до экзамена (задача 4) */}
      <TimingBanner timing={timing} onManager={onManager} />

      <div className="st-rep__foot">
        <span className="st-muted">{t('sat.rep.footNote')}</span>
        <span className="st-spacer" />
        {/* после диагностики — сразу готовое расписание группы, без шага настройки (ТЗ 21.10, задача 3.1). «Пройти
            заново» нет (решение владельца 08.11.2026): диагностика — база плана, повтор с известными ответами завышает
            балл; пересдать можно только после сброса куратором в админке */}
        <button type="button" className="ih-btn ih-btn--outline st-rep__btn" onClick={onRoadmap}><RouteIcon size={20} />{t('sat.rep.roadmap')}</button>
        <button type="button" className="ih-cta st-rep__cta" onClick={onNext}>{t('sat.rep.next', { n: String(nextTest) })}<ArrowForwardIcon size={20} /></button>
      </div>
    </main>
  )
}
