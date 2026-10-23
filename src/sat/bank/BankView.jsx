import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatBank } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { ExpandMoreIcon } from '../../ielts/icons.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'
import { domainName, skillName } from '../names.js'
import { applyResult, cellResult, topicProgress, visibleCells } from './bank.js'
import BankQuestion from './BankQuestion.jsx'

/**
 * «Все вопросы» (ТЗ SAT 21.10, задача 8): темы списком, внутри — сетка всех вопросов по порядку банка, клетка
 * закрашена по последней попытке. Не сессия: ни количества, ни таймера, ни конца. Темы раскрываются по одной —
 * сетка на 600 клеток рисуется, только когда её открыли. Фильтры из панели скрывают лишние клетки во всех темах.
 */
export default function BankView({ section, filters, explainLang, onBank }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [bank, setBank] = useState(null)
  const [open, setOpen] = useState({})
  const [cell, setCell] = useState(null)

  useEffect(() => {
    let alive = true
    setBank(null)
    getSatBank(token, section).then((b) => alive && setBank(b)).catch(() => alive && setBank({ topics: [], total: 0, answered: 0, correct: 0 }))
    return () => {
      alive = false
    }
  }, [token, section])
  useEffect(() => onBank?.(bank), [bank, onBank])

  if (!bank) return <p className="st-muted">{t('sat.study.loading')}</p>

  const onResult = (qid, correct) => setBank((b) => applyResult(b, qid, correct))

  return (
    <div className="st-card st-bank">
      <p className="st-muted">{t('sat.bank.lead')}</p>
      {bank.topics.map((topic) => {
        const p = topicProgress(topic)
        const isOpen = !!open[topic.skillId]
        const cells = isOpen ? visibleCells(topic, filters) : []
        return (
          <div key={topic.skillId} className={`st-bank__topic ${isOpen ? 'is-open' : ''}`}>
            <button type="button" className="st-tree__head" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [topic.skillId]: !isOpen }))}>
              <ExpandMoreIcon size={18} />
              <b>{skillName(topic.skillId, lang)}</b>
              <small className="st-muted">{domainName(topic.domain, lang)}</small>
              <span className="st-spacer" />
              <span className="st-tree__bank">{t('sat.bank.progress', { a: String(p.answered), n: String(p.total), p: String(p.pct) })}</span>
            </button>
            {isOpen && (
              <div className="st-bank__grid" role="group" aria-label={skillName(topic.skillId, lang)}>
                {cells.map(([c, n]) => {
                  const r = cellResult(c)
                  return (
                    <button key={c[0]} type="button" className={`st-bank__cell ${r == null ? '' : r ? 'is-right' : 'is-wrong'}`}
                      aria-label={`${n} · ${t(r == null ? 'sat.run.tileEmpty' : r ? 'sat.run.tileRight' : 'sat.run.tileWrong')}`}
                      onClick={() => setCell({ qid: c[0], answered: r != null })}>{n}</button>
                  )
                })}
                {cells.length === 0 && <span className="st-muted">{t('sat.bank.noneFit')}</span>}
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
