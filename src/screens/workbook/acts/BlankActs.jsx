'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { bankWords, clozeBank, tableCells } from '../../../practice/workbook/engine.js'
import { Note, Pic, Qnum } from '../ActShell.jsx'
import { justDragged, useGrab, useZone } from '../dnd.js'
import { loc } from '../loc.js'

// Пропуски со словобанком: bank / match / table / chat. Порт makeBank +
// liveBlank (data/jtsworkbook-a0.html:5563, :5594). Слово можно перетащить в
// пропуск или поставить двумя тапами — судья один и тот же.
//
// Ключевое поведение прототипа, которое легко потерять: неверное слово НЕ
// проглатывается. Оно на секунду остаётся в пропуске красным (чтобы студент
// прочитал, что именно он поставил), после чего возвращается в банк.

const WRONG_MS = 1100
const WORD_KIND = 'wb-word'

function useBank(words) {
  const [active, setActive] = useState(null)
  const [used, setUsed] = useState({})
  const [burnt, setBurnt] = useState(false)

  return {
    words,
    active,
    used,
    burnt,
    isUsed: (i) => burnt || !!used[i],
    toggle: (i) => setActive((a) => (a === i ? null : i)),
    consume: (i) => {
      setUsed((u) => ({ ...u, [i]: true }))
      setActive(null)
    },
    release: () => setActive(null),
    burn: () => setBurnt(true),
  }
}

function BankTok({ bank, w, i }) {
  const used = bank.isUsed(i)
  const ref = useGrab(WORD_KIND, i, used)
  return (
    <button
      ref={ref}
      type="button"
      className={'wb-tok' + (used ? ' is-used' : '') + (bank.active === i ? ' is-act' : '')}
      disabled={used}
      onClick={() => {
        if (justDragged()) return
        bank.toggle(i)
      }}
    >
      {w}
    </button>
  )
}

function Bank({ bank, label }) {
  return (
    <div className="wb-bank">
      <div className="wb-bank__hint">{label}</div>
      {bank.words.map((w, i) => (
        <BankTok key={i} bank={bank} w={w} i={i} />
      ))}
    </div>
  )
}

/** Один пропуск: судит себя сам в момент заполнения — тапом или броском. */
function Blank({ ans, idx, ctl, bank }) {
  const { t } = useI18n()
  const [clean, setClean] = useState(true)
  const [shown, setShown] = useState(null)
  const [bad, setBad] = useState(false)
  const timer = useRef(null)
  const closed = !!ctl.state.closed[idx]
  const revealed = ctl.revealed

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (revealed && !closed) bank.burn()
    // burn один раз на раскрытие — зависимость только от флага
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed])

  /* ОДИН судья, две дороги: тап-тап и перетаскивание. */
  const place = (i) => {
    if (i == null || closed) return
    const w = bank.words[i]
    if (w === ans) {
      clearTimeout(timer.current)
      setShown(w)
      setBad(false)
      bank.consume(i)
      ctl.judge(idx, clean)
      return
    }
    setClean(false)
    setShown(w)
    setBad(true)
    bank.release()
    ctl.miss()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setShown(null)
      setBad(false)
    }, WRONG_MS)
  }

  const zoneRef = useZone(WORD_KIND, (i) => place(i), closed || revealed)

  // shown выставляется только когда слово поставил студент, поэтому он же и
  // отличает «решил сам» от «ответ раскрыли».
  const own = closed && !!shown && !bad
  if (own) {
    return (
      <span className="wb-blank is-ok" aria-label={shown}>
        {shown}
      </span>
    )
  }
  if (closed || revealed) {
    return (
      <span className="wb-blank is-rev" aria-label={ans}>
        {ans}
      </span>
    )
  }

  return (
    <button
      ref={zoneRef}
      type="button"
      className={'wb-blank' + (bad ? ' is-no' : '')}
      aria-label={shown || t('workbook.gap')}
      onClick={() => {
        if (justDragged()) return
        place(bank.active)
      }}
    >
      {shown || ''}
    </button>
  )
}

/** Текст с «___» → куски и пропуски. Все пропуски одного пункта делят ответ. */
function GapLine({ text, ans, ctl, bank, nextIdx }) {
  const parts = String(text).split('___')
  return (
    <>
      {parts.map((p, k) => (
        <span key={k}>
          {p ? <span>{p}</span> : null}
          {k < parts.length - 1 ? <Blank ans={ans} idx={nextIdx()} ctl={ctl} bank={bank} /> : null}
        </span>
      ))}
    </>
  )
}

