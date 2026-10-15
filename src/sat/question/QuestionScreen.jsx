import { useCallback, useEffect, useRef, useState } from 'react'
import AnswerChoices from './AnswerChoices.jsx'
import DesmosDock from './DesmosDock.jsx'
import HtmlBlock from './HtmlBlock.jsx'
import QuestionTimer from './QuestionTimer.jsx'
import SprInput from './SprInput.jsx'
import { NavDialog, NavRail } from './Navigator.jsx'
import { Directions, ReferenceSheet, SatModal, Scratchpad } from './ToolDialogs.jsx'
import { fromSelection, merge, removeAt, snap, textOf } from './highlight.js'
import {
  KEYS, answerOf, counts, current, goTo, isAnswered, select, setHighlights, setPaused, setScratch, setTool, setValue,
  toggleMark, toggleStrike,
} from './session.js'
import ConfirmDialog from '../../ielts/ui/ConfirmDialog.jsx'
import { BookmarkIcon, CalculateIcon, EyeIcon, EyeOffIcon, HighlighterIcon, NoteIcon, RulerIcon } from '../icons.jsx'
import { CloseIcon, DescriptionIcon } from '../../ielts/icons.jsx'
import { plural } from '../../lib/plural.js'
import { useI18n } from '../../i18n.jsx'

/**
 * Общий экран вопроса SAT в стиле Bluebook (Figma SAT 8, 26, 27, 29, 30) — фаза 3 плана. Его без изменений берут
 * диагностика (4), учебный режим (5) и пробник (7); разница — только в режиме сессии:
 *  - study (Figma 19): без таймера, черновика, инструкции и паузы — только «Выделение» (Math: калькулятор и справочник),
 *    кнопка «Проверить» (если экран дал study.onCheck) и место под «Объяснение» (footerExtra);
 *  - diagnostic: мягкий таймер, инструкция, пауза, помощи нет;
 *  - exam: жёсткий таймер по стене часов, «Скрыть таймер», без паузы и помощи; крестик открывает проверку модуля
 *    (Figma 25), а не выход: модуль закрывается только сдачей, дальше — экран «Модуль завершён» (26).
 * В диагностике и экзамене элементов помощи нет в разметке вовсе, а не спрятаны (AI-08 прототипа).
 *
 * sidePanel — третья колонка справа (объяснение и AI-тьютор учебного режима, Figma 24–25): пока она открыта, Desmos
 * прячется (не размонтируется). overlay — окно поверх экрана (тип ошибки, Figma 23).
 * reviewLabels — { title, finish } окна сдачи, если это не модуль пробника («Проверьте ответы» / «Сдать диагностику»).
 * setLabel — имя набора для окна всех вопросов («Reading and Writing · модуль 1», Figma 30); по умолчанию — title.
 *
 * Состояние целиком — session (src/sat/question/session.js); экран меняет его только через onChange(fn), а хранит
 * и сохраняет — страница. Документы вопросов (docs) — публичный вид бэкенда, без ключей.
 */
