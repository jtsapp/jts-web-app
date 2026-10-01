import { useEffect, useMemo, useState } from 'react'
import { getIeltsAttempt } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import PassagePane from '../ielts/reading/PassagePane.jsx'
import ProgressRing from '../ielts/ui/ProgressRing.jsx'
import Chip from '../ielts/ui/Chip.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { CATEGORY_LABEL } from '../ielts/reading/meta.js'
import { locateAnswer, textIndex } from '../ielts/reading/anchor.js'
import { filterRows, formatGiven, reviewRows, reviewSummary, weakCategories, SLOW_SEC } from '../ielts/reading/review.js'
import { formatClock } from '../ielts/reading/run.js'
import { formatDate } from '../ielts/format.js'
import { ChevronLeftIcon, ExpandMoreIcon, FlagIcon, MenuBookIcon, SyncIcon, TimerIcon } from '../ielts/icons.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'
import TranscriptPanel from '../ielts/listening/TranscriptPanel.jsx'
import { useAudioPlayer } from '../ielts/listening/useAudioPlayer.js'
import { totalAudioSec } from '../ielts/listening/listening.js'
import { PlayIcon } from '../components/icons.jsx'

const STATUS_TONE = { ok: 'green', spelling: 'orange', partial: 'orange', wrong: 'red', empty: 'red' }

