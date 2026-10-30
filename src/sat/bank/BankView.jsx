import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatBank } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import { ExpandMoreIcon } from '../../ielts/icons.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'
import { domainName } from '../names.js'
import { applyResult, cellResult, collapseRows, gridRows, groupByDomain, progressText, topicProgress, visibleCells } from './bank.js'
import BankQuestion from './BankQuestion.jsx'

/** Легенда сетки: та же кодировка, что у клеток, — заливка, жирная рамка, пунктир (Figma «NEW 2», 17:7703). */
export function BankLegend({ counts }) {
  const { t } = useI18n()
  return (
    <div className={`st-bank__legend ${counts ? 'has-counts' : ''}`}>
      {[['right', 'sat.bank.lgRight'], ['wrong', 'sat.bank.lgWrong'], ['none', 'sat.bank.lgNone']].map(([k, key]) => (
        <span key={k}>
          <i className={`st-bank__sw is-${k}`} aria-hidden="true" />
          {t(key)}
          {counts && <b>{counts[k]}</b>}
        </span>
      ))}
    </div>
  )
}

/**
 * «Все вопросы» (ТЗ SAT 21.10, задача 8; макет «NEW 2», 17:7703): темы-домены списком, внутри — сетка всех вопросов по
 * порядку банка строками по 20, клетка — по последней попытке. Не сессия: ни количества, ни таймера, ни конца. Первая
 * тема открыта сразу — иначе экран начинался с четырёх пустых строк. Длинная тема свёрнута до 8 строк. Фильтры из
 * панели скрывают лишние клетки во всех темах. domainOrder — id доменов в порядке таксономии.
 */
export default function BankView({ section, filters, explainLang, onBank, domainOrder }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [bank, setBank] = useState(null)
  const [open, setOpen] = useState({})
  const [full, setFull] = useState({})
  const [cell, setCell] = useState(null)

  useEffect(() => {
    let alive = true
    setBank(null)
    setOpen({})
    setFull({})
    getSatBank(token, section).then((b) => alive && setBank(b)).catch(() => alive && setBank({ topics: [], total: 0, answered: 0, correct: 0 }))
    return () => {
      alive = false
    }
  }, [token, section])
  useEffect(() => onBank?.(bank), [bank, onBank])

  if (!bank) return <p className="st-muted">{t('sat.study.loading')}</p>

  const onResult = (qid, correct) => setBank((b) => applyResult(b, qid, correct))
  const topics = groupByDomain(bank, domainOrder)

  return (
    <div className="st-card st-bank">
      <h2>{t('sat.bank.topics')}</h2>
      <p className="st-muted st-bank__lead">{t('sat.bank.lead')}</p>
      <BankLegend />
      {topics.map((topic, i) => {
        const p = topicProgress(topic)
        const isOpen = open[topic.domain] ?? i === 0
        const name = domainName(topic.domain, lang)
        const rows = isOpen ? gridRows(visibleCells(topic, filters)) : []
        const { rows: shown, hidden } = collapseRows(rows, 8, !!full[topic.domain])
        return (
          <div key={topic.domain} className={`st-bank__topic ${isOpen ? 'is-open' : ''}`}>
            <button type="button" className="st-bank__head" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [topic.domain]: !isOpen }))}>
              <ExpandMoreIcon size={18} />
              <b>{name}</b>
              <span className="st-spacer" />
              <span className="st-bank__bar" aria-hidden="true"><i style={{ width: `${topic.total ? (topic.answered * 100) / topic.total : 0}%` }} /></span>
              <span className="st-bank__pill">{progressText(t, p)}</span>
            </button>
            {isOpen && (
              <div className="st-bank__body">
                <div className="st-bank__rows" role="group" aria-label={name}>
                  {shown.map((row) => (
                    <div key={row.from} className="st-bank__row">
                      <span className="st-bank__label">{row.from === row.to ? row.from : `${row.from}–${row.to}`}</span>
                      <div className="st-bank__cells">
                        {row.cells.map(([c, n]) => {
                          const r = cellResult(c)
                          return (
                            <button key={c[0]} type="button" className={`st-bank__cell ${r == null ? 'is-none' : r ? 'is-right' : 'is-wrong'}`}
                              aria-label={`${n} · ${t(r == null ? 'sat.run.tileEmpty' : r ? 'sat.run.tileRight' : 'sat.run.tileWrong')}`}
                              onClick={() => setCell({ qid: c[0], answered: r != null })}>{n}</button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {rows.length === 0 && <span className="st-muted">{t('sat.bank.noneFit')}</span>}
                {hidden > 0 && (
                  <div className="st-bank__more">
                    <span>{t('sat.bank.shown', { a: String(shown[0].from), b: String(shown[shown.length - 1].to), n: String(topic.total) })}</span>
                    <button type="button" className="st-bank__all" onClick={() => setFull((f) => ({ ...f, [topic.domain]: true }))}>
                      {plural(t, lang, 'sat.bank.showAll', rows.length)}<ExpandMoreIcon size={16} />
                    </button>
                  </div>
                )}
                {full[topic.domain] && rows.length > 8 && (
                  <div className="st-bank__more">
                    <button type="button" className="st-bank__all is-less" onClick={() => setFull((f) => ({ ...f, [topic.domain]: false }))}>
                      {t('sat.bank.collapse')}<ExpandMoreIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {cell && (
        <SatModal wide title={t('sat.bank.question')} onClose={() => setCell(null)}>
          <BankQuestion qid={cell.qid} answered={cell.answered} explainLang={explainLang} onResult={onResult} />
        </SatModal>
      )}
    </div>
  )
}
