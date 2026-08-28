'use client'

import { useEffect } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ICON, isFree, skillOf, stageOf, STAGE_ICON } from '../../practice/workbook/engine.js'
import { stopAudio } from '../../practice/workbook/voice.js'
import { markAct } from '../../practice/workbook/workbookProgress.js'
import { recordSkill } from '../../practice/skillStats.js'
import { Tally, useAct } from './ActShell.jsx'
import ActBody from './acts/index.jsx'
import { insText, subText } from './loc.js'

// Экран одного задания. Порт renderAct (data/jtsworkbook-a0.html:6289):
// полоса шагов сверху, шапка с типом и инструкцией, карточка, нижняя панель.
// «Дальше» не загорается, пока экран не закрыт целиком — иначе прохождение
// превращается в перелистывание.

export function ActRail({ title, step, total, doneMap, onBack, onMenu, menuLabel }) {
  const { t } = useI18n()
  return (
    <div className="wb-rail">
      <div className="wb-seg">
        {Array.from({ length: total }, (_, k) => (
          <i key={k} className={(doneMap(k) ? 'is-on' : '') + (k === step ? ' is-cur' : '')} />
        ))}
      </div>
      <div className="wb-railmeta">
        <button type="button" className="wb-back" aria-label={t('workbook.back')} onClick={onBack}>
          ←
        </button>
        <div className="wb-railmeta__t">
          <b>{title}</b>
          <span>
            {t('workbook.step')} {step + 1} {t('workbook.of')} {total}
          </span>
        </div>
        {onMenu ? (
          <button type="button" className="wb-open" onClick={onMenu}>
            ☰ <span>{menuLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function ActBrief({ act, meta, extra }) {
  const { t, lang } = useI18n()
  const stage = stageOf(act)
  const sub = subText(act, meta, lang)
  return (
    <div className="wb-brief">
      <span className={'wb-tag wb-tag--' + stage}>
        <span aria-hidden="true">{ICON[act.t] || STAGE_ICON[stage] || '✳️'}</span>{' '}
        {t('workbook.type.' + act.t)}
      </span>
      <span className="wb-brief__tx">
        {insText(act, meta, lang)}
        {sub ? <em>{sub}</em> : null}
        {extra ? <em>{extra}</em> : null}
      </span>
    </div>
  )
}

/**
 * Нижняя панель. «Показать ответы» появляется только после реальной ошибки —
 * так в прототипе: это выход для застрявшего, а не кнопка «пропустить».
 */
export function ActBar({ ctl, nextLabel, onNext, children }) {
  const { t } = useI18n()
  const showHelp = !ctl.done && !ctl.state.free && ctl.state.wrong > 0
  const showAgain = !ctl.state.free && (ctl.state.resolved > 0 || ctl.state.wrong > 0)
  return (
    <div className="wb-actionbar">
      {children}
      {showHelp ? (
        <button type="button" className="wb-ghost" onClick={ctl.reveal}>
          {t('workbook.showAnswers')}
        </button>
      ) : null}
      {showAgain ? (
        <button type="button" className="wb-ghost" aria-label={t('workbook.againAct')} onClick={ctl.again}>
          ↺
        </button>
      ) : null}
      <button type="button" className="wb-primary wb-primary--grow" disabled={!ctl.done} onClick={onNext}>
        {nextLabel} →
      </button>
    </div>
  )
}

export default function WorkbookAct({
  level,
  lesson,
  index,
  meta,
  progress,
  slow,
  onSlow,
  onBack,
  onMenu,
  onDone,
  draft,
  onDraft,
}) {
  const { t } = useI18n()
  const act = lesson.acts[index]
  const ctl = useAct(act)
  const last = index >= lesson.acts.length - 1

  // Смена экрана обрывает воспроизведение: иначе аудио прошлого задания
  // продолжает читать поверх нового.
  useEffect(() => {
    stopAudio()
    return () => stopAudio()
  }, [index, lesson.n])

  const next = () => {
    markAct(level, lesson.n, index, ctl.state.missed)
    // Рейтинг навыка — по первой попытке, как в «Письме»: перебор вариантов
    // не должен накручивать точность. Шкала берётся из стадии экрана, поэтому
    // аудирование не попадает в грамматику.
    if (!isFree(act) && ctl.state.total) {
      const skill = skillOf(act)
      for (let k = 0; k < ctl.state.total; k++) recordSkill(skill, !ctl.state.missed.includes(k))
    }
    onDone(last)
  }

  return (
    <>
      <ActRail
        title={lesson.title}
        step={index}
        total={lesson.acts.length}
        doneMap={(k) => progress.prog[level + ':' + lesson.n + '.' + k]}
        onBack={onBack}
        onMenu={onMenu}
        menuLabel={t('workbook.lessonMenu')}
      />
      <ActBrief act={act} meta={meta} />
      <div className="wb-card">
        <div className="wb-items" key={ctl.gen}>
          <ActBody
            act={act}
            ctl={ctl}
            level={level}
            slow={slow}
            onSlow={onSlow}
            draft={draft}
            onDraft={onDraft}
          />
        </div>
      </div>
      <ActBar
        ctl={ctl}
        nextLabel={last ? t('workbook.finish') : t('workbook.nextScreen')}
        onNext={next}
      >
        <Tally
          state={ctl.state}
          freeLabel={t('workbook.noCheck')}
          rightFirstLabel={t('workbook.rightFirst', { n: ctl.state.first, total: ctl.state.total })}
        />
      </ActBar>
    </>
  )
}