// Разбор сданной попытки (Figma «7 · Reading — разбор»): текст с маркером ученика слева, справа итог, фильтры и
// вопросы — у раскрытого «ваш ответ / правильный», почему, где ответ в тексте, ловушка и время на вопрос.
// У Listening слева транскрипт части (реплика с ответом подсвечена) и кнопка «Переслушать отрезок», у диктовки —
// пословный разбор фразы.
export default function IeltsReadingReviewPage({ token, target, onExit, onRetry, onToday, onTrainType }) {
  const { t, lang } = useI18n()
  const [state, setState] = useState({ status: 'loading' })
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const [textTab, setTextTab] = useState(0)
  const [focus, setFocus] = useState(null)
  const authToken = token || loadToken()

  useEffect(() => {
    if (!target?.attemptId) return
    let alive = true
    getIeltsAttempt(authToken, target.attemptId)
      .then((a) => alive && setState({ status: 'ready', a }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, target?.attemptId])

  const rows = useMemo(() => (state.a ? reviewRows(state.a) : []), [state.a])

  useEffect(() => {
    if (!target?.attemptId) return
    setIeltsParams({ ieltsAttempt: target.attemptId })
    return () => setIeltsParams({ ieltsAttempt: null })
  }, [target?.attemptId])

  // первым раскрыт первый неверный — с него разбор и начинается
  useEffect(() => {
    if (!rows.length || open) return
    const first = rows.find((r) => r.status !== 'ok') || rows[0]
    setOpen(first.id)
  }, [rows, open])

  const doc = state.a?.document
  const openRow = rows.find((r) => r.id === open)
  const listening = doc?.skill === 'listening'
  const openPart = listening ? (doc.parts || []).find((p) => p.number === openRow?.group?.part) || doc.parts?.[0] : null
  const player = useAudioPlayer({ src: openPart?.audio?.url || null, transcript: null, rules: null })
  useEffect(() => {
    if (!openRow || !doc || listening) return
    const loc = locateAnswer(doc, openRow.item, openRow.group?.text)
    if (loc) {
      setTextTab(Number(loc.key.split(':')[0]))
      setFocus({ ...loc, kind: openRow.status === 'ok' ? 'answer' : 'answer' })
    } else setFocus(null)
  }, [openRow, doc, listening])

  if (state.status !== 'ready') {
    return (
      <div className="ih-run ih-run--empty">
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : (
          <>
            <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.review.missing')} text={t('ieltsReading.errorText')} />
            <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.()}>{t('ieltsReading.back')}</button>
          </>
        )}
      </div>
    )
  }

  const a = state.a
  const s = reviewSummary(a, rows)
  const shown = filterRows(rows, filter)
  const texts = doc.texts || []
  // у Listening «из N минут» — длина записи, у Reading — лимит экзамена
  const limitSec = listening ? Math.max(60, totalAudioSec(doc)) : doc.timeLimitSec || Math.max(1, texts.length) * 1200
  const weak = weakCategories(rows)

  return (
    <div className="ih-run ih-review">
      <header className="ih-run__top">
        <button type="button" className="ih-round" onClick={() => onExit?.(a.testId)} aria-label={t('ieltsReading.back')}>
          <ChevronLeftIcon size={20} />
        </button>
        <div className="ih-run__title">
          <b>{t('ieltsReading.review.title')} · {doc.title}</b>
          <span>{listening ? 'Listening' : 'Reading'} · {t(`ieltsReading.mode.${a.attempt.mode}`)} · {formatDate(a.attempt.finishedAt, lang)}</span>
        </div>
        <span className="ih-run__spacer" />
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => onRetry?.(a.testId)}>
          <span className="ih-btn__icon"><SyncIcon size={16} /></span>
          {t('ieltsReading.review.again')}
        </button>
        <button type="button" className="ih-btn ih-btn--dark" onClick={() => onToday?.()}>{t('ieltsReading.review.toPlan')}</button>
      </header>

      <div className="ih-run__body ih-review__body">
        {listening ? (
          <div className="ih-run__text ih-review__transcript">
            {openPart && (
              <TranscriptPanel
                transcript={openPart.transcript}
                voices={openPart.voices}
                current={-1}
                mark={openRow?.item?.line != null ? openRow.item.line : undefined}
                onSeek={openPart.audio?.url ? (s) => player.playRange(s, null) : null}
              />
            )}
          </div>
        ) : (
        <div className="ih-run__text">
          {texts.length > 1 && (
            <div className="ih-run__texts" role="tablist">
              {texts.map((x, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === textTab} onClick={() => setTextTab(i)}>
                  {doc.kind === 'test' && /^\d+$/.test(x.label || '') ? `Passage ${x.label}` : `${t('ieltsReading.text')} ${x.label || i + 1}`}
                </button>
              ))}
            </div>
          )}
          <PassagePane
            texts={texts.length > 1 ? [texts[textTab]] : texts}
            keyBase={texts.length > 1 ? textTab : 0}
            highlights={a.result?.highlights || []}
            mark={focus}
            focusKey={focus?.key}
            showMarkerBar={false}
          />
        </div>
        )}

        <div className="ih-run__questions ih-review__side">
          {a.outdated && <p className="ih-run__error">{t('ieltsReading.review.outdated')}</p>}
          <section className="ih-card ih-review__sum">
            <div className="ih-review__stats">
              <ProgressRing value={s.raw} max={s.max} size={64} stroke={6} label={`${s.raw}/${s.max}`} />
              <div><b>{s.accuracy} %</b><span>{t('ieltsReading.review.accuracy')}</span></div>
              <div>
                <b>{s.timeSec != null ? formatClock(s.timeSec) : '—'}</b>
                <span>{t('ieltsReading.review.ofMinutes', { n: String(Math.round(limitSec / 60)) })}</span>
              </div>
              <div><b>{s.slow}</b><span>{t('ieltsReading.review.slow', { n: String(SLOW_SEC) })}</span></div>
            </div>
            <p className="ih-review__note">
              {s.band != null ? t('ieltsReading.review.band', { band: s.band.toFixed(1) }) : t('ieltsReading.review.noBand')}
            </p>
          </section>

          <div className="ih-review__filters" role="tablist">
            {[['all', rows.length], ['wrong', s.wrong], ['spelling', s.spelling]].map(([k, n]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>
                {t(`ieltsReading.review.filter.${k}`)} · {n}
              </button>
            ))}
          </div>

          {shown.map((r) => {
            const isOpen = r.id === open
            const v = r.verdict
            const it = r.item
            const right = [...(it.answer || []), ...(it.acceptable || [])].join(' / ')
            const given = formatGiven(r.given)
            const statusLabel = r.status === 'spelling' && given
              ? t('ieltsReading.review.spellingOnly', { given, right: (it.answer || [])[0] || '' })
              : t(`ieltsReading.review.status.${r.status}`)
            if (!isOpen) {
              return (
                <button key={r.id} type="button" className="ih-rv ih-rv--row" onClick={() => setOpen(r.id)}>
                  <span className={`ih-rv__num ih-rv__num--${STATUS_TONE[r.status]}`}>{r.numbers.join('–')}</span>
                  <span className="ih-rv__prompt">{it.prompt}</span>
                  <Chip tone={STATUS_TONE[r.status] === 'red' ? 'red' : STATUS_TONE[r.status]} size="sm">{statusLabel}</Chip>
                  <ExpandMoreIcon size={18} />
                </button>
              )
            }
            const loc = locateAnswer(doc, it, r.group?.text)
            return (
              <article key={r.id} className={`ih-rv ih-rv--open ih-rv--${STATUS_TONE[r.status]}`}>
                <header>
                  <span className={`ih-rv__num ih-rv__num--${STATUS_TONE[r.status]}`}>{r.numbers.join('–')}</span>
                  <b>{it.prompt}</b>
                  <Chip tone={STATUS_TONE[r.status] === 'red' ? 'red' : STATUS_TONE[r.status]} size="sm">{statusLabel}</Chip>
                </header>
                {r.status !== 'ok' && (
                  <div className="ih-rv__answers">
                    <div className="ih-rv__yours"><span>{t('ieltsReading.review.yours')}</span><b>{given || t('ieltsReading.review.noAnswer')}</b></div>
                    <div className="ih-rv__right"><span>{t('ieltsReading.rightAnswer')}</span><b>{right}</b></div>
                  </div>
                )}
                {it.explanation && (
                  <div className="ih-rv__why">
                    <span>{t('ieltsReading.review.why')}</span>
                    <p>{it.explanation[lang] || it.explanation.ru}</p>
                  </div>
                )}
                {v.words && (
                  <div className="ih-dict__words">
                    {v.words.units.map((u, k) => <span key={k} className={`ih-word ih-word--${u.status}`}>{u.text}</span>)}
                    {v.words.extra.map((x, k) => <span key={`x${k}`} className="ih-word ih-word--extra">{x}</span>)}
                  </div>
                )}
                {listening && it.audioStart != null && openPart?.audio?.url && (
                  <button type="button" className="ih-btn ih-btn--soft-violet ih-rv__replay" onClick={() => player.playRange(it.audioStart, it.audioEnd)}>
                    <span className="ih-btn__icon"><PlayIcon size={16} /></span>
                    {t('ieltsListening.replaySegment', { from: String(Math.floor(it.audioStart)), to: String(Math.ceil(it.audioEnd ?? it.audioStart)) })}
                  </button>
                )}
                {it.quote && (
                  <div className="ih-rv__where">
                    <div>
                      <span>{t('ieltsReading.review.where')}{loc?.label ? ` · ${t('ieltsReading.review.paragraph', { p: loc.label })}` : ''}</span>
                      {!listening && (
                        <button type="button" onClick={() => { if (loc) { setTextTab(textIndex(doc, loc.textLabel)); setFocus({ ...loc, at: Date.now() }) } }}>
                          {t('ieltsReading.showInText')}
                        </button>
                      )}
                    </div>
                    <p>«{it.quote}»</p>
                  </div>
                )}
                <div className="ih-rv__chips">
                  {v.trap && r.status !== 'ok' && (
                    <Chip tone="red" size="sm" icon={<FlagIcon size={14} />}>{t('ieltsReading.review.trap')}: {t(`ieltsReading.trap.${v.trap}`)}</Chip>
                  )}
                  {v.timeSec != null && <Chip tone="muted" size="sm" icon={<TimerIcon size={14} />}>{t('ieltsReading.review.perQuestion', { n: String(v.timeSec) })}</Chip>}
                </div>
              </article>
            )
          })}

          {weak.length > 0 && (
            <div className="ih-review__weak">
              <span>{t('ieltsReading.review.trainWeak')}</span>
              {weak.slice(0, 3).map((c) => (
                <button key={c} type="button" className="ih-chip ih-chip--violet ih-chip--md ih-chip--action" onClick={() => onTrainType?.(c)}>
                  {CATEGORY_LABEL[c] || c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
