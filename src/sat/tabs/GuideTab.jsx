import { useState } from 'react'
import { AboutChapter, CHAPTERS, ExamDayDetails, GoalReference, SectionChapter, StructureChapter, chapterData } from '../onboarding/chapters.jsx'
import { pick } from '../model/profile.js'
import { useI18n } from '../../i18n.jsx'
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon } from '../../ielts/icons.jsx'
import DesmosGuide from '../guide/DesmosGuide.jsx'

/**
 * «Гайд» (Figma SAT 19): шесть глав онбординга, чтобы перечитать в любой момент, — из тех же данных и теми же
 * компонентами. Слева список глав, справа открытая глава и переход к соседним. Вторая половина — гид по Desmos
 * (Figma 20, фаза 9) — `src/sat/guide/DesmosGuide.jsx`.
 */
export default function GuideTab() {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(0)
  const [view, setView] = useState('about')
  const id = CHAPTERS[open]
  const ch = chapterData(id)
  let body
  if (id === 'about') body = <AboutChapter />
  else if (id === 'structure') body = <StructureChapter />
  else if (id === 'goal') body = <GoalReference />
  else if (id === 'examday') body = <ExamDayDetails />
  else body = <SectionChapter id={id} />
  // в гайде у глав 3 и 4 справочные названия (Figma 19: «Ваш целевой балл», «День экзамена»), в онбординге — вопросы
  const title = (c) => t(c === 'goal' || c === 'examday' ? `sat.guide.title.${c}` : `sat.ob.title.${c}`)
  const go = (i) => {
    setOpen(i)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const seg = (
    <div className="ih-seg" role="tablist">
      {['about', 'desmos'].map((v) => (
        <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>{t(`sat.guide.${v}`)}</button>
      ))}
    </div>
  )
  if (view === 'desmos') return <DesmosGuide seg={seg} />
  return (
    <div className="st-guide">
      <div className="st-guide__top">
        {seg}
        <span className="st-guide__retold"><InfoIcon size={16} />{t('sat.guide.retold')}</span>
      </div>
      <div className="st-guide__grid">
        <nav className="st-guide__nav" aria-label={t('sat.guide.about')}>
          {CHAPTERS.map((c, i) => (
            <button key={c} type="button" className={`st-guide__item ${i === open ? 'is-on' : ''}`} aria-current={i === open ? 'true' : undefined} onClick={() => go(i)}>
              <span className="st-guide__num">{i + 1}</span>
              <span><b>{title(c)}</b><span>{t(`sat.guide.sub.${c}`)}</span></span>
            </button>
          ))}
        </nav>
        <article key={id} className="st-card st-guide__body ih-enter">
          <span className="st-ob__chip st-ob__chip--violet">{t('sat.guide.chapter', { n: String(open + 1) })}</span>
          <h2>{title(id)}</h2>
          <p className="st-ob__lead st-ob__lead--left">{pick(ch.lead, lang)}</p>
          {body}
          <div className="st-guide__pager">
            {open > 0 ? (
              <button type="button" className="ih-btn ih-btn--outline" onClick={() => go(open - 1)}><ChevronLeftIcon size={16} />{t('sat.guide.prev', { n: String(open) })}</button>
            ) : <span />}
            {open < CHAPTERS.length - 1 && (
              <button type="button" className="st-guide__next" onClick={() => go(open + 1)}>
                {t('sat.guide.next', { n: String(open + 2), title: title(CHAPTERS[open + 1]) })}<ChevronRightIcon size={16} />
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
