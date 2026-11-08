import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { FlagIcon, QuizIcon } from '../../ielts/icons.jsx'
import { TickIcon } from '../icons.jsx'
import { parse } from '../model/plan.js'
import { fmtDate } from '../model/dates.js'
import { phaseStrip } from '../model/phaseStrip.js'

/** Значок контрольной точки и финиша: пройдено — галочка, тест без баллов — «!», иначе — квиз; финиш — флаг. */
function Dot({ pt }) {
  if (pt.type === 'end') return <FlagIcon size={18} />
  if (pt.state === 'done') return <TickIcon size={18} />
  if (pt.state === 'warn') return <b>!</b>
  return <QuizIcon size={18} />
}

/**
 * Полоса фаз SAT (Figma «NEW 2», компонент 17:5293): от диагностики до экзамена в одну строку — контрольные точки
 * кружками на линии (недель не занимают), учебные фазы отрезками с заполнением, самоподготовка пунктиром, финиш —
 * флаг с датой экзамена. size 'L' — «План» (третья строка «12 занятий»), 'S' — «Сегодня» (компактнее, две строки).
 * roadmap — ответ /mobile/sat/roadmap целиком ({ roadmap, examDate }), schedule — расписание группы: по нему
 * заполняется отрезок текущей фазы. onSelect(n) делает точки кнопками (карточка фазы в «Роудмапе»), selected — какая
 * открыта; финиш не выбирается — у дня экзамена своей карточки нет.
 */
export default function PhaseStrip({ roadmap, schedule, size = 'L', selected = null, onSelect = null }) {
  const { t, lang } = useI18n()
  const r = roadmap?.roadmap
  if (!r) return null
  const points = phaseStrip(r, schedule)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const examDate = roadmap.examDate ? fmtDate(loc, parse(roadmap.examDate), { day: 'numeric', month: 'long' }) : t('sat.dateUndecided')
  // с фазой 6 места на строке меньше — самоподготовка уже (Figma: 180 → 140), отрезки делят остаток поровну
  const extra = points.some((p) => p.extra)

  return (
    <ol className={`st-strip is-${size} ${extra ? 'has-extra' : ''}`} aria-label={t('sat.strip.label')}>
      {points.map((pt) => {
        const pick = onSelect && pt.type !== 'end'
        const Body = pick ? 'button' : 'div'
        // текущую фазу и так видно по чипу «Вы здесь» — подчёркиваем только выбранную другую
        const cls = `st-strip__pt is-${pt.type} is-${pt.state} ${pick && selected === pt.n && !pt.here ? 'is-selected' : ''}`
        return (
          <li key={pt.n} className={cls}>
            <Body className="st-strip__body" {...(pick ? { type: 'button', onClick: () => onSelect(pt.n), 'aria-pressed': selected === pt.n } : {})}>
              <span className="st-strip__mark">{pt.here && <em>{t('sat.strip.here')}</em>}</span>
              <span className="st-strip__track">
                {(pt.type === 'cp' || pt.type === 'end') && (
                  <>
                    <i className={`st-strip__line ${pt.left ? 'is-on' : ''}`} />
                    <span className="st-strip__dot"><Dot pt={pt} /></span>
                    <i className={`st-strip__line ${pt.type === 'end' ? 'is-none' : pt.right ? 'is-on' : ''}`} />
                  </>
                )}
                {pt.type === 'seg' && <span className="st-strip__bar"><i style={{ width: `${pt.fill}%` }} /></span>}
                {pt.type === 'self' && <span className="st-strip__open" />}
              </span>
              <span className="st-strip__labels">
                <b>{t(pt.title)}</b>
                <small>{pt.sub ? t(pt.sub[0], pt.sub[1]) : examDate}</small>
                {size === 'L' && pt.type === 'seg' && pt.lessons != null && (
                  <small className="st-strip__count">{plural(t, lang, 'sat.strip.lessons', pt.lessons)}{pt.extra && t('sat.strip.extra')}</small>
                )}
              </span>
            </Body>
          </li>
        )
      })}
    </ol>
  )
}