/** Счётчик мест: порядок обязан совпасть с порядком L.add() в прототипе. */
function counter() {
  let i = 0
  return () => i++
}

export function BankAct({ act, ctl }) {
  const { t } = useI18n()
  const bank = useBank(bankWords(act))
  const next = counter()
  return (
    <>
      <Bank bank={bank} label={t('workbook.wordBank')} />
      <Note kind="tell" icon="👆">
        {t('workbook.tapWord')}
      </Note>
      {act.items.map((it, i) => (
        <div className="wb-item" key={i}>
          <div className="wb-qline">
            <Qnum n={i} />
            <Pic p={it.pic} />
            <GapLine text={it.s} ans={it.a} ctl={ctl} bank={bank} nextIdx={next} />
          </div>
        </div>
      ))}
    </>
  )
}

export function MatchAct({ act, ctl }) {
  const { t } = useI18n()
  const bank = useBank(bankWords(act))
  return (
    <>
      <Bank bank={bank} label={t('workbook.wordBank')} />
      <Note kind="tell" icon="👆">
        {t('workbook.tapWord')}
      </Note>
      {act.items.map((it, i) => (
        <div className="wb-mrow" key={i}>
          <div className="wb-mrow__side">
            <Qnum n={i} />
            <Pic p={it.pic} />
            <span>{it.l}</span>
          </div>
          <Blank ans={it.r} idx={i} ctl={ctl} bank={bank} />
        </div>
      ))}
    </>
  )
}

export function TableAct({ act, ctl }) {
  const { t, lang } = useI18n()
  const bank = useBank(bankWords(act))
  const cells = tableCells(act)
  const next = counter()
  return (
    <>
      <div className="wb-tablewrap">
        <table className="wb-table">
          <thead>
            <tr>
              {act.head.map((h, i) => (
                <th key={i}>{loc(h, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>
                    {cell.gap ? <Blank ans={cell.gap} idx={next()} ctl={ctl} bank={bank} /> : cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Bank bank={bank} label={t('workbook.wordBank')} />
    </>
  )
}

export function ChatAct({ act, ctl, onSpeak }) {
  const { t } = useI18n()
  const bank = useBank(bankWords(act))
  const next = counter()
  return (
    <>
      <div className="wb-chat">
        {act.lines.map((ln, i) => (
          <div className={'wb-bub' + (ln.w ? ' wb-bub--b' : ' wb-bub--a')} key={i}>
            <GapLine text={ln.s} ans={ln.a} ctl={ctl} bank={bank} nextIdx={next} />
          </div>
        ))}
      </div>
      <Bank bank={bank} label={t('workbook.wordBank')} />
      {onSpeak ? (
        <button type="button" className="wb-ghost" onClick={onSpeak}>
          🔊 {t('workbook.hearIt')}
        </button>
      ) : null}
    </>
  )
}

/* ── Сплошной текст с банком слов (B2) ─────────────────────────────────── */
/* Порт R.cloze (data/jtsworkbook-b2.html:13391). Отличие от bank не в разметке,
   а в задаче: пропуски идут подряд по связному тексту, а в банке лежат лишние
   слова-ловушки — студент выбирает сочетаемость, а не переводит по одному. */
export function ClozeAct({ act, ctl }) {
  const { t } = useI18n()
  const bank = useBank(clozeBank(act))
  const next = counter()
  return (
    <>
      <Bank bank={bank} label={t('workbook.wordBank')} />
      <Note kind="tell" icon="👆">
        {t('workbook.tapWord')}
      </Note>
      <div className="wb-src">
        {act.title ? <div className="wb-src__k">{act.title}</div> : null}
        <div className="wb-src__body">
          {act.text.map((line, li) => (
            <p key={li}>
              <GapLineSeq text={line} gaps={act.gaps} ctl={ctl} bank={bank} nextIdx={next} />
            </p>
          ))}
        </div>
      </div>
    </>
  )
}

/* У cloze ключ свой у каждого пропуска, а не общий на строку, поэтому строку
   режет отдельный компонент: он берёт ответ по сквозному номеру места. */
function GapLineSeq({ text, gaps, ctl, bank, nextIdx }) {
  const parts = String(text).split('___')
  return (
    <>
      {parts.map((p, k) => {
        if (k === parts.length - 1) return <span key={k}>{p}</span>
        const idx = nextIdx()
        return (
          <span key={k}>
            {p ? <span>{p}</span> : null}
            <Blank ans={gaps[idx]} idx={idx} ctl={ctl} bank={bank} />
          </span>
        )
      })}
    </>
  )
}
