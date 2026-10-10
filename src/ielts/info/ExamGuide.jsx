import { useState } from 'react'
import data from './infoData.json'
import { InfoChapter } from '../tabs/InfoTab.jsx'
import { SecPlate } from '../today/TodayCards.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import {
  ArrowForwardIcon, CheckCircleIcon, ChevronRightIcon, EventIcon, ExpandMoreIcon,
  HelpIcon, InfoIcon, PremiumIcon, ScheduleIcon, TranslateIcon, TrendingUpIcon, TrophyIcon,
} from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// «Об экзамене» по дизайну «IELTS new» (Figma, раздел 5): четыре навыка, раскрытая секция (части, критерии, время),
// «Быстрые ответы» (главы справочника по клику) и FAQ. Тексты — утверждённые методистом (infoData.json) плюс подписи
// частей; цен и дат нет намеренно (ТЗ §22). Переключатель Academic/GT меняет только справку, не программу (ТЗ v4).

const SKILLS = ['listening', 'reading', 'writing', 'speaking']
const SKILL_NAME = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' }
const PARTS = { listening: ['p1', 'p2', 'p3', 'p4'], reading: ['t1', 't2', 't3'], writing: ['task1', 'task2'], speaking: ['p1', 'p2', 'p3'] }
const QUICK = [
  { key: 'band', Icon: TrophyIcon },
  { key: 'diff', Icon: TranslateIcon },
  { key: 'reg', Icon: EventIcon },
  { key: 'day', Icon: PremiumIcon },
]

function lookup(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
}

function Accordion({ icon, title, open, onToggle, children }) {
  return (
    <section className={`ih-acc${open ? ' is-open' : ''}`}>
      <button type="button" className="ih-acc__head" aria-expanded={open} onClick={onToggle}>
        {icon}
        <b>{title}</b>
        <ExpandMoreIcon size={20} />
      </button>
      {open && <div className="ih-acc__body">{children}</div>}
    </section>
  )
}

