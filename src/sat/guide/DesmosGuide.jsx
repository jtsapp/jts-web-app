import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import GUIDE from '../data/desmosGuide.json'
import { pick } from '../model/profile.js'
import { DESMOS_URL } from '../question/DesmosDock.jsx'
import { CheckCircleIcon, InfoIcon, OpenInNewIcon, RadioOffIcon } from '../../ielts/icons.jsx'
import { CalculateIcon, PlayCircleIcon } from '../icons.jsx'

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
 * Видео чужого автора открываем по нажатию и через youtube-nocookie: пока ученик не нажал, YouTube о нём не знает и
 * страница не тянет плеер. Подпись автора со ссылкой — обязательна: ролик не наш, и без подписи читался бы как наш.
 */
function Video({ url, credit, title }) {
  const { t } = useI18n()
  const [on, setOn] = useState(false)
  if (!url) return null
  const src = url.replace('https://www.youtube.com/embed/', 'https://www.youtube-nocookie.com/embed/')
  return (
    <div className="st-dg__video">
      {on ? (
        <iframe src={`${src}?autoplay=1`} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
      ) : (
        <button type="button" className="st-dg__poster" onClick={() => setOn(true)}>
          <PlayCircleIcon size={28} />{t('sat.dg.watch')}
        </button>
      )}
      {credit && (
        <p className="st-muted st-dg__credit">
          {t('sat.dg.credit')} <a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.name}</a>
        </p>
      )}
    </div>
  )
}

/**
 * Гид по Desmos (Figma SAT 20; данные — prototype desmos-guide.js): уроки слева с отметкой «изучено», справа урок —
 * шаги с примером, выражения, чтобы повторить, живой калькулятор и видео. Калькулятор грузится по кнопке, а не сразу:
 * фрейм, до которого никто не дошёл, — секунды чужого интернета впустую. Отметки «изучено» — на устройстве.
 */
export default function DesmosGuide({ seg }) {
  const { t, lang } = useI18n()
  const sections = GUIDE.sections
  const [open, setOpen] = useState(0)
  const [studied, setStudied] = useState(() => readStudied())
  const [calc, setCalc] = useState(false)
  const [copied, setCopied] = useState(null)
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
  const go = (i) => {
    setOpen(i)
    setCalc(false)
    setCopied(null)
  }
  const copy = (expr) => {
    navigator.clipboard?.writeText(expr).then(() => setCopied(expr)).catch(() => {})
  }
  const steps = s.steps ? pick(s.steps, lang) : null
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
              {s.lead && <p className="st-muted">{pick(s.lead, lang)}</p>}
            </div>
            <button type="button" className={`st-dg__mark ${studied.has(s.id) ? 'is-on' : ''}`} aria-pressed={studied.has(s.id)} onClick={toggle}>
              <CheckCircleIcon size={18} />{t(studied.has(s.id) ? 'sat.dg.marked' : 'sat.dg.mark')}
            </button>
          </div>
          <div className="st-dg__cols">
            <div className="st-dg__left">
              {steps ? (
                <ol className="st-dg__steps">
                  {/* шаги — текст гида из прототипа (только <b>, <code>, <i>), доверенная разметка выгрузки */}
                  {steps.map((x, i) => <li key={i}><span>{i + 1}</span><div dangerouslySetInnerHTML={{ __html: x }} /></li>)}
                </ol>
              ) : (
                <p className="st-dg__note"><InfoIcon size={18} />{t('sat.dg.videoLesson')}</p>
              )}
              {s.tryIt?.length > 0 && (
                <div className="st-dg__try">
                  <b>{t('sat.dg.tryIt')}</b>
                  <div>
                    {s.tryIt.map((e) => (
                      <button key={e} type="button" className="st-dg__expr" onClick={() => copy(e)} title={t('sat.dg.copy')}>
                        <code>{e}</code>{copied === e && <small>{t('sat.dg.copied')}</small>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Video url={s.video} credit={s.videoCredit} title={pick(s.title, lang)} />
            </div>
            <div className="st-dg__calc">
              {calc ? (
                <iframe src={DESMOS_URL} title="Desmos Graphing Calculator" loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <button type="button" className="st-dg__load" onClick={() => setCalc(true)}>
                  <CalculateIcon size={28} />
                  <b>{t('sat.dg.loadCalc')}</b>
                  <small>{t('sat.dg.loadCalcNote')}</small>
                </button>
              )}
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
