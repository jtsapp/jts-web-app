import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { checkIeltsAnswer, getIeltsTest, submitIeltsAttempt } from '../api.js'
import { loadToken } from '../lib/session.js'
import { translateWord } from '../lib/wordTranslate.js'
import { saveReadingKeyword } from '../practice/reading/saveKeyword.js'
import { useI18n } from '../i18n.jsx'
import PassagePane from '../ielts/reading/PassagePane.jsx'
import QuestionGroup from '../ielts/reading/QuestionGroup.jsx'
import ConfirmDialog from '../ielts/ui/ConfirmDialog.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { addHighlight } from '../ielts/reading/highlights.js'
import { locateAnswer, textIndex } from '../ielts/reading/anchor.js'
import { mechanicOf } from '../ielts/reading/meta.js'
import { partLabel } from '../ielts/reading/ReadingTaskView.jsx'
import {
  answeredCount, createRun, dropDraft, flattenItems, formatClock, isAnswered, loadDraft, moveTo, remainingSec,
  resumeDraft, saveDraft, setAnswer, submitBody, toggleFlag,
} from '../ielts/reading/run.js'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, MenuBookIcon, TimerIcon } from '../ielts/icons.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'

// Прохождение теста Reading (Figma «6 · Reading — экзамен»): режим фокуса без меню платформы — текст слева,
// вопросы справа, сетка номеров снизу. Режим: exam — таймер, без подсказок, проверка только при сдаче;
// practice — «Проверить» по одному вопросу; study — вердикт и место в тексте сразу после ответа.
// Ключей у страницы нет: каждый вердикт приходит с сервера.
export default function IeltsReadingRunPage({ token, target, onExit, onReview }) {
  const { t } = useI18n()
  const testId = target?.testId
  const [state, setState] = useState({ status: 'loading' })
  const [run, setRun] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [textTab, setTextTab] = useState(0)
  const [pane, setPane] = useState('questions')
  const [focus, setFocus] = useState(null)
  const [checking, setChecking] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [big, setBig] = useState(false)
  const submittedRef = useRef(false)
  const authToken = token || loadToken()

  useEffect(() => {
    if (!testId) return
    let alive = true
    getIeltsTest(authToken, testId)
      .then((r) => {
        if (!alive) return
        const doc = r.document
        const draft = loadDraft(testId)
        // черновик продолжаем только в том же режиме: сменил режим на экране задания — новая попытка
        const mode = target?.mode || draft?.mode || 'practice'
        setRun(draft && draft.mode === mode ? resumeDraft(draft) : createRun(doc, mode))
        setState({ status: 'ready', doc, test: r.test })
      })
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, testId, target?.mode])

  const items = useMemo(() => (state.doc ? flattenItems(state.doc) : []), [state.doc])

  // тест и режим — в адресе: F5 посреди экзамена открывает тот же тест с тем же черновиком
  useEffect(() => {
    if (!run) return
    setIeltsParams({ ieltsRun: run.testId, ieltsMode: run.mode })
    return () => setIeltsParams({ ieltsRun: null, ieltsMode: null })
  }, [run?.testId, run?.mode])

  // черновик на устройстве после каждого изменения — закрытая вкладка не теряет ответы
  useEffect(() => {
    if (run && !submittedRef.current) saveDraft(run)
  }, [run])

  const submit = useCallback(async () => {
    if (!run || submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      const device = window.innerWidth < 900 ? 'mobile' : 'desktop'
      const res = await submitIeltsAttempt(authToken, run.testId, submitBody(run, Date.now(), device))
      dropDraft(run.testId)
      onReview?.(res.attempt.id)
    } catch {
      submittedRef.current = false
      setError(t('ieltsReading.submitFailed'))
    } finally {
      setSubmitting(false)
      setConfirm(false)
    }
  }, [run, authToken, onReview, t])

  // часы экзамена: тикают раз в секунду; вышло время — сдаём сами (как на экзамене)
  useEffect(() => {
    if (!run?.endsAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [run?.endsAt])
  const left = run ? remainingSec(run, now) : null
  // Остаток экзамена «замораживается» по времени последнего сохранения черновика — поэтому сохраняем и на ходу
  // (раз в 10 секунд), и при уходе со страницы: иначе тишина без ответов вернулась бы ученику лишним временем.
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    if (run?.endsAt && left != null && left % 10 === 0 && !submittedRef.current) saveDraft(run)
  }, [left]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const flush = () => runRef.current && !submittedRef.current && saveDraft(runRef.current)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [])
  useEffect(() => {
    if (left === 0) submit()
  }, [left, submit])

  // полный тест: текст переключается на тот, к которому относится текущий вопрос
  const currentEntry = items.find((x) => x.id === run?.current)
  useEffect(() => {
    if (currentEntry?.group?.text && state.doc) setTextTab(textIndex(state.doc, currentEntry.group.text))
  }, [currentEntry?.group?.text, state.doc])

  if (!testId || state.status === 'missing' || state.status === 'error') {
    return (
      <div className="ih-run ih-run--empty">
        <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.(testId)}>{t('ieltsReading.back')}</button>
      </div>
    )
  }
  if (state.status === 'loading' || !run) return <div className="ih-run ih-run--empty"><p className="ih-muted">{t('ieltsReading.loading')}</p></div>

  const { doc, test } = state
  const mode = run.mode
  const texts = doc.texts || []
  const shownTexts = texts.length > 1 ? [texts[textTab]] : texts
  const done = answeredCount(run, items)

  const answer = (id, v) => {
    setRun((r) => setAnswer(r, id, v))
    // «Разбор»: вердикт сразу после ответа — у выбора варианта ответ готов в момент клика
    const entry = items.find((x) => x.id === id)
    if (mode === 'study' && entry && mechanicOf(entry.type) !== 'gap' && mechanicOf(entry.type) !== 'multi' && isAnswered(v)) check(id, v)
  }

  async function check(id, given = run.answers[id]) {
    if (!isAnswered(given)) return
    setChecking(id)
    try {
      const res = await checkIeltsAnswer(authToken, run.testId, id, given)
      setRun((r) => ({ ...r, checked: { ...r.checked, [id]: res } }))
      if (mode === 'study') showInText(res, id)
    } catch {
      setError(t('ieltsReading.checkFailed'))
    } finally {
      setChecking(null)
    }
  }

  function showInText(result, id = run.current) {
    const entry = items.find((x) => x.id === (result?.itemId || id))
    const loc = locateAnswer(doc, result?.reveal, entry?.group?.text)
    if (!loc) return
    const ti = Number(loc.key.split(':')[0])
    setTextTab(ti)
    setFocus({ ...loc, at: Date.now() })
    setPane('text')
  }

  const go = (delta) => {
    const i = items.findIndex((x) => x.id === run.current)
    const next = items[Math.min(items.length - 1, Math.max(0, i + delta))]
    if (!next) return
    setRun((r) => moveTo(r, next.id))
    document.getElementById(`ih-q-${next.id}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    setPane('questions')
  }

  const saveWord = async (word) => {
    const ru = await translateWord(word, 'ru').catch(() => null)
    return saveReadingKeyword(authToken, { en: word, ru: typeof ru === 'string' ? ru : ru?.translation }, 'ielts-reading')
  }

  const groups = (doc.groups || []).map((g, gi) => ({ g, entries: items.filter((x) => x.groupIndex === gi) }))
  const unanswered = items.length - done

  return (
    <div className={`ih-run ${big ? 'ih-run--big' : ''}`} data-mode={mode}>
      <header className="ih-run__top">
        <button type="button" className="ih-round" onClick={() => onExit?.(run.testId)} aria-label={t('ieltsReading.close')}>
          <CloseIcon size={20} />
        </button>
        <div className="ih-run__title">
          <b>Reading{partLabel(test, doc) ? ` · ${partLabel(test, doc)}` : ''}</b>
          <span>{t(`ieltsReading.mode.${mode}`)} · {test.title}</span>
        </div>
        <span className="ih-run__spacer" />
        <span className={`ih-run__clock ${left != null && left <= 300 ? 'is-low' : ''}`} role="timer" aria-live="off">
          <TimerIcon size={18} />
          {left != null ? formatClock(left) : t('ieltsReading.noTimer')}
        </span>
        <span className="ih-run__spacer" />
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => setBig((v) => !v)} aria-pressed={big} title={t('ieltsReading.fontSize')}>
          Aa
        </button>
        <button type="button" className="ih-btn ih-btn--dark" onClick={() => setConfirm(true)}>
          {mode === 'exam' ? t('ieltsReading.submit') : t('ieltsReading.finish')}
        </button>
      </header>

      <div className="ih-run__switch" role="tablist" hidden={texts.length === 0}>
        <button type="button" role="tab" aria-selected={pane === 'text'} onClick={() => setPane('text')}>{t('ieltsReading.paneText')}</button>
        <button type="button" role="tab" aria-selected={pane === 'questions'} onClick={() => setPane('questions')}>
          {t('ieltsReading.paneQuestions')} · {done}/{items.length}
        </button>
      </div>

      {/* у дриллов «keyword» и «timing» текста нет — материал в самих вопросах, панель текста не нужна */}
      <div className="ih-run__body" data-pane={pane} data-notext={texts.length === 0 || undefined}>
        <div className="ih-run__text">
          {texts.length > 1 && (
            <div className="ih-run__texts" role="tablist">
              {texts.map((x, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === textTab} onClick={() => setTextTab(i)}>
                  {test.kind === 'test' && x.label && /^\d+$/.test(x.label) ? `Passage ${x.label}` : `${t('ieltsReading.text')} ${x.label || i + 1}`}
                </button>
              ))}
            </div>
          )}
          <PassagePane
            texts={shownTexts}
            keyBase={texts.length > 1 ? textTab : 0}
            highlights={run.highlights}
            onHighlight={(h) => setRun((r) => ({ ...r, highlights: addHighlight(r.highlights, h) }))}
            onClearAll={() => setRun((r) => ({ ...r, highlights: r.highlights.filter((h) => texts.length > 1 && !h.key.startsWith(`${textTab}:`)) }))}
            onSaveWord={mode === 'exam' ? null : saveWord}
            mark={focus}
            focusKey={focus?.key}
            noCopy={mode === 'exam'}
          />
        </div>
        <div className="ih-run__questions">
          {error && <p className="ih-run__error" role="alert">{error}</p>}
          {groups.map(({ g, entries }) => (
            <QuestionGroup
              key={g.id || entries[0]?.id}
              group={g}
              entries={entries}
              doc={doc}
              run={run}
              mode={mode}
              checking={checking}
              onAnswer={answer}
              onFlag={(id) => setRun((r) => toggleFlag(r, id))}
              onCheck={(id) => check(id)}
              onShowInText={(res) => showInText(res)}
              onFocus={(id) => setRun((r) => moveTo(r, id))}
            />
          ))}
        </div>
      </div>

      <nav className="ih-run__nav" aria-label={t('ieltsReading.questionsNav')}>
        <b className="ih-run__navlabel">{partLabel(test, doc) || 'Reading'}</b>
        <div className="ih-run__nums">
          {items.map((x) => {
            const on = isAnswered(run.answers[x.id])
            const cur = run.current === x.id
            const ch = run.checked[x.id]
            return (
              <button
                key={x.id}
                type="button"
                className={`ih-num ${on ? 'is-answered' : ''} ${cur ? 'is-current' : ''} ${ch ? (ch.correct ? 'is-ok' : 'is-bad') : ''}`}
                onClick={() => {
                  setRun((r) => moveTo(r, x.id))
                  setPane('questions')
                  document.getElementById(`ih-q-${x.id}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
                }}
                aria-label={`${t('ieltsReading.question')} ${x.numbers.join('–')}`}
              >
                {x.numbers.length > 1 ? `${x.numbers[0]}–${x.numbers.at(-1)}` : x.numbers[0]}
                {run.flags[x.id] && <i className="ih-num__flag" />}
              </button>
            )
          })}
        </div>
        <span className="ih-run__answered">{t('ieltsReading.answeredOf', { n: String(done), total: String(items.length) })}</span>
        <button type="button" className="ih-round" onClick={() => go(-1)} aria-label={t('ieltsReading.prev')}><ChevronLeftIcon size={20} /></button>
        <button type="button" className="ih-round" onClick={() => go(1)} aria-label={t('ieltsReading.next')}><ChevronRightIcon size={20} /></button>
      </nav>

      <ConfirmDialog
        open={confirm}
        title={t('ieltsReading.confirmTitle')}
        text={unanswered ? t('ieltsReading.confirmUnanswered', { n: String(unanswered) }) : t('ieltsReading.confirmAll')}
        confirmLabel={mode === 'exam' ? t('ieltsReading.submit') : t('ieltsReading.finish')}
        cancelLabel={t('ieltsReading.cancel')}
        busy={submitting}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
