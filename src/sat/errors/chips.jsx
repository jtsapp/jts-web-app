import { useI18n } from '../../i18n.jsx'
import { RadioOffIcon } from '../../ielts/icons.jsx'
import { BlockIcon, OkCircleIcon, CalculateIcon, EyeIcon, PriorityHighIcon, PsychologyIcon, RouteIcon, StopwatchIcon, TrendingDownIcon } from '../icons.jsx'
import { DIFFICULTIES } from '../practice/FilterBlocks.jsx'
import { reasonOf } from './errorLog.js'

// Чипы журнала ошибок «NEW 2» (17:9002, 17:9308): одни и те же в таблице, в шапке разбора и в статистике — цвет
// причины везде один, чтобы «жёлтое = время» читалось без подписи. Цвета — классами is-<причина> в sat.css.

export const DIFF_LABEL = Object.fromEntries(DIFFICULTIES)

export const REASON_ICON = {
  time: StopwatchIcon,
  calculation: CalculateIcon,
  knowledge: PsychologyIcon,
  misread: EyeIcon,
  strategy: RouteIcon,
  careless: PriorityHighIcon,
  unanswered: BlockIcon,
  trend: TrendingDownIcon,
}

// короткие слова причин в словаре строчные («время»): в чипе они начинают надпись
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Короткое имя причины для чипа и полос статистики. */
export function useReasonWord() {
  const { t } = useI18n()
  return (reason) => (reason === 'unanswered' ? t('sat.el.kind.unanswered') : cap(t(`sat.etype.short.${reason}`)))
}

export function ReasonChip({ item }) {
  const word = useReasonWord()
  const r = reasonOf(item)
  // неверный без причины — не чип: причины нет, есть только пропущенное окно
  if (r === 'none') return <span className="st-muted">—</span>
  const Icon = REASON_ICON[r]
  return <span className={`st-elchip is-${r}`}><Icon size={14} />{word(r)}</span>
}

export function DiffChip({ d }) {
  if (!DIFF_LABEL[d]) return <span className="st-muted">—</span>
  return <span className={`st-elchip st-elchip--diff is-d${d}`}>{DIFF_LABEL[d]}</span>
}

export function SourceChip({ source }) {
  const { t } = useI18n()
  return <span className={`st-elchip st-elchip--src is-${source}`}><i aria-hidden="true" />{t(`sat.el.source.${source}`)}</span>
}

export function StatusChip({ reviewed }) {
  const { t } = useI18n()
  return reviewed
    ? <span className="st-elchip st-elchip--status is-reviewed"><OkCircleIcon size={14} />{t('sat.el.status.reviewed')}</span>
    : <span className="st-elchip st-elchip--status is-open"><RadioOffIcon size={14} />{t('sat.el.status.open')}</span>
}
