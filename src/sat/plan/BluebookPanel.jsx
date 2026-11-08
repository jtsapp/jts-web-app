import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon, ScheduleIcon } from '../../ielts/icons.jsx'
import { NoCircleIcon, OkCircleIcon } from '../icons.jsx'

/**
 * Состояние проверки куратора (Figma «NEW 2», 17:8454): на подтверждении — оранжевая плашка с часами, подтверждено —
 * зелёная, отклонено — красная с комментарием куратора и «Ввести баллы снова». Та же плашка — в форме Bluebook.
 */
export function ReviewBanner({ test, onEnter }) {
  const { t } = useI18n()
  const s = test?.reviewStatus
  if (!s) return null
  const Icon = s === 'APPROVED' ? OkCircleIcon : s === 'REJECTED' ? NoCircleIcon : ScheduleIcon
  const key = s === 'APPROVED' ? 'approved' : s === 'REJECTED' ? 'rejected' : 'pending'
  return (
    <div className={`st-bbstate is-${key}`} role={s === 'REJECTED' ? 'alert' : undefined}>
      <b><Icon size={20} />{t(`sat.bb.${key}Title`)}</b>
      <p>{s === 'REJECTED' ? (test.reviewComment ? t('sat.bb.rejectedText', { comment: test.reviewComment }) : t('sat.bb.rejectedNoComment')) : t(`sat.bb.${key}Text`)}</p>
      {s === 'REJECTED' && onEnter && <button type="button" className="ih-cta st-bbstate__again" onClick={onEnter}>{t('sat.bb.again')}</button>}
    </div>
  )
}

/**
 * Контрольный Bluebook-тест фазы 1, 3 или 5 в карточке роудмапа (ТЗ 21.10, задача 1). Форма трёх баллов — свой экран
 * во всё окно (17:8284, `?screen=sat-bluebook`), сравнение 6 → 8 → 10 — тоже (`?screen=sat-compare`); здесь только
 * состояние теста и кнопка туда. Прежние две таблицы (баллы и домены) переехали на экран сравнения.
 */
export default function BluebookPanel({ test, tests, onEnter, onCompare }) {
  const { t } = useI18n()
  const mine = tests?.find((x) => x.test === test) || null
  const entered = !!mine?.entered
  const rejected = mine?.reviewStatus === 'REJECTED'

  return (
    <div className="st-bb">
      {!entered && !rejected && <p className="st-muted">{t('sat.bb.instr')}</p>}
      <ReviewBanner test={mine} onEnter={onEnter ? () => onEnter(test) : null} />
      {entered && (
        <dl className="st-bb__scores">
          <div><dt>{t('sat.bb.total')}</dt><dd>{mine.total}</dd></div>
          <div><dt>{t('sat.bb.rw')}</dt><dd>{mine.rw}</dd></div>
          <div><dt>{t('sat.bb.math')}</dt><dd>{mine.math}</dd></div>
        </dl>
      )}
      <div className="st-bb__acts">
        {!entered && !rejected && onEnter && (
          <button type="button" className="ih-cta" onClick={() => onEnter(test)}>{t('sat.bb.enter', { n: String(test) })}<ArrowForwardIcon size={20} /></button>
        )}
        {/* сравнение есть только у Test 8 и 10: у Test 6 сравнивать не с чем, он сам точка отсчёта */}
        {entered && test !== 6 && onCompare && (
          <button type="button" className="ih-cta" onClick={() => onCompare(test)}>{t('sat.bb.toCompare', { n: String(test) })}<ArrowForwardIcon size={20} /></button>
        )}
      </div>
    </div>
  )
}
