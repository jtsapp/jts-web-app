import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { markSeen } from '../../practice/writing/writingProgress.js'

// Теоретические шаги 1–3 тренажёра (порт stepWhy/stepPhrases/stepConnectors,
// data/jtswriting.html:10448–10518). Проверяемого ответа тут нет, поэтому
// «пройдено» = «открывал»: markSeen на монтировании шага.

export default function WritingInfoSteps({ genre, meta, step }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    markSeen(genre.id, step)
  }, [genre.id, step])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Порт copyText без ветки Pad.active: из тренажёра фраза уходит в буфер,
  // плашка подтверждает вместо тоста прототипа.
  const copy = (txt) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).catch(() => {})
      }
    } catch {
      /* буфер недоступен (http/старый браузер) — плашка всё равно покажет текст */
    }
    setCopied(txt)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(''), 1600)
  }

  const toast = copied ? (
    <div className="wr-copytoast">{t('writing.copied', { text: copied })}</div>
  ) : null

  /* Шаг 1 — зачем этот жанр */
  if (step === 1) {
    return (
      <div className="wr-card">
        <h3 className="wr-sec-title">{t('writing.step1.title')}</h3>
        <p className="wr-sec-sub">{t('writing.step1.sub')}</p>
        <p>{genre.why}</p>
        <div className="wr-banner-task">
          <h4>{t('writing.step1.goalHead')}</h4>
          <p>{genre.goal}</p>
        </div>
        <div className="wr-howto">
          <b>{t('writing.step1.example')}</b> {genre.example}
        </div>
        <div className="wr-fb wr-fb--tip">{t('writing.step1.tip')}</div>
      </div>
    )
  }

  /* Шаг 2 — банк фраз */
  if (step === 2) {
    return (
      <div className="wr-card">
        {toast}
        <h3 className="wr-sec-title">{t('writing.step2.title')}</h3>
        <p className="wr-sec-sub">{t('writing.step2.sub')}</p>
        {genre.phrases.map((grp) => (
          <div key={grp.fn}>
            <div className="wr-fnhead">
              {grp.fn}
              {meta.fnWhy && meta.fnWhy[grp.fn] ? <small>{meta.fnWhy[grp.fn]}</small> : null}
            </div>
            {grp.items.map((it) => (
              <button key={it.t} type="button" className="wr-phrase" onClick={() => copy(it.t)}>
                <span className="wr-phrase__lv">{it.lv}</span>
                <span>
                  <b>{it.t}</b>
                  <small>
                    RU: {it.ru} · KK: {it.kk}
                  </small>
                </span>
              </button>
            ))}
          </div>
        ))}
        <div className="wr-howto">
          <b>{t('writing.step2.topicHead')}</b> {genre.wordlist.join(' · ')}{' '}
          {t('writing.step2.topicTail')}
        </div>
      </div>
    )
  }

  /* Шаг 3 — связки */
  return (
    <div className="wr-card">
      {toast}
      <h3 className="wr-sec-title">{t('writing.step3.title')}</h3>
      <div className="wr-howto">{t('writing.step3.intro')}</div>
      <div className="wr-scroll-x">
        <table className="wr-tbl">
          <thead>
            <tr>
              <th>{t('writing.step3.meaning')}</th>
              <th>{t('writing.step3.words')}</th>
              <th>{t('writing.step3.when')}</th>
            </tr>
          </thead>
          <tbody>
            {genre.connectors.map((row) => (
              <tr key={row.fn}>
                <td>{row.fn}</td>
                <td>
                  {row.items.map((w) => (
                    <button key={w} type="button" className="wr-chip" onClick={() => copy(w)}>
                      {w}
                    </button>
                  ))}
                </td>
                <td>{row.hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="wr-fb wr-fb--tip">{t('writing.step3.commaRule')}</div>
    </div>
  )
}
