import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { formatDate } from '../format.js'
import { EditIcon, ArrowForwardIcon, EventIcon } from '../icons.jsx'

// Блок цели «Сегодня» (дизайн «IELTS new», GoalJourney + доска состояний): маскот с репликой, срок до экзамена и путь
// старт → сейчас → цель. Состояния — по данным, а не по макету: дата завтра/сегодня/не указана/прошла, оценки нет,
// работы на проверке, цель достигнута. Шкала — три этапа без числовой оси (ТЗ v4: не рисуем линейный прогноз).

const SKILL_NAME = { writing: 'Writing', speaking: 'Speaking', reading: 'Reading', listening: 'Listening' }

// Сколько формулировок у реплики состояния (ieltsGoal.say.<key>, .2, .3): маскот говорит разное от захода к заходу,
// а не одну фразу месяцами (правка по доске состояний макета). Смысл у вариантов один — выбор не зависит от данных.
const SAY_VARIANTS = { gapSkill: 3, gap: 3, keep: 3, reached: 3, noDate: 2, tomorrow: 2, today: 2, checking: 2 }

/** Ключ реплики с вариантом: seed в [0, 1) — случайное число, взятое один раз на показ блока. */
export function sayKey(key, seed) {
  const n = SAY_VARIANTS[key] || 1
  const i = Math.min(n - 1, Math.floor(seed * n))
  return i === 0 ? `ieltsGoal.say.${key}` : `ieltsGoal.say.${key}.${i + 1}`
}

/** Состояние блока: что рисовать в заголовке, реплике и дорожке. Чистая функция — под тестом. */
export function goalState({ deadline, journey, growthSkill }) {
  const base = journey?.baseline || null
  const cur = journey?.current || null
  const target = journey?.target ?? null
  const reached = cur && target != null && cur.score >= target
  const date = deadline?.state || 'none'
  let say
  if (!base && !cur) say = { key: 'noScore' }
  else if (journey?.checking) say = { key: 'checking' }
  else if (reached) say = { key: 'reached', vars: { source: sourceLabelKey(cur) } }
  else if (date === 'tomorrow') say = { key: 'tomorrow' }
  else if (date === 'today') say = { key: 'today' }
  else if (date === 'none') say = { key: 'noDate' }
  else if (date === 'passed') say = { key: 'passed' }
  else if (cur && target != null) say = growthSkill ? { key: 'gapSkill', vars: { gap: (target - cur.score).toFixed(1), skill: SKILL_NAME[growthSkill] || growthSkill } } : { key: 'gap', vars: { gap: (target - cur.score).toFixed(1) } }
  else say = { key: 'keep' }
  return { base, cur, target, reached, date, say }
}

function sourceLabelKey(cur) {
  return cur?.source?.startsWith('full_') ? 'full' : cur?.source === 'diagnostic' ? 'diagnostic' : 'sections'
}

export default function GoalBanner({ deadline, journey, growthSkill, onEditGoal, onOpenProgress, onDiagnostic }) {
  const { t, lang } = useI18n()
  const s = goalState({ deadline, journey, growthSkill })
  const [seed] = useState(() => Math.random())
  const fmt = (iso) => (iso ? formatDate(`${iso}T00:00:00`, lang) : '')
  const noScore = !s.base && !s.cur
  const sayVars = s.say.vars?.source ? { ...s.say.vars, source: t(`ieltsGoal.src.${s.say.vars.source}`) } : s.say.vars

  let title
  let sub = null
  if (s.reached) {
    title = t('ieltsGoal.title.reached')
    sub = <span className="ih-gb__date">{t(`ieltsGoal.src.${sourceLabelKey(s.cur)}`)} · {fmt(s.cur.date)}</span>
  } else if (s.date === 'none') {
    title = t('ieltsGoal.title.noDate')
    sub = (
      <button type="button" className="ih-gb__pill" onClick={onEditGoal}>
        <EventIcon size={16} /> {t('ieltsGoal.setDate')}
      </button>
    )
  } else if (s.date === 'passed') {
    title = t('ieltsGoal.title.passed')
    sub = (
      <span className="ih-gb__daterow">
        <span className="ih-gb__date">{fmt(deadline.examDate)}</span>
        <button type="button" className="ih-gb__pill" onClick={onEditGoal}>{t('ieltsGoal.updateGoal')}</button>
      </span>
    )
  } else {
    title = s.date === 'today' ? t('ieltsGoal.title.today') : s.date === 'tomorrow' ? t('ieltsGoal.title.tomorrow')
      : plural(t, lang, 'ieltsGoal.title.days', deadline.daysRemaining)
    sub = (
      <span className="ih-gb__daterow">
        <span className="ih-gb__date">{fmt(deadline.examDate)}</span>
        <button type="button" className="ih-gb__edit" onClick={onEditGoal} aria-label={t('ieltsGoal.editDate')}>
          <EditIcon size={14} />
        </button>
      </span>
    )
  }

  // Блок кликабелен целиком (правка «All clickable»): путь старт → сейчас → цель ведёт в подробный прогресс, без оценки —
  // в диагностику. Свои кнопки внутри (дата, «указать дату») работают как раньше и наружу клик не отдают.
  const openMore = noScore ? onDiagnostic : onOpenProgress
  const onBlockClick = (e) => {
    if (e.target.closest('button, a')) return
    openMore?.()
  }

  return (
    <section className="ih-gb is-clickable" aria-label={t('ieltsGoal.aria')} onClick={onBlockClick}>
      <img className="ih-gb__bg" src="/ielts/mascot/goal-bg.webp" alt="" aria-hidden="true" />
      <div className="ih-gb__mascot">
        <p className="ih-gb__bubble">{t(sayKey(s.say.key, seed), sayVars)}</p>
        <img src="/ielts/mascot/cheer.webp" alt="" aria-hidden="true" width="300" height="237" />
      </div>
      <div className="ih-gb__journey">
        <div className="ih-gb__exam">
          <h2>{title}</h2>
          {sub}
        </div>
        <ol className={`ih-gb__track${noScore ? ' is-empty' : ''}${s.reached ? ' is-reached' : ''}`}>
          <li className="ih-gb__node ih-gb__node--a" aria-label={t('ieltsGoal.start')}>
            <span>{s.base ? s.base.score.toFixed(1) : '—'}</span>
          </li>
          <li className="ih-gb__line ih-gb__line--done" aria-hidden="true" />
          <li className="ih-gb__now" aria-label={t('ieltsGoal.now')}>
            <span className="ih-gb__node ih-gb__node--now">{s.cur ? s.cur.score.toFixed(1) : '—'}</span>
            <span className={`ih-gb__nowtag${journey?.checking ? ' is-checking' : ''}${noScore ? ' is-none' : ''}`}>
              {noScore ? t('ieltsGoal.noScore') : journey?.checking ? t('ieltsGoal.checking') : t('ieltsGoal.now')}
            </span>
          </li>
          <li className="ih-gb__line ih-gb__line--todo" aria-hidden="true" />
          <li className="ih-gb__star" aria-label={t('ieltsGoal.goal')}>
            <span>{s.target != null ? Number(s.target).toFixed(1) : '—'}</span>
          </li>
        </ol>
        <div className="ih-gb__foot">
          {noScore ? (
            <button type="button" className="ih-link" onClick={onDiagnostic}>{t('ieltsGoal.toDiagnostic')} <ArrowForwardIcon size={17} /></button>
          ) : (
            <button type="button" className="ih-link" onClick={onOpenProgress}>{t('ieltsGoal.moreProgress')} <ArrowForwardIcon size={17} /></button>
          )}
        </div>
      </div>
    </section>
  )
}
