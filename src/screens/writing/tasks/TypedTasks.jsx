import { useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { textMatch, punctMatch, punctPrompt } from '../../../practice/writing/engine.js'
import { analyseText } from '../../../practice/writing/localCheck.js'
import TaskShell, { useTaskCtl, judgeFeedback, FbView, ItemBox, CheckCard } from '../TaskShell.jsx'

// Задания со свободным вводом: transform (порт rTransform, jtswriting.html:10745),
// punctuation (rPunctuation, 10822) и expand (rExpand, 10854). Общий пункт —
// TypedItem: поле, кнопка «Проверить», отзыв и карточка разбора написанного
// (analyseText по предложению целиком, как checkCard прототипа).

function TypedItem({ idx, item, ctl, meta, rows, placeholder, computeOk, children }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [fb, setFb] = useState(null)
  const [checked, setChecked] = useState(null) // {text, findings} последней проверки
  const [lastOk, setLastOk] = useState(null)
  const inputRef = useRef(null)
  const closed = ctl.state.answered[item.id] !== undefined

  // Пустой ввод — не попытка: раньше «Проверить», Enter или «Go» на телефоне
  // по пустому полю тратили одну из трёх попыток, и после трёх нажатий пункт
  // закрывался «не решён», а верный ответ было уже не ввести.
  const empty = !value.trim()
  const onCheck = () => {
    if (closed || empty) return
    const res = computeOk(value)
    // Разбор самого написанного — независимо от вердикта: ученик сразу видит
    // языковые огрехи в собственном предложении.
    const findings = analyseText(value, { rules: meta.rules, wholeSentence: true })
    const verdict = ctl.judge(item.id, res.ok, {
      n: idx + 1,
      your: value.trim(),
      why: item.why,
      findings,
    })
    if (verdict === 'done') return
    setLastOk(res.ok)
    setFb(judgeFeedback(t, verdict, res.msg))
    setChecked({ text: value, findings })
    if (verdict === 'retry' && inputRef.current) inputRef.current.focus()
  }

  const cls = 'wr-inp' + (lastOk === null ? '' : lastOk ? ' is-ok' : ' is-no')
  return (
    <ItemBox n={idx + 1}>
      {children}
      {rows ? (
        <textarea
          ref={inputRef}
          className={cls}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={closed}
        />
      ) : (
        <input
          ref={inputRef}
          className={cls}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={closed}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCheck()
          }}
        />
      )}
      <div className="wr-row">
        <button type="button" className="wr-primary wr-btn-sm" disabled={closed || empty} onClick={onCheck}>
          {t('writing.checkBtn')}
        </button>
      </div>
      <FbView fb={fb} />
      {checked ? <CheckCard text={checked.text} findings={checked.findings} /> : null}
    </ItemBox>
  )
}

/* ── 2. transform: перепиши по подсказке (textMatch: answers|must/avoid) ── */
export function TransformTask({ genre, task, meta, onFirstTry }) {
  const { t } = useI18n()
  const ctl = useTaskCtl(genre, task, { onFirstTry })
  return (
    <TaskShell genre={genre} task={task} ctl={ctl}>
      {task.items.map((item, idx) => (
        <TypedItem
          key={item.id}
          idx={idx}
          item={item}
          ctl={ctl}
          meta={meta}
          placeholder={t('writing.transform.placeholder')}
          computeOk={(v) => ({ ok: textMatch(v, item), msg: item.why })}
        >
          <div className="wr-row">
            <span className="wr-pill">{item.cue}</span>
          </div>
          <div className="wr-src">{item.src}</div>
        </TypedItem>
      ))}
    </TaskShell>
  )
}

/* ── 4. punctuation: точное совпадение с эталоном (капс и знаки — суть
      задания, поэтому НЕ textMatch, а сравнение со схлопнутыми пробелами). ── */
export function PunctuationTask({ genre, task, meta, onFirstTry }) {
  const { t } = useI18n()
  const ctl = useTaskCtl(genre, task, { onFirstTry })
  return (
    <TaskShell genre={genre} task={task} ctl={ctl}>
      {task.items.map((item, idx) => (
        <TypedItem
          key={item.id}
          idx={idx}
          item={item}
          ctl={ctl}
          meta={meta}
          rows={2}
          placeholder={t('writing.punct.placeholder')}
          computeOk={(v) => ({ ok: punctMatch(v, item.answer), msg: item.why })}
        >
          {/* Подсказка — из эталона, а не item.raw: raw посчитан stripPunct
              прототипа (сверка buildGenre с оракулом), а тот резал знаки и
              внутри чисел — «38.2» показывалось как «382». */}
          <div className="wr-src">{punctPrompt(item.answer)}</div>
        </TypedItem>
      ))}
    </TaskShell>
  )
}

/* ── 5. expand: заметки → полное предложение (textMatch + мягкое замечание
      про заглавную букву и точку при верном ответе). ── */
export function ExpandTask({ genre, task, meta, onFirstTry }) {
  const { t } = useI18n()
  const ctl = useTaskCtl(genre, task, { onFirstTry })
  return (
    <TaskShell genre={genre} task={task} ctl={ctl}>
      {task.items.map((item, idx) => (
        <TypedItem
          key={item.id}
          idx={idx}
          item={item}
          ctl={ctl}
          meta={meta}
          placeholder={t('writing.expand.placeholder')}
          computeOk={(v) => {
            const ok = textMatch(v, item)
            const s = v.trim()
            const caps = /^[A-Z]/.test(s)
            const dot = /[.!?]$/.test(s)
            let msg = item.why
            if (ok && (!caps || !dot)) msg += ' ' + t('writing.expand.capDot')
            return { ok, msg }
          }}
        >
          <div className="wr-src">
            <b>{item.cue}</b>
          </div>
        </TypedItem>
      ))}
    </TaskShell>
  )
}
