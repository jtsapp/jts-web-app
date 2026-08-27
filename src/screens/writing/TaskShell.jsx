import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { createTaskState, judgeItem } from '../../practice/writing/taskCtl.js'
import { markTask, taskState } from '../../practice/writing/writingProgress.js'
import { noteAnswer, answersFor } from '../../practice/writing/writingStore.js'
import { applyFindings } from '../../practice/writing/localCheck.js'
import { recordSkill } from '../../practice/skillStats.js'

// Общая обвязка заданий тренажёра «Письма»: карточка задания (порт taskShell
// из data/jtswriting.html), развилка судейства (порт TaskCtl.judge/report),
// карточка разбора написанного (checkCard) и итоговая проверка упражнения
// (taskCheckCard). Правильный ответ не показывается нигде — только правило
// и ещё одна попытка; это поведенческий контракт прототипа.

/* Перевод с фолбэком: пока манифест ключей не смержен в общий словарь, t()
   возвращает сам ключ — тогда показываем английскую строку из данных жанра. */
export function tOr(t, key, fallback) {
  const v = t(key)
  return v === key ? fallback : v
}

/* Хук судейства одного задания. Оборачивает чистый judgeItem побочными
   эффектами прототипного TaskCtl.report: журнал ответов (noteAnswer),
   зачёт навыка по ПЕРВОЙ попытке (recordSkill) и markTask по завершении.
   opts.total — переопределение знаменателя (outline-builder судится одним
   пунктом "outline", хотя items у него — блоки плана). */
export function useTaskCtl(genre, task, opts = {}) {
  const total = opts.total ?? (task.items ? task.items.length : 1)
  const [state, setState] = useState(createTaskState)

  const judge = (itemId, ok, detail) => {
    const res = judgeItem(state, itemId, ok)
    if (res.verdict === 'done') return 'done'
    if (res.firstTry) {
      // Рейтинг навыка — только первая попытка, иначе перебор вариантов
      // накручивал бы точность.
      recordSkill('writing', ok)
      if (opts.onFirstTry) opts.onFirstTry(ok)
    }
    const closed = res.verdict === 'correct' || res.verdict === 'failed'
    if (closed && detail) {
      noteAnswer(genre.id, task.id, {
        n: detail.n,
        label: detail.label || 'ITEM',
        your: detail.your || '',
        why: detail.why || '',
        findings: detail.findings || [],
        ok: res.verdict === 'correct',
      })
    }
    if (closed && Object.keys(res.state.answered).length >= total) {
      markTask(genre.id, task.id, res.state.correct, total)
    }
    setState(res.state)
    return res.verdict
  }

  return { state, judge, total }
}

/* Текст отзыва под пунктом по вердикту judgeItem. Ретрай и провал несут
   прототипные приписки «попробуй ещё раз» / «пункт пока не решён». */
export function judgeFeedback(t, verdict, why) {
  if (verdict === 'correct') return { kind: 'ok', head: t('writing.fb.correct'), text: why }
  const note = verdict === 'retry' ? t('writing.fb.tryAgain') : t('writing.fb.lastTry')
  return { kind: 'no', head: t('writing.fb.wrong'), text: (why ? why + ' ' : '') + note }
}

export function FbView({ fb }) {
  if (!fb) return null
  return (
    <div className={'wr-fb wr-fb--' + fb.kind}>
      {fb.head ? <b>{fb.head} </b> : null}
      {fb.text}
      {(fb.lines || []).map((line, i) => (
        <div key={i}>⚠ {line}</div>
      ))}
    </div>
  )
}

export function ItemBox({ n, label, children }) {
  const { t } = useI18n()
  return (
    <div className="wr-item">
      <div className="wr-item-n">{(label || t('writing.label.item')) + ' ' + n}</div>
      {children}
    </div>
  )
}

/* Кольцо прогресса — порт ring() из прототипа (jtswriting.html:9956). */
export function Ring({ percent, color, size = 56, label }) {
  const s = size
  const r = s / 2 - 5
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(1, percent / 100)))
  return (
    <div className="wr-ring" style={{ width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
        <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="var(--wr-line)" strokeWidth="6" />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ stroke: color }}
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
        />
      </svg>
      <b>{label !== undefined ? label : percent + '%'}</b>
    </div>
  )
}

/* Одинаковые находки анализатора сводятся в одну строку со счётчиком —
   ученику нужно правило, а не список одинаковых замечаний (порт groupFindings). */
export function groupFindings(findings) {
  const out = []
  const byKey = {}
  ;(findings || []).forEach((f) => {
    const k = f.original + '→' + f.corrected + '|' + f.why
    if (byKey[k]) {
      byKey[k].times++
      return
    }
    byKey[k] = { original: f.original, corrected: f.corrected, why: f.why, id: f.id, times: 1 }
    out.push(byKey[k])
  })
  return out
}

