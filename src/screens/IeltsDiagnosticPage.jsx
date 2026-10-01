import { useCallback, useEffect, useRef, useState } from 'react'
import { getIeltsDiagnosticPath, startIeltsDiagnostic, submitIeltsDiagnostic } from '../api.js'
import { loadToken } from '../lib/session.js'
import { stopTts, unlockSpeech } from '../lib/speech.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import ConfirmDialog from '../ielts/ui/ConfirmDialog.jsx'
import DiagQuestion from '../ielts/diagnostic/DiagQuestion.jsx'
import DiagClipPlayer from '../ielts/diagnostic/DiagClipPlayer.jsx'
import PassagePane from '../ielts/reading/PassagePane.jsx'
import { addHighlight } from '../ielts/reading/highlights.js'
import { useRecorder } from '../ielts/speaking/useRecorder.js'
import { formatSec } from '../ielts/speaking/speaking.js'
import { countWords } from '../ielts/writing/writing.js'
import { CloseIcon, HeadphonesIcon, MicIcon, TimerIcon } from '../ielts/icons.jsx'

const BLOCKS = ['listening', 'reading', 'writing', 'speaking']
const DRAFT = 'jts_ielts_diag_draft'

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT) || 'null')
  } catch {
    return null
  }
}
function saveDraft(d) {
  try {
    localStorage.setItem(DRAFT, JSON.stringify(d))
  } catch {
    /* без хранилища диагностика просто не переживёт перезагрузку */
  }
}
function dropDraft() {
  try {
    localStorage.removeItem(DRAFT)
  } catch {
    /* нечего чистить */
  }
}

/**
 * Диагностика (ТЗ §10, прототип 02-diagnostic): четыре блока подряд — Listening (клип слота выбирает сервер по
 * ответам на предыдущие слоты), Reading своего трека, Writing (эссе) и Speaking (ответы Part 1 и монолог). Проверяет
 * бэкенд; Writing и Speaking в диагностике не оцениваются (ждут ИИ), записи Speaking остаются в браузере — на сервер
 * уходит только длительность ответов. Черновик — на устройстве: перезагрузка не сбрасывает пройденное.
 */