export default function ExamGuide({ track: profileTrack, onOpenSkill }) {
  const { t, lang } = useI18n()
  const T = data.text[lang] || data.text.ru
  const x = (path) => lookup(T, path) ?? lookup(data.text.ru, path) ?? ''
  // справочник листается по любому треку, но программа ученика от этого не меняется
  const [track, setTrack] = useState(profileTrack === 'general' ? 'general' : 'academic')
  const tr = track === 'general' ? 'gt' : 'ac'
  // первым открыт Listening — первая секция экзамена и первая карточка ряда (правка по макету)
  const [skill, setSkill] = useState('listening')
  const [open, setOpen] = useState('criteria')
  // «Вопросы об экзамене» — пятая карточка ряда навыков (правка в Figma): быстрые ответы и FAQ вместе, наверху, а не
  // отдельная колонка справа и аккордеон в самом низу страницы
  const [quick, setQuick] = useState(null)
  const trackName = track === 'general' ? 'General Training' : 'Academic'

  const criteria = skill === 'faq' ? [] : t(`ieltsGuideV.crit.${skill}`).split('|')
  const time = skill === 'faq' ? '' : `${x(`format.${skill}.time`)}. ${t(`ieltsGuideV.time.${skill}`)} ${x(`tips.${skill}`)}`.replace(/\.\./g, '.')

  return (
    <div className="ih-eg">
      <PageHeader
        title={t('ieltsGuideV.title')}
        sub={t('ieltsGuideV.sub')}
        right={(
          <div className="ih-eg__track">
            <div className="ih-seg2" role="tablist" aria-label={x('trackLabel')}>
              {['academic', 'general'].map((k) => (
                <button key={k} type="button" role="tab" aria-selected={track === k} className={track === k ? 'is-on' : ''} onClick={() => setTrack(k)}>
                  {k === 'general' ? 'General Training' : 'Academic'}
                </button>
              ))}
            </div>
            <small><InfoIcon size={14} /> {t('ieltsGuideV.trackNote')}</small>
          </div>
        )}
      />

      <div className="ih-eg__skills" role="tablist" aria-label={t('ieltsGuideV.skills')}>
        {SKILLS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={skill === s} className={`ih-eg__skill${skill === s ? ' is-on' : ''}`} onClick={() => { setSkill(s); setOpen('criteria') }}>
            <SecPlate sec={s} size={44} />
            <span><b>{SKILL_NAME[s]}</b><small>{t(`ieltsGuideV.skillSub.${s}`)}</small></span>
            <ChevronRightIcon size={18} />
          </button>
        ))}
        <button type="button" role="tab" aria-selected={skill === 'faq'} className={`ih-eg__skill is-faq${skill === 'faq' ? ' is-on' : ''}`} onClick={() => { setSkill('faq'); setQuick(null) }}>
          <span className="ih-plate ih-eg__faqplate" aria-hidden="true"><HelpIcon size={24} /></span>
          <span><b>{t('ieltsGuideV.faq')}</b><small>{t('ieltsGuideV.quick')}</small></span>
          <ChevronRightIcon size={18} />
        </button>
      </div>

      {skill === 'faq' ? (
        <section className="ih-eg__main ih-eg__faq" aria-label={t('ieltsGuideV.faq')}>
          <h2>{t('ieltsGuideV.faq')}</h2>
          {QUICK.map(({ key, Icon }) => (
            <Accordion key={key} icon={<Icon size={20} />} title={t(`ieltsGuideV.q.${key}`)} open={quick === key} onToggle={() => setQuick(quick === key ? null : key)}>
              <div className="ih-info__body"><InfoChapter chapter={key} track={track} /></div>
            </Accordion>
          ))}
          <Accordion icon={<HelpIcon size={20} />} title={t('ieltsGuideV.faqMore')} open={quick === 'faq'} onToggle={() => setQuick(quick === 'faq' ? null : 'faq')}>
            <div className="ih-info__body"><InfoChapter chapter="faq" track={track} /></div>
          </Accordion>
        </section>
      ) : (
        <section className="ih-eg__main" aria-label={SKILL_NAME[skill]}>
          <h2>{SKILL_NAME[skill]} <span>· {skill === 'reading' || skill === 'writing' ? trackName : t('ieltsGuideV.bothTracks')}</span></h2>
          <ol className="ih-eg__parts">
            {PARTS[skill].map((p, i) => (
              <li key={p}>
                <span className="ih-eg__num">{i + 1}</span>
                <span>
                  <b>{t(`ieltsGuideV.part.${skill}.${p}.name`)}</b>
                  <small>{t(`ieltsGuideV.part.${skill}.${p}.${(skill === 'reading' || (skill === 'writing' && p === 'task1')) ? tr : 'text'}`)}</small>
                </span>
              </li>
            ))}
          </ol>
          <Accordion icon={<TrendingUpIcon size={18} />} title={t('ieltsGuideV.critTitle')} open={open === 'criteria'} onToggle={() => setOpen(open === 'criteria' ? null : 'criteria')}>
            <ul className="ih-eg__crit">
              {criteria.map((c) => <li key={c}><CheckCircleIcon size={16} /> {c}</li>)}
            </ul>
          </Accordion>
          <Accordion icon={<ScheduleIcon size={18} />} title={t('ieltsGuideV.timeTitle')} open={open === 'time'} onToggle={() => setOpen(open === 'time' ? null : 'time')}>
            <p className="ih-eg__time">{time}</p>
          </Accordion>
          <button type="button" className="ih-link" onClick={() => onOpenSkill?.(skill)}>{t('ieltsGuideV.toPractice', { skill: SKILL_NAME[skill] })} <ArrowForwardIcon size={16} /></button>
        </section>
      )}

      <p className="ih-eg__disclaimer"><InfoIcon size={14} /> {x('disclaimer')}</p>
    </div>
  )
}
