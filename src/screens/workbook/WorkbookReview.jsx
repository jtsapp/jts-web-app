'use client'

import { useEffect, useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { SUBSETTABLE, subsetAct } from '../../practice/workbook/engine.js'
import { stopAudio } from '../../practice/workbook/voice.js'
import { resolveMiss } from '../../practice/workbook/workbookProgress.js'
import { useAct } from './ActShell.jsx'
import { ActBar, ActBrief } from './WorkbookAct.jsx'
import ActBody from './acts/index.jsx'

// «Разбор ошибок» — порт renderReview (data/jtsworkbook-a0.html:6480).
// Экраны с промахами возвращаются по одному, суженные до тех пунктов, где
// студент ошибся. Это самая сильная часть прототипа: ошибка не просто
// отмечена, её обязательно пересдают.

export default function WorkbookReview({ level, lesson, index, missed, meta, slow, onSlow, onBack, onNext, left }) {
  const { t } = useI18n()
  const base = lesson.acts[index]
  // Пересобираем задание только при смене экрана: иначе useAct получал бы
  // новый объект на каждый рендер и сбрасывал счётчик.
  const act = useMemo(() => subsetAct(base, missed), [base, missed])
  const ctl = useAct(act)
  const narrowed = act !== base

  useEffect(() => {
    stopAudio()
    return () => stopAudio()
  }, [lesson.n, index])

  const finish = () => {
    // Суженное задание нумеруется заново, поэтому остаток промахов надо
    // вернуть в исходные индексы. Если сузить не удалось (sort, seq, memo…),
    // экран показан целиком и индексы уже исходные — переводить нечего.
    const still = ctl.state.missed
    resolveMiss(level, lesson.n, index, narrowed ? still : mapWhole(still, missed))
    onNext()
  }

  return (
    <>
      <div className="wb-rail">
        <div className="wb-seg">
          {Array.from({ length: Math.min(left, 14) }, (_, k) => (
            <i key={k} className={k === 0 ? 'is-cur' : ''} />
          ))}
        </div>
        <div className="wb-railmeta">
          <button type="button" className="wb-back" aria-label={t('workbook.back')} onClick={onBack}>
            ←
          </button>
          <div className="wb-railmeta__t">
            <b>{t('workbook.reviewTitle')}</b>
            <span>
              {lesson.title} · {t('workbook.mistakesN', { n: left })}
            </span>
          </div>
        </div>
      </div>

      <ActBrief act={act} meta={meta} extra={t('workbook.reviewIns')} />

      <div className="wb-card">
        <div className="wb-items" key={ctl.gen}>
          <ActBody act={act} ctl={ctl} level={level} slow={slow} onSlow={onSlow} draft="" onDraft={() => {}} />
        </div>
      </div>

      <ActBar ctl={ctl} nextLabel={t('workbook.nextScreen')} onNext={finish} />
    </>
  )
}

/**
 * Для несужаемых типов индексы уже исходные — оставляем только те, что
 * действительно были в списке промахов, чтобы разбор не разрастался.
 * (В прототипе они прогонялись через тот же перевод и молча терялись.)
 */
function mapWhole(still, missed) {
  const set = new Set(missed)
  return still.filter((i) => set.has(i))
}

export { SUBSETTABLE }