export default function IeltsDiagnosticPage({ token, target, onExit, onDone }) {
  const { t, lang } = useI18n()
  const P = useCallback((k, v) => t(`ieltsOb.p.diag.${k}`, v), [t])
  const authToken = token || loadToken()
  const rec = useRecorder()
  const [state, setState] = useState({ status: 'loading' })
  const [d, setD] = useState(null) // { formId, level, module, block, slotIdx, path, answers, writing, speakingSec, startedAt }
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [recId, setRecId] = useState(null)
  const takes = useRef({})
  const [, force] = useState(0)

  useEffect(() => {
    let alive = true
    startIeltsDiagnostic(authToken, { level: target?.level, module: target?.module })
      .then((s) => {
        if (!alive) return
        const old = loadDraft()
        const keep = old && old.formId === s.formId && old.level === s.level && old.module === s.module
        setD(keep ? old : { formId: s.formId, level: s.level, module: s.module, block: null, slotIdx: 0, path: {}, answers: {}, writing: '', speakingSec: {}, startedAt: new Date().toISOString() })
        setState({ status: 'ready', start: s })
      })
      .catch((e) => alive && setState({ status: e?.status === 401 ? 'guest' : 'error' }))
    return () => {
      alive = false
      stopTts()
    }
  }, [authToken, target?.level, target?.module])

  const update = (patch) =>
    setD((cur) => {
      const next = { ...cur, ...patch }
      saveDraft(next)
      return next
    })

  if (state.status !== 'ready' || !d)
    return (
      <div className="ih-run ih-run--empty">
        {state.status === 'loading' ? (
          <p className="ih-muted">{t('ieltsReading.loading')}</p>
        ) : (
          <>
            <EmptyState icon={<HeadphonesIcon size={28} />} title={t(state.status === 'guest' ? 'ieltsReading.guestTitle' : 'ieltsReading.errorTitle')} text={t(state.status === 'guest' ? 'ieltsReading.guestText' : 'ieltsReading.errorText')} />
            <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.()}>{t('ieltsReading.back')}</button>
          </>
        )}
      </div>
    )

  const form = state.start.form
  const cfg = form.levels[d.level]
  const slots = cfg.listening.slots
  const blockIdx = BLOCKS.indexOf(d.block)

  const answer = (id, v) => update({ answers: { ...d.answers, [id]: v } })

  const askPath = async (answers) => getIeltsDiagnosticPath(authToken, { formId: d.formId, level: d.level, answers })

  const beginBlock = async (block) => {
    setError(null)
    if (block === 'listening') {
      unlockSpeech()
      setBusy(true)
      try {
        update({ block, slotIdx: 0, path: await askPath(d.answers) })
      } catch {
        setError(t('ieltsReading.errorText'))
      }
      setBusy(false)
    } else update({ block })
  }

  const nextBlock = () => {
    stopTts()
    const i = BLOCKS.indexOf(d.block)
    if (i + 1 < BLOCKS.length) update({ block: `${BLOCKS[i + 1]}-intro` })
    else setConfirm(true)
  }

  const nextSlot = async () => {
    stopTts()
    if (d.slotIdx + 1 >= slots.length) return nextBlock()
    setBusy(true)
    try {
      // следующий клип зависит от ответов на этот — сервер считает по ответам, ключей у экрана нет
      update({ slotIdx: d.slotIdx + 1, path: await askPath(d.answers) })
    } catch {
      setError(t('ieltsReading.errorText'))
    }
    setBusy(false)
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const v = await submitIeltsDiagnostic(authToken, {
        formId: d.formId,
        level: d.level,
        module: d.module,
        answers: d.answers,
        writingText: d.writing,
        speakingSec: d.speakingSec,
        timeSec: Math.round((Date.now() - new Date(d.startedAt).getTime()) / 1000),
        startedAt: d.startedAt,
        device: typeof window !== 'undefined' && window.innerWidth < 760 ? 'mobile' : 'desktop',
      })
      dropDraft()
      onDone?.(v.attempt.id)
    } catch (e) {
      setError(e?.message || t('ieltsReading.submitError'))
      setBusy(false)
      setConfirm(false)
    }
  }

  const record = (id, maxSec) => {
    if (rec.state === 'recording') return rec.stop()
    setRecId(id)
    rec.start({
      maxSec,
      onDone: (take) => {
        if (!take) return
        takes.current[id] = take
        // запись кончается позже нажатия — черновик берём текущий, а не тот, что был при старте записи
        setD((cur) => {
          const next = { ...cur, speakingSec: { ...cur.speakingSec, [id]: take.durationSec } }
          saveDraft(next)
          return next
        })
        force((x) => x + 1)
      },
    })
  }

  // ---------------------------------------------------------------- разметка блоков
  let body
  if (!d.block) {
    body = (
      <section className="ih-card ih-diag__intro">
        <span className="ih-chip ih-chip--violet ih-chip--md"><span>{P(`level.${d.level}`)}</span></span>
        <h2>{P('intro.title')}</h2>
        <p>{P(`level.${d.level}Hint`)}</p>
        <ul className="ih-diag__blocks">
          {BLOCKS.map((b) => (
            <li key={b}><b>{P(`block.${b}`)}</b><span>{t('ieltsWriting.minutes', { n: String(cfg[b].minutes) })}</span></li>
          ))}
        </ul>
        <p className="ih-muted">{P('intro.honest')}</p>
        <button type="button" className="ih-cta" onClick={() => update({ block: 'listening-intro' })}>{P('intro.start')}</button>
      </section>
    )
  } else if (d.block.endsWith('-intro')) {
    const b = d.block.replace('-intro', '')
    body = (
      <section className="ih-card ih-diag__intro">
        <span className="ih-chip ih-chip--violet ih-chip--md"><span>{P('block.stepOf', { n: String(BLOCKS.indexOf(b) + 1), total: '4' })}</span></span>
        <h2>{P(`block.${b}`)}</h2>
        <p>{P(`block.intro.${b}`)}</p>
        {error && <p className="ih-run__error" role="alert">{error}</p>}
        <button type="button" className="ih-cta" onClick={() => beginBlock(b)} disabled={busy}>{P('block.start')}</button>
      </section>
    )
  } else if (d.block === 'listening') {
    const slotNo = slots[d.slotIdx]
    const slot = form.listening.slots.find((s) => s.slot === slotNo)
    const clip = slot?.clips.find((c) => c.id === d.path[String(slotNo)]) || slot?.clips[0]
    const take = cfg.listening.take?.[String(slotNo)] ?? clip.items.length
    const offset = slots.slice(0, d.slotIdx).reduce((a, s) => {
      const sl = form.listening.slots.find((x) => x.slot === s)
      const c = sl.clips.find((x) => x.id === d.path[String(s)]) || sl.clips[0]
      return a + (cfg.listening.take?.[String(s)] ?? c.items.length)
    }, 0)
    body = (
      <section className="ih-card ih-diag__clip ih-skin-listening">
        <span className="ih-chip ih-chip--violet ih-chip--md"><span>{P('block.clip', { n: String(d.slotIdx + 1), total: String(slots.length) })}</span></span>
        <p className="ih-muted" lang="en">{clip.context}</p>
        <DiagClipPlayer
          key={clip.id}
          clip={clip}
          mode={cfg.listening.mode}
          nQuestions={Math.min(take, clip.items.length)}
          played={!!d.played?.[clip.id]}
          onPlayed={() => update({ played: { ...(d.played || {}), [clip.id]: true } })}
        />
        {cfg.listening.mode === 'exam' && <p className="ih-muted">{P('block.playOnce')}</p>}
        {clip.instruction && <p className="ih-dq__ins" lang="en">{clip.instruction}</p>}
        {clip.items.slice(0, take).map((it, i) => (
          <DiagQuestion key={it.id} n={offset + i + 1} item={it} value={d.answers[it.id]} onChange={(v) => answer(it.id, v)} />
        ))}
        {error && <p className="ih-run__error" role="alert">{error}</p>}
        <div className="ih-diag__next">
          <button type="button" className="ih-cta" onClick={nextSlot} disabled={busy}>{d.slotIdx + 1 < slots.length ? P('block.nextClip') : P('block.finish')}</button>
        </div>
      </section>
    )
  } else if (d.block === 'reading') {
    const task = form.reading[d.module === 'general' ? 'general' : 'academic']
    const items = cfg.reading.light ? task.items.filter((i) => task.lightItems.includes(i.id)) : task.items
    // Текст — тем же PassagePane, что в тренажёре: маркер трёх цветов и выделение, как на компьютерном IELTS.
    // У GT текстов несколько, строки «## …» — подзаголовки внутри текста, в абзац они идут жирной подписью.
    const texts = task.paragraphs
      ? [{ title: task.title, paragraphs: task.paragraphs }]
      : (task.texts || []).map((x) => ({
          label: x.label,
          title: x.title,
          paragraphs: (x.body || []).map((line) => (line.startsWith('## ') ? { label: line.slice(3), text: '' } : { text: line })),
        }))
    const highlights = d.highlights || []
    body = (
      <div className="ih-diag__reading">
        <section className="ih-card ih-diag__text" lang="en">
          <PassagePane
            texts={texts}
            highlights={highlights}
            onHighlight={(h) => update({ highlights: addHighlight(highlights, h) })}
            onClearAll={() => update({ highlights: [] })}
            noCopy
          />
        </section>
        <section className="ih-card ih-diag__questions">
          {items.map((it, i) => (
            <div key={it.id}>
              {it.instruction && (i === 0 || items[i - 1].instruction !== it.instruction) && <p className="ih-dq__ins" lang="en">{it.instruction}</p>}
              <DiagQuestion n={i + 1} item={it} value={d.answers[it.id]} onChange={(v) => answer(it.id, v)} headings={task.headings} />
            </div>
          ))}
          <div className="ih-diag__next">
            <button type="button" className="ih-cta" onClick={nextBlock}>{P('block.finish')}</button>
          </div>
        </section>
      </div>
    )
  } else if (d.block === 'writing') {
    const words = countWords(d.writing)
    body = (
      <section className="ih-card ih-diag__writing">
        <span className="ih-chip ih-chip--violet ih-chip--md"><span>Writing · Task 2</span></span>
        <p className="ih-wtask__box" lang="en">{form.writing.question}</p>
        <p className="ih-muted">{P('writing.target', { n: String(cfg.writing.words) })}</p>
        <textarea className="ih-wrun__text" lang="en" spellCheck={false} value={d.writing} onChange={(e) => update({ writing: e.target.value })} onPaste={(e) => e.preventDefault()} aria-label={P('writing.editorLabel')} />
        <div className="ih-wrun__bar">
          <b>{words}</b>
          <span>{t('ieltsWriting.wordsNeed', { n: String(cfg.writing.words) })}</span>
          <span className="ih-run__spacer" />
          <span className="ih-muted">{t('ieltsWriting.pasteOff')}</span>
        </div>
        <div className="ih-diag__next">
          <button type="button" className="ih-cta" onClick={nextBlock}>{P('block.finish')}</button>
        </div>
      </section>
    )
  } else if (d.block === 'speaking') {
    const sp = form.speaking
    const qs = sp.part1.slice(0, cfg.speaking.part1)
    const row = (id, label, maxSec) => {
      const on = rec.state === 'recording' && recId === id
      return (
        <div key={id} className="ih-diag__sq">
          <p lang="en">{label}</p>
          <div className="ih-srec__row">
            <button type="button" className={`ih-btn ${on ? 'ih-btn--dark' : 'ih-btn--rec'}`} onClick={() => record(id, maxSec)} disabled={rec.state !== 'idle' && !on}>
              <MicIcon size={16} />{on ? `${t('ieltsSpeaking.stop')} · ${formatSec(rec.elapsed)} / ${formatSec(maxSec)}` : d.speakingSec[id] ? t('ieltsSpeaking.retake') : t('ieltsSpeaking.answer')}
            </button>
            {takes.current[id] && <audio controls src={takes.current[id].url} />}
            {!takes.current[id] && d.speakingSec[id] && <span className="ih-muted">{formatSec(d.speakingSec[id])}</span>}
          </div>
        </div>
      )
    }
    body = (
      <section className="ih-card ih-diag__speaking">
        <h3>Part 1</h3>
        {qs.map((q) => row(q.id, q.text, cfg.speaking.answerSec))}
        <h3>Part 2</h3>
        <div className="ih-cue" lang="en">
          <h3>{sp.cueCard.topic}</h3>
          <p className="ih-muted">You should say:</p>
          <ul>{sp.cueCard.points.map((x) => <li key={x}>{x}</li>)}</ul>
          <p>{sp.cueCard.explain}</p>
        </div>
        <p className="ih-muted">{P('speaking.prepHint', { n: String(cfg.speaking.prepSec) })}</p>
        {row(sp.cueCard.id, P('speaking.mono'), cfg.speaking.monologueSec)}
        {rec.error && <p className="ih-run__error" role="alert">{t(`ieltsSpeaking.micError.${rec.error}`)}</p>}
        <p className="ih-muted">{t('ieltsSpeaking.privacyLocal')}</p>
        <div className="ih-diag__next">
          <button type="button" className="ih-cta" onClick={() => setConfirm(true)} disabled={rec.state !== 'idle'}>{P('block.finish')}</button>
        </div>
      </section>
    )
  }

  const current = d.block ? d.block.replace('-intro', '') : null
  return (
    <div className="ih-run ih-diag" lang={lang}>
      <header className="ih-run__top">
        <button type="button" className="ih-round" onClick={() => { rec.stop(); stopTts(); onExit?.() }} aria-label={t('ieltsReading.close')}>
          <CloseIcon size={20} />
        </button>
        <div className="ih-run__title">
          <b>{P('title')}</b>
          <span>{P(`level.${d.level}`)} · {d.module === 'general' ? 'General Training' : 'Academic'}</span>
        </div>
        <span className="ih-run__spacer" />
        <ol className="ih-sstep">
          {BLOCKS.map((b, i) => (
            <li key={b} className={blockIdx > i || (current && BLOCKS.indexOf(current) > i) ? 'is-done' : current === b ? 'is-on' : ''}>
              <span>{i + 1}</span>{P(`block.${b}`)}
            </li>
          ))}
        </ol>
        <span className="ih-run__spacer" />
        {current && cfg[current] && <span className="ih-run__clock"><TimerIcon size={18} />{t('ieltsWriting.minutes', { n: String(cfg[current].minutes) })}</span>}
      </header>
      <main className="ih-diag__body">{body}</main>
      <ConfirmDialog
        open={confirm}
        title={P('block.finishTitle')}
        text={P('block.finishTextAll')}
        confirmLabel={P('block.finish')}
        cancelLabel={t('ieltsReading.cancel')}
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
      {error && confirm === false && d.block === 'speaking' && <p className="ih-run__error" role="alert">{error}</p>}
    </div>
  )
}
