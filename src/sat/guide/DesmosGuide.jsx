import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import GUIDE from '../data/desmosGuide.json'
import { pick } from '../model/profile.js'
import { DESMOS_URL } from '../question/DesmosDock.jsx'
import { CheckCircleIcon, InfoIcon, OpenInNewIcon, RadioOffIcon } from '../../ielts/icons.jsx'

const KEY = 'jts_sat_desmos_studied'

function readStudied() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return new Set(Array.isArray(v) ? v : [])
  } catch {
    return new Set()
  }
}

/**
 * Плеер виден сразу, без кнопки «Смотреть видео урока», и сам не запускается (ТЗ SAT 17.10, задача 14). Домен
 * youtube-nocookie: YouTube не ставит куки, пока ученик не нажал «играть». Подпись автора со ссылкой обязательна:
 * ролик не наш, и без подписи читался бы как наш.
 */
function Video({ url, credit, title }) {
  const { t } = useI18n()
  if (!url) return null
  const src = url.replace('https://www.youtube.com/embed/', 'https://www.youtube-nocookie.com/embed/')
  return (
    <div className="st-dg__video">
      <iframe src={src} title={title} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
      {credit && (
        <p className="st-muted st-dg__credit">
          {t('sat.dg.credit')} <a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.name}</a>
        </p>
      )}
    </div>
  )
}

/**
 * Гид по Desmos (Figma SAT 20; данные — prototype desmos-guide.js): уроки слева с отметкой «изучено», справа урок
 * одного вида для всех — видео, плашка «Этот урок — видео…», рабочий калькулятор и «Упражнения» (ТЗ SAT 17.10,
 * задача 14: формат урока 6 — единственный; текстовые шаги и вводный абзац уроков 1–4 не показываются).
 * Отметки «изучено» — на устройстве.
 */
export default function DesmosGuide({ seg }) {
  const { t, lang } = useI18n()
  const sections = GUIDE.sections
  const [open, setOpen] = useState(0)
  const [studied, setStudied] = useState(() => readStudied())
  const s = sections[open]

  const toggle = () => {
    const next = new Set(studied)
    if (next.has(s.id)) next.delete(s.id)
    else next.add(s.id)
    setStudied(next)
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...next]))
    } catch {
      /* отметка не сохранится — урок от этого не хуже */
    }
  }
  const go = (i) => setOpen(i)
  const done = sections.filter((x) => studied.has(x.id)).length

  return (
    <div className="st-guide">
      <div className="st-guide__top">
        {seg}
        <span className="st-spacer" />
        <span className="st-dg__count"><CheckCircleIcon size={18} />{t('sat.dg.studied', { n: String(done), total: String(sections.length) })}</span>
        <a className="ih-btn ih-btn--outline st-dg__tab" href={DESMOS_URL} target="_blank" rel="noopener noreferrer">{t('sat.dg.newTab')}<OpenInNewIcon size={16} /></a>
      </div>
      <div className="st-guide__grid">
        <nav className="st-dg__nav" aria-label={t('sat.guide.desmos')}>
          {sections.map((x, i) => (
            <button key={x.id} type="button" className={`st-dg__item ${i === open ? 'is-on' : ''} ${studied.has(x.id) ? 'is-done' : ''}`} aria-current={i === open ? 'true' : undefined} onClick={() => go(i)}>
              {studied.has(x.id) ? <CheckCircleIcon size={18} /> : <RadioOffIcon size={18} />}
              <span>{pick(x.title, lang)}</span>
            </button>
          ))}
        </nav>
        <article key={s.id} className="st-card st-dg__body ih-enter">
          <div className="st-dg__head">
            <div>
              <span className="st-dg__lesson">{t('sat.dg.lesson', { n: String(s.lesson) })}</span>
              <h2>{pick(s.title, lang)}</h2>
            </div>
            <button type="button" className={`st-dg__mark ${studied.has(s.id) ? 'is-on' : ''}`} aria-pressed={studied.has(s.id)} onClick={toggle}>
              <CheckCircleIcon size={18} />{t(studied.has(s.id) ? 'sat.dg.marked' : 'sat.dg.mark')}
            </button>
          </div>
          <div className="st-dg__cols">
            {/* B11, прототип 89fb0508: видео урока слева, калькулятор открыт рядом справа — смотришь и повторяешь */}
            <div className="st-dg__left">
              <Video url={s.video} credit={s.videoCredit} title={pick(s.title, lang)} />
              <p className="st-dg__note"><InfoIcon size={18} />{t('sat.dg.videoLesson')}</p>
            </div>
            <div className="st-dg__calc">
              <iframe src={DESMOS_URL} title="Desmos Graphing Calculator" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div className="st-dg__ex">
            <b>{t('sat.dg.exercises')}</b>
            {s.exercises?.length ? (
              <ol>{s.exercises.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.title || x.url}</a></li>)}</ol>
            ) : <p className="st-muted">{t('sat.dg.exercisesSoon')}</p>}
          </div>
        </article>
      </div>
    </div>
  )
}