export default function QuestionScreen({
  session, onChange, docs, title, subtitle, setLabel, reviewLabels, onExit, onFinish, study, footerExtra, sidePanel, overlay,
}) {
  const { t, lang } = useI18n()
  const [dialog, setDialog] = useState(null) // nav | review | ref | scratch | directions | exit
  const [expanded, setExpanded] = useState(false)
  const passageRef = useRef(null)
  const stemRef = useRef(null)
  const topRef = useRef(null)

  const mode = session.mode
  const isStudy = mode === 'study'
  const q = current(session)
  const doc = docs[q.id]
  const a = answerOf(session, q.id)
  const last = session.index === session.questions.length - 1
  const math = q.section === 'math'
  const paused = session.clock.paused
  const verdict = study?.verdicts?.[q.id]
  // проверен — по вердикту выбора или по слову страницы (у ответа-числа вердикта для вариантов нет)
  const isChecked = !!verdict || !!study?.isChecked?.(q.id)
  const update = useCallback((fn) => onChange((s) => fn(s)), [onChange])

  const go = useCallback((i) => {
    update((s) => goTo(s, i))
    setDialog(null)
    // на телефоне страница прокручивается целиком (на десктопе — только колонка вопроса, она пересоздаётся с
    // вопросом): новый вопрос начинается с шапки, а не с середины прошлого
    const top = topRef.current
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' })
  }, [update])

  const finish = useCallback(() => {
    setDialog(null)
    onFinish?.()
  }, [onFinish])

  // ---- маркер: слушаем документ, а не текст — протяжка, отпущенная над шапкой, иначе оставляла синее выделение ----
  useEffect(() => {
    if (!session.tools.highlight) return undefined
    const onUp = (e) => {
      if (e.target?.closest?.('.ih-dialog, input, textarea, .st-desmos')) return
      const sel = window.getSelection?.()
      let applied = false
      for (const [bucket, ref] of [['p', passageRef], ['s', stemRef]]) {
        const root = ref.current
        if (!root || applied) continue
        const raw = fromSelection(root, sel)
        const r = raw && snap(textOf(root), raw)
        if (!r) continue
        applied = true
        update((s) => setHighlights(s, current(s).id, bucket, merge([...answerOf(s).hl[bucket], r])))
      }
      if (applied || (sel && !sel.isCollapsed)) sel?.removeAllRanges?.()
    }
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)
    return () => {
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchend', onUp)
    }
  }, [session.tools.highlight, update])

  const unmark = (bucket) => (point) => update((s) => setHighlights(s, current(s).id, bucket, removeAt(answerOf(s).hl[bucket], point)))

  // ---- основная кнопка: Проверить → Далее → (последний) Завершить / проверка модуля ----
  const canCheck = isStudy && study?.onCheck && !isChecked
  const primary = () => {
    if (canCheck) {
      if (isAnswered(a)) study.onCheck(q.id)
      return
    }
    if (!last) return go(session.index + 1)
    if (isStudy) return finish()
    setDialog('review')
  }
  const primaryLabel = canCheck ? t('sat.run.check') : last && isStudy ? t('sat.run.finish') : t('sat.run.next')

  // ---- клавиатура: A–D / 1–4 — вариант, M — отметить, Enter — основная кнопка (порт onKey прототипа) ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || dialog || paused) return
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (e.key === 'Enter' && tag === 'input') {
          e.preventDefault()
          primary()
        }
        return
      }
      if (e.target?.closest?.('button, a') && e.key === 'Enter') return
      if (doc?.type === 'mcq' && !isChecked) {
        let idx = KEYS.indexOf(e.key.toUpperCase())
        if (idx < 0 && /^[1-4]$/.test(e.key)) idx = Number(e.key) - 1
        if (idx >= 0) {
          e.preventDefault()
          update((s) => select(s, q.id, KEYS[idx]))
          return
        }
      }
      if (e.key.toUpperCase() === 'M') {
        e.preventDefault()
        update((s) => toggleMark(s, q.id))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        primary()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const exitText = mode === 'exam' && session.clock.wallClock ? t('sat.run.exitExam') : t('sat.run.exitSaved')
  const c = counts(session)
  const passage = doc?.passage

  let body
  if (!doc) body = <p className="st-muted st-q__loading">{t('sat.run.loading')}</p>
  else if (doc.error) body = <p className="st-error" role="alert">{t('sat.run.loadError')}</p>
  else {
    const head = (
      <div className="st-q__head">
        <span className="st-q__num">{session.index + 1}</span>
        <button
          type="button"
          className={`st-mark ${a.marked ? 'is-on' : ''}`}
          aria-pressed={a.marked}
          onClick={() => update((s) => toggleMark(s, q.id))}
        >
          <BookmarkIcon size={14} filled={a.marked} />
          {t(a.marked ? 'sat.run.marked' : 'sat.run.mark')}
        </button>
        <span className="st-spacer" />
        {/* название навыка — подсказка, пока измеряют, поэтому только в учебном режиме (как в прототипе) */}
        {isStudy && study?.skillLabel && <span className="st-q__skill" title={study.skillLabel(doc)}>{study.skillLabel(doc)}</span>}
      </div>
    )
    const stem = (
      <HtmlBlock ref={stemRef} className="st-q__stem" html={doc.stem} ranges={a.hl.s} onMarkTap={unmark('s')} />
    )
    const answer = doc.type === 'spr' ? (
      <SprInput value={a.value} disabled={isChecked} onChange={(v) => update((s) => setValue(s, q.id, v))} />
    ) : (
      <AnswerChoices
        options={doc.options || []}
        value={a.value}
        struck={a.struck}
        verdict={verdict}
        onSelect={(k) => update((s) => select(s, q.id, k))}
        onStrike={(k) => update((s) => toggleStrike(s, q.id, k))}
      />
    )
    const extra = study?.below?.(q.id)
    body = passage ? (
      <div className="st-q__split">
        <section className="st-q__passage">
          <HtmlBlock ref={passageRef} className="st-q__text" html={passage} ranges={a.hl.p} onMarkTap={unmark('p')} />
        </section>
        <section className="st-q__pane">
          {head}
          {stem}
          {answer}
          {extra}
        </section>
      </div>
    ) : (
      <div className={`st-q__single ${doc.type === 'spr' ? 'is-spr' : ''}`}>
        {head}
        {stem}
        {answer}
        {extra}
      </div>
    )
  }

  return (
    <div className={`ih st st-run ${sidePanel ? 'has-panel' : ''}`}>
      <header ref={topRef} className="st-run__top">
        <div className="st-run__left">
          <button type="button" className="ih-round st-run__close" aria-label={t('sat.run.close')} onClick={() => setDialog(mode === 'exam' ? 'review' : 'exit')}>
            <CloseIcon size={20} />
          </button>
          <div className="st-run__title">
            <b>{title}</b>
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
        {/* время в учебном режиме всё равно считается (timeOn) — не показывается (Figma 19) */}
        {isStudy ? <span className="st-spacer" /> : <QuestionTimer session={session} hidden={session.tools.timerHidden} onExpire={mode === 'exam' ? finish : undefined} />}
        <div className="st-run__tools">
          {mode === 'exam' && (
            <button type="button" className="st-tool" aria-pressed={session.tools.timerHidden}
              onClick={() => update((s) => setTool(s, 'timerHidden', !s.tools.timerHidden))}>
              {session.tools.timerHidden ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
              {t(session.tools.timerHidden ? 'sat.run.showTimer' : 'sat.run.hideTimer')}
            </button>
          )}
          {math ? (
            <>
              <button type="button" className={`st-tool ${session.tools.calc ? 'is-on' : ''}`} aria-pressed={session.tools.calc}
                onClick={() => update((s) => setTool(s, 'calc', !s.tools.calc))}>
                <CalculateIcon size={16} />{t('sat.run.calc')}
              </button>
              <button type="button" className="st-tool" onClick={() => setDialog('ref')}>
                <RulerIcon size={16} />{t('sat.run.reference')}
              </button>
              {!isStudy && (
                <button type="button" className="st-tool" onClick={() => setDialog('scratch')}>
                  <NoteIcon size={16} />{t('sat.run.scratch')}
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className={`st-tool ${session.tools.highlight ? 'is-on' : ''}`} aria-pressed={session.tools.highlight}
                title={t('sat.run.highlightHint')}
                onClick={() => update((s) => setTool(s, 'highlight', !s.tools.highlight))}>
                <HighlighterIcon size={16} />{t('sat.run.highlight')}
              </button>
            </>
          )}
          {/* инструкция — везде, кроме учебного режима (Figma 19, 22) */}
          {!isStudy && (
            <button type="button" className="st-tool" onClick={() => setDialog('directions')}>
              <DescriptionIcon size={16} />{t('sat.run.directions')}
            </button>
          )}
          {!session.clock.wallClock && !isStudy && (
            <button type="button" className="st-tool" aria-pressed={paused} onClick={() => update((s) => setPaused(s, !s.clock.paused))}>
              {t(paused ? 'sat.run.resume' : 'sat.run.pause')}
            </button>
          )}
        </div>
      </header>

      <div className="st-run__body">
        <main key={q.id} className="st-run__main ih-enter">
          {/* Нет в Figma: экран паузы — адаптация прототипа question.js (ui.empty «q.paused») */}
          {paused ? (
            <div className="ih-empty st-run__paused">
              <h2>{t('sat.run.pausedTitle')}</h2>
              <p>{t('sat.run.pausedText')}</p>
              <button type="button" className="ih-cta" onClick={() => update((s) => setPaused(s, false))}>{t('sat.run.resume')}</button>
            </div>
          ) : body}
        </main>
        {sidePanel && !paused && <aside className="st-side">{sidePanel}</aside>}
        <DesmosDock
          open={session.tools.calc}
          visible={math && !paused && !sidePanel}
          expanded={expanded}
          onExpand={setExpanded}
          onClose={() => {
            setExpanded(false)
            update((s) => setTool(s, 'calc', false))
          }}
        />
      </div>

      <footer className="st-run__bottom">
        <NavRail session={session} onGo={go} onOpen={() => setDialog('nav')} />
        <span className="st-spacer" />
        {isStudy && footerExtra}
        <button type="button" className="ih-btn ih-btn--outline st-run__back" disabled={session.index === 0} onClick={() => go(session.index - 1)}>
          {t('sat.run.back')}
        </button>
        <button type="button" className="st-run__primary" disabled={paused || (canCheck && !isAnswered(a)) || study?.checking} onClick={primary}>
          {primaryLabel}
        </button>
      </footer>

      {(dialog === 'nav' || dialog === 'review') && (
        <NavDialog
          session={session}
          variant={dialog}
          title={dialog === 'review' ? reviewLabels?.title || t('sat.run.reviewTitle') : t('sat.run.navTitle')}
          finishLabel={reviewLabels?.finish}
          warn={reviewLabels?.warn}
          subtitle={`${setLabel || title} · ${plural(t, lang, 'sat.q', c.total)}`}
          onGo={go}
          onClose={() => setDialog(null)}
          onFinish={finish}
        />
      )}
      {dialog === 'ref' && <SatModal wide title={t('sat.run.reference')} onClose={() => setDialog(null)}><ReferenceSheet /></SatModal>}
      {dialog === 'directions' && (
        <SatModal title={t('sat.run.directions')} onClose={() => setDialog(null)}><Directions section={q.section} exam={mode === 'exam'} /></SatModal>
      )}
      {dialog === 'scratch' && (
        <SatModal title={t('sat.run.scratch')} onClose={() => setDialog(null)}>
          <Scratchpad value={session.scratch} onChange={(v) => update((s) => setScratch(s, v))} />
        </SatModal>
      )}
      {/* Нет в Figma: подтверждение выхода — адаптация прототипа question.js (ui.confirm «q.exitConfirm») */}
      {overlay}
      <ConfirmDialog
        open={dialog === 'exit'}
        title={t('sat.run.exitTitle')}
        text={exitText}
        confirmLabel={t('sat.run.exitConfirm')}
        cancelLabel={t('sat.run.exitCancel')}
        onConfirm={() => {
          setDialog(null)
          onExit?.()
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