function FindingLines({ findings }) {
  return groupFindings(findings).map((f, i) => (
    <div key={i}>
      <div className="wr-fixline">
        {f.original ? (
          <>
            <s>{f.original}</s> →{' '}
          </>
        ) : null}
        <b>{f.corrected}</b>
        {f.times > 1 ? <span className="wr-times"> × {f.times}</span> : null}
      </div>
      <div className="wr-whyline">{f.why}</div>
    </div>
  ))
}

/* Карточка разбора написанного учеником (порт checkCard, jtswriting.html:12477):
   каждая находка — «было → стало → почему», в конце текст без ошибок. */
export function CheckCard({ text, findings }) {
  const { t } = useI18n()
  return (
    <div className="wr-checkcard">
      <h4>{t('writing.check.title')}</h4>
      {!findings.length ? (
        <div className="wr-fb wr-fb--ok">
          <b>{t('writing.check.cleanHead')} </b>
          {t('writing.check.cleanBody')}
        </div>
      ) : (
        <>
          <div className="wr-fb wr-fb--no">
            <b>{t('writing.check.foundHead', { n: findings.length })} </b>
            {t('writing.check.foundBody')}
          </div>
          <FindingLines findings={findings} />
          <div className="wr-fixedtext">
            <span className="wr-lb">{t('writing.check.fixedLabel')}</span>
            <div>{applyFindings(text, findings)}</div>
          </div>
        </>
      )}
    </div>
  )
}

/* Итоговая проверка упражнения из журнала ответов (порт taskCheckCard,
   jtswriting.html:12557). Правильный ответ не печатается: только «что ты
   написал» и правило, по которому его найти. */
function TaskReview({ genre, task }) {
  const { t } = useI18n()
  const recs = answersFor(genre.id, task.id)
  if (!recs.length) return null
  const wrong = recs.filter((r) => !r.ok)
  const total = task.items ? task.items.length : recs.length

  if (!wrong.length) {
    return (
      <div className="wr-checkcard">
        <h4>{t('writing.review.title')}</h4>
        <div className="wr-fb wr-fb--ok">
          <b>{t('writing.review.cleanHead')} </b>
          {t('writing.review.cleanBody')}
        </div>
        {recs.length < total ? (
          <div className="wr-whyline">{t('writing.review.left', { n: total - recs.length })}</div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="wr-checkcard">
      <h4>{t('writing.review.title')}</h4>
      <div className="wr-fb wr-fb--no">
        <b>{t('writing.review.wrongHead', { n: wrong.length })} </b>
        {t('writing.review.wrongBody')}
      </div>
      {wrong.map((r, i) => (
        <div key={i} className="wr-errblock">
          <div className="wr-item-n">
            {tOr(t, 'writing.label.' + String(r.label || 'ITEM').toLowerCase(), r.label || 'ITEM') + ' ' + r.n}
          </div>
          {r.your ? (
            <div className="wr-fixline">
              <span className="wr-lb">{t('writing.review.youWrote')}</span>
              <s>{r.your}</s>
            </div>
          ) : null}
          {r.why ? (
            <div>
              <div className="wr-fixline">
                <span className="wr-lb">{t('writing.review.whyWrong')}</span>
              </div>
              <div className="wr-whyline">{r.why}</div>
            </div>
          ) : null}
          <FindingLines findings={r.findings || []} />
        </div>
      ))}
    </div>
  )
}

/* Карточка задания: заголовок, пилюля типа, счёт, howto, пункты, разбор.
   scoreText — переопределение счёта (free-write/overall/guided считают по-своему). */
export default function TaskShell({ genre, task, ctl, scoreText, children }) {
  const { t } = useI18n()
  const st = taskState(genre.id, task.id)
  let score = scoreText
  if (score === undefined) {
    const answeredN = ctl ? Object.keys(ctl.state.answered).length : 0
    if (ctl && answeredN > 0) score = ctl.state.correct + ' / ' + ctl.total
    else if (st) score = st.correct + ' / ' + st.total
    else score = '0 / ' + (task.items ? task.items.length : 1)
  }
  const howto = tOr(t, 'writing.howto.' + task.type, task.howto)
  return (
    <div className="wr-card" id={'task-' + task.id}>
      <div className="wr-taskhead">
        <h3 className="wr-sec-title">{tOr(t, 'writing.taskTitle.' + task.type, task.title)}</h3>
        <span className="wr-pill">{tOr(t, 'writing.taskType.' + task.type, task.type)}</span>
        <span className="wr-pill wr-pill--score">{score}</span>
      </div>
      {howto ? <div className="wr-howto">{howto}</div> : null}
      {children}
      <TaskReview genre={genre} task={task} />
    </div>
  )
}
