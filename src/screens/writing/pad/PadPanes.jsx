'use client'

// Правые панели Блокнота — порт вкладок прототипа (data/jtswriting.html
// 11561–11687): чек-лист, банк фраз, связки, план, «мои слова». Все клики
// «вставить» идут через insertText редактора (onInsert), чтобы текст попадал
// под карет, а не в конец. Без жанра панели показывают свои пустые состояния —
// в отличие от прототипа, который подставлял b1-complaint как «жанр по
// умолчанию»: здесь данных чужого уровня в памяти нет и тянуть их ради
// заглушки не стоит.

import { useMemo, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { getPlan, myWords, addMyWord, removeMyWord } from '../../../practice/writing/writingStore.js'

const TABS = ['check', 'phr', 'con', 'plan', 'words']

// План хранится setPlan'ом шага «Планирование»; форму не диктуем — строки
// и блоки {slot|label, items|lines} разворачиваются в плоский список строк.
function planRows(saved) {
  const rows = []
  ;(Array.isArray(saved) ? saved : []).forEach((entry, i) => {
    if (typeof entry === 'string') {
      rows.push({ key: 'l' + i, line: entry })
      return
    }
    if (!entry || typeof entry !== 'object') return
    const head = entry.slot || entry.label || null
    if (head) rows.push({ key: 'h' + i, head: String(head) })
    const items = Array.isArray(entry.items) ? entry.items : Array.isArray(entry.lines) ? entry.lines : []
    items.forEach((line, j) => rows.push({ key: i + '-' + j, line: String(line) }))
  })
  return rows
}

export default function PadPanes({ genre, checks, onToggleCheck, getText, tick, onInsert, onToast, onWordsChange }) {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState('check')
  // Вычёркивание строк плана — локальное состояние сессии Блокнота: это
  // рабочая пометка «уже написал», хранить её дольше открытой страницы незачем.
  const [struck, setStruck] = useState({})
  const [wordInput, setWordInput] = useState('')
  const [wordsVer, setWordsVer] = useState(0)

  // Текст пересчитываем только по тику редактора — он уже затротлен.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const low = useMemo(() => getText().toLowerCase(), [getText, tick])

  const tabNames = {
    check: t('writing.pad.tabCheck'),
    phr: t('writing.pad.tabPhrases'),
    con: t('writing.pad.tabConn'),
    plan: t('writing.pad.tabPlan'),
    words: t('writing.pad.tabWords'),
  }

  // «Мои слова» + словарь жанра без дублей — порт myWordList().
  const wordList = useMemo(() => {
    const list = myWords().slice()
    if (genre) genre.wordlist.forEach((w) => {
      if (list.indexOf(w) < 0) list.push(w)
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, wordsVer])
  // wordsVer — сигнал «список в localStorage изменился», данных в нём нет.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ownWords = useMemo(() => new Set(myWords().map((w) => String(w).toLowerCase())), [wordsVer])

  const addWord = () => {
    const w = wordInput.trim().toLowerCase()
    if (!w) return
    addMyWord(w)
    setWordInput('')
    setWordsVer((v) => v + 1)
    onWordsChange?.()
  }
  const removeWord = (w) => {
    removeMyWord(w)
    setWordsVer((v) => v + 1)
    onWordsChange?.()
  }

  const insert = (txt) => {
    onInsert(txt)
    onToast(t('writing.pad.inserted'))
  }

  const renderChecklist = () => {
    if (!genre) return <div className="wr-note">{t('writing.pad.chkEmpty')}</div>
    let autoDone = 0
    let autoTotal = 0
    const rows = genre.checklist.map((c, i) => {
      const key = 'c' + i
      const isAuto = !!c.auto
      let hit = false
      if (isAuto) {
        autoTotal++
        hit = c.auto.some((a) => low.indexOf(a) >= 0)
        if (hit) autoDone++
      } else {
        hit = !!(checks && checks[key])
      }
      return (
        <button
          key={key}
          type="button"
          className={'wr-chk' + (hit ? ' wr-chk--on' : '') + (isAuto && hit ? ' wr-chk--auto' : '')}
          onClick={() => {
            // Авто-пункты руками не отмечаются: их закрывает сам текст.
            if (isAuto) onToast(t(hit ? 'writing.pad.chkToastHit' : 'writing.pad.chkToastMiss'))
            else onToggleCheck(key)
          }}
        >
          <i>{hit ? '✓' : ''}</i>
          <span>
            <b>{c.text}</b>
            <small>{isAuto ? t(hit ? 'writing.pad.chkAutoHit' : 'writing.pad.chkAutoMiss') : t('writing.pad.chkManual')}</small>
          </span>
        </button>
      )
    })
    return (
      <>
        {rows}
        <div className={'wr-note' + (autoDone === autoTotal ? ' wr-note--ok' : '')}>
          {t('writing.pad.chkSummary', { a: autoDone, b: autoTotal })}
        </div>
      </>
    )
  }

  const renderPhrases = () => {
    if (!genre) return <div className="wr-note">{t('writing.pad.phrEmpty')}</div>
    return genre.phrases.map((grp) => (
      <div key={grp.fn}>
        <div className="wr-fnhead">{grp.fn}</div>
        {grp.items.map((it) => (
          <button key={it.t} type="button" className="wr-phrase" onClick={() => insert(it.t + ' ')}>
            <span className="wr-phrase__lv">{it.lv}</span>
            <span>
              <b>{it.t}</b>
              {/* ru/kk — отдельные поля данных жанра; показываем язык интерфейса */}
              <small>{lang === 'kk' ? it.kk : it.ru}</small>
            </span>
          </button>
        ))}
      </div>
    ))
  }

  const renderConnectors = () => {
    if (!genre) return <div className="wr-note">{t('writing.pad.connEmpty')}</div>
    return genre.connectors.map((row) => (
      <div key={row.fn}>
        <div className="wr-fnhead">{row.fn} · {row.hint}</div>
        <div className="wr-chipbank">
          {row.items.map((w) => (
            <button key={w} type="button" className="wr-chip" onClick={() => insert(w + ' ')}>
              {w}
            </button>
          ))}
        </div>
      </div>
    ))
  }

  const renderPlan = () => {
    if (!genre) return <div className="wr-note">{t('writing.pad.planEmpty')}</div>
    const rows = planRows(getPlan(genre.id))
    if (!rows.length) return <div className="wr-note">{t('writing.pad.planEmpty')}</div>
    return rows.map((r) =>
      r.head ? (
        <div key={r.key} className="wr-fnhead">{r.head}</div>
      ) : (
        <button
          key={r.key}
          type="button"
          className={'wr-chk' + (struck[r.key] ? ' wr-chk--on' : '')}
          onClick={() => setStruck((s) => ({ ...s, [r.key]: !s[r.key] }))}
        >
          <i>{struck[r.key] ? '✓' : ''}</i>
          <span className={struck[r.key] ? 'wr-strike' : ''}>{r.line}</span>
        </button>
      ),
    )
  }

  const renderWords = () => {
    let used = 0
    const chips = wordList.map((w) => {
      const hit = low.indexOf(String(w).toLowerCase()) >= 0
      if (hit) used++
      return (
        <span key={w} className={'wr-chip wr-chip--word' + (hit ? ' wr-chip--hit' : '')}>
          <button type="button" onClick={() => insert(w + ' ')}>{w}</button>
          {ownWords.has(String(w).toLowerCase()) && (
            <button type="button" className="wr-chip__x" aria-label={t('writing.pad.wordsRemove')} onClick={() => removeWord(w)}>
              ×
            </button>
          )}
        </span>
      )
    })
    return (
      <>
        <p className="wr-sec-sub">{t('writing.pad.wordsNote')}</p>
        <div className="wr-chipbank">{chips}</div>
        <div className={'wr-note' + (used ? ' wr-note--ok' : '')}>
          {t('writing.pad.wordsUsed', { a: used, b: wordList.length })}
        </div>
        <input
          type="text"
          className="wr-inp"
          value={wordInput}
          placeholder={t('writing.pad.wordsAdd')}
          onChange={(e) => setWordInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addWord()
          }}
        />
      </>
    )
  }

  return (
    <div className="wr-card wr-pad__side">
      <div className="wr-padtabs">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            className={'wr-padtab' + (tab === id ? ' wr-padtab--on' : '')}
            onClick={() => setTab(id)}
          >
            {tabNames[id]}
          </button>
        ))}
      </div>
      <div className="wr-pane">
        {tab === 'check' && renderChecklist()}
        {tab === 'phr' && renderPhrases()}
        {tab === 'con' && renderConnectors()}
        {tab === 'plan' && renderPlan()}
        {tab === 'words' && renderWords()}
      </div>
    </div>
  )
}
