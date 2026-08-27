'use client'

// Блокнот (Writing Pad) — порт экрана pad прототипа (data/jtswriting.html:
// openPad 11342, renderPad 11396, таймер 11926, exportTxt 11959, runCheck
// 11990). Контракт с WritingPage: { genre|null, meta, level|null,
// seedText|null, withTimer, token, onResult(assessment, text), onBack() }.
// Механика contenteditable вынесена в usePadEditor, вкладки — в PadPanes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { wordsOf, sentencesOf, genreTimerMinutes, padTargetRange } from '../../practice/writing/engine.js'
import { currentDraftFor, newDraftId, saveDraft, draftsAll, versionsFor, myWords } from '../../practice/writing/writingStore.js'
import { taskState, markTask } from '../../practice/writing/writingProgress.js'
import { runCheck } from '../../practice/writing/checkApi.js'
import { avgScore } from '../../practice/writing/resultFormat.js'
import usePadEditor from './pad/usePadEditor.js'
import PadPanes from './pad/PadPanes.jsx'

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// Затравка из guided-write приходит плоским текстом: пустая строка — новый
// абзац, одиночный перенос — <br> (порт textToHtml).
function textToHtml(txt) {
  return String(txt)
    .split(/\n{2,}/)
    .map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>')
    .join('')
}
function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}
function timeStr(ts) {
  const d = new Date(ts)
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}
function dateStr(ts) {
  const d = new Date(ts)
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + timeStr(ts)
}

export default function WritingPad({ genre, meta, level, seedText, withTimer, token, onResult }) {
  const { t } = useI18n()

  /* ── Черновик: существующий для жанра или новый (порт openPad). Инициализатор
     useState читает localStorage, но НЕ пишет: в StrictMode он зовётся дважды,
     и сохранение здесь плодило бы черновики-двойники. Новый черновик
     персистится один раз эффектом ниже (признак «новый» — его ещё нет в
     хранилище). seedText всегда открывает новый — это «перенеси ответы
     guided-write в собственный текст». ── */
  const [draft, setDraft] = useState(() => {
    const existing = genre && !seedText ? currentDraftFor(genre.id) : null
    if (existing) return existing
    return {
      id: newDraftId(),
      genreId: genre ? genre.id : 'free',
      genreTitle: genre ? genre.title : 'Free writing',
      levelId: level || (genre ? genre.level : null) || 'free',
      title: genre ? genre.title : 'Free writing',
      html: seedText ? textToHtml(seedText) : '',
      text: seedText || '',
      words: seedText ? wordsOf(seedText).length : 0,
      updatedAt: Date.now(),
      checks: {},
      assessment: null,
    }
  })
  const draftRef = useRef(draft)
  useEffect(() => {
    const d = draftRef.current
    if (d && !draftsAll().some((it) => it && it.id === d.id)) saveDraft(d)
  }, [])

  // checks дублируются в state ради перерисовки чек-листа; источник истины
  // для сохранения — draftRef (persist читает оттуда).
  const [checks, setChecks] = useState(draft.checks || {})
  const [wordsTick, setWordsTick] = useState(0)

  // Список «золотых» слов читается свежим на каждый вызов — добавленное в
  // панели слово сразу видят и подсветка, и метрика.
  const getGoldWords = useCallback(() => {
    const list = myWords().slice()
    if (genre) genre.wordlist.forEach((w) => {
      if (list.indexOf(w) < 0) list.push(w)
    })
    return list
  }, [genre])

  const { editorRef, handlers, tick, lastSaved, getText, insertText, setContent, exec, persist, countGold } = usePadEditor({
    draftRef,
    draftId: draft.id,
    getGoldWords,
  })

  /* ── Тост: у раздела нет глобальной системы уведомлений, а Блокнот живёт на
     коротких подтверждениях («Скопировано», «Вставлено») — маленький локальный
     тост с автоскрытием. ── */
  const [toastMsg, setToastMsg] = useState('')
  const toastTimerRef = useRef(null)
  const toast = useCallback((msg) => {
    setToastMsg(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2200)
  }, [])
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },
    [],
  )

  /* ── Таймер (порт 11926–11949): счёт вниз, на нуле — стоп и заметка; текст
     ученика никуда не девается. ── */
  const timerTotal = (genre ? genreTimerMinutes(genre) : 25) * 60
  const [timerOn, setTimerOn] = useState(!!withTimer)
  const [timerLeft, setTimerLeft] = useState(timerTotal)
  const [timeUp, setTimeUp] = useState(false)
  useEffect(() => {
    if (!timerOn) return undefined
    const iv = setInterval(() => {
      setTimerLeft((left) => {
        if (left <= 1) {
          setTimerOn(false)
          setTimeUp(true)
          return 0
        }
        return left - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [timerOn])
  const toggleTimer = () => {
    if (timerOn) setTimerOn(false)
    else {
      setTimeUp(false)
      if (timerLeft <= 0) setTimerLeft(timerTotal) // повторный старт после нуля — с полного времени
      setTimerOn(true)
    }
  }

  // Режим без отвлечений: класс на корне Блокнота (НЕ на body — соседние
  // экраны SPA не должны зависеть от состояния этого).
  const [zen, setZen] = useState(false)

  const [modal, setModal] = useState(null) // 'works' | 'versions' | null
  const [checking, setChecking] = useState(false)
  const [checkNote, setCheckNote] = useState('')

  const target = padTargetRange(genre)
  const freeWriteTask = useMemo(() => (genre ? (genre.tasks || []).find((x) => x.type === 'free-write') : null), [genre])

  /* ── Метрики (порт updateMetrics): пересчёт по throttled-тику редактора —
     содержимое живёт в DOM, поэтому «зависимость» тут не данные, а сигналы:
     tick (набор текста), wordsTick (изменился список «моих слов»), draft.id
     (открыли другой черновик). ── */
  const metrics = useMemo(() => {
    const txt = getText()
    const w = wordsOf(txt).length
    const s = sentencesOf(txt).length
    const avg = s ? Math.round((w / s) * 10) / 10 : 0
    return { w, ch: txt.length, s, avg, gold: countGold(txt) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getText, countGold, tick, wordsTick, draft.id])

  const toggleCheck = useCallback(
    (key) => {
      const cur = draftRef.current.checks || {}
      const next = { ...cur, [key]: !cur[key] }
      draftRef.current = { ...draftRef.current, checks: next }
      setChecks(next)
      persist(false)
    },
    [persist],
  )

  const saveExplicit = () => {
    persist(true)
    toast(t('writing.pad.savedToast'))
  }

  const copyText = () => {
    const txt = getText()
    if (!txt.trim()) {
      toast(t('writing.pad.nothingCopy'))
      return
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt)
        toast(t('writing.pad.copied'))
        return
      }
    } catch {
      /* clipboard запрещён политикой — остаётся ручное выделение */
    }
    toast(t('writing.pad.copyManual'))
  }

  const exportTxt = () => {
    const txt = getText()
    if (!txt.trim()) {
      toast(t('writing.pad.nothingDownload'))
      return
    }
    const name = (draftRef.current.genreTitle || 'jts-writing').replace(/[^\w-]+/g, '_') + '.txt'
    try {
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        URL.revokeObjectURL(url)
        a.remove()
      }, 500)
      toast(t('writing.pad.downloaded', { name }))
    } catch {
      toast(t('writing.pad.downloadFail'))
    }
  }

  // Открыть другой черновик из «Моих работ»: текущий сохраняем, новый — в
  // draftRef; key={draft.id} пересоздаст редактор, init-эффект зальёт html.
  const openDraft = (it) => {
    persist(false)
    draftRef.current = it
    setChecks(it.checks || {})
    setDraft(it)
    setModal(null)
  }

  // Версии хранятся текстом (writingStore), поэтому restore восстанавливает
  // через textToHtml — разметка (жирный/списки) в снимок не попадает осознанно.
  const restoreVersion = (snap) => {
    setContent(textToHtml(snap.text || ''))
    persist(true)
    setModal(null)
    toast(t('writing.pad.restored'))
  }

  /* ── Проверка (клиентская сторона runCheck): guard < 5 слов, персист,
     сеть/офлайн в checkApi, результат — в черновик и наверх. ── */
  const handleCheck = async () => {
    if (checking) return
    const text = getText()
    if (!text.trim() || wordsOf(text).length < 5) {
      setCheckNote(t('writing.pad.emptyCheck'))
      return
    }
    setCheckNote('')
    persist(false)
    setChecking(true)
    try {
      const payload = {
        level: (level || 'b1').toUpperCase(),
        genre: genre ? genre.title : 'Free writing',
        targetWords: padTargetRange(genre),
        task: freeWriteTask ? freeWriteTask.prompt : 'Free writing with no set task.',
        text,
      }
      const ctx = {
        wordlist: genre ? genre.wordlist : undefined,
        checklist: genre ? genre.checklist : undefined,
        myWords: myWords(),
        rules: meta ? meta.rules : undefined,
      }
      const { assessment } = await runCheck(payload, { token, ctx })
      draftRef.current = { ...draftRef.current, assessment }
      persist(false)
      // Проверенный текст закрывает free-write жанра — но только первый раз:
      // best-of в markTask и так не ухудшит, просто не шумим синком.
      if (genre && freeWriteTask && !taskState(genre.id, freeWriteTask.id)) markTask(genre.id, freeWriteTask.id, 1, 1)
      onResult(assessment, text)
    } finally {
      setChecking(false)
    }
  }

  const inRange = metrics.w >= target[0] && metrics.w <= target[1]
  const timerText = timerOn
    ? '⏱ ' + Math.floor(timerLeft / 60) + ':' + pad2(timerLeft % 60)
    : t('writing.pad.noTimer')

  // Списки модалок читаются из localStorage только когда модалка открыта.
  const worksList = useMemo(() => (modal === 'works' ? draftsAll() : []), [modal])
  const versionsList = useMemo(() => (modal === 'versions' ? versionsFor(draft.id) : []), [modal, draft.id])

  return (
    <div className={'wr-pad' + (zen ? ' wr-pad--zen' : '')}>
      <div className="wr-card wr-pad__main">
        <div className="wr-padhead">
          <h2 className="wr-sec-title">{genre ? genre.title : t('writing.pad.free')}</h2>
          <span className="wr-pill">{t('writing.pad.targetWords', { a: target[0], b: target[1] })}</span>
          <span className={'wr-padtimer' + (timerOn && timerLeft < 120 ? ' wr-padtimer--low' : '')}>{timerText}</span>
        </div>

        {genre && genre.writeTask && (
          <div className="wr-padtask">
            <h4>{t('writing.pad.task')}</h4>
            <p>{genre.writeTask}</p>
            <div className="wr-padtask__meta">
              <span className="wr-pill">{genre.register}</span>
              <span className="wr-pill">{t('writing.pad.minutes', { n: genreTimerMinutes(genre) })}</span>
            </div>
          </div>
        )}

        <div className="wr-padtools">
          <button type="button" className="wr-ghost wr-ghost--sm" title={t('writing.pad.toolBoldTitle')} onClick={() => exec('bold')}>
            <b>B</b>
          </button>
          <button type="button" className="wr-ghost wr-ghost--sm" onClick={() => exec('insertUnorderedList')}>
            {t('writing.pad.toolList')}
          </button>
          <button type="button" className="wr-ghost wr-ghost--sm" onClick={() => exec('formatBlock')}>
            {t('writing.pad.toolPara')}
          </button>
          <button type="button" className="wr-ghost wr-ghost--sm wr-padtools__zen" onClick={() => setZen((z) => !z)}>
            {zen ? t('writing.pad.zenOff') : t('writing.pad.zenOn')}
          </button>
        </div>

        {/* Неконтролируемый contenteditable: key пересоздаёт div на смене
            черновика, содержимое живёт в DOM (см. usePadEditor). */}
        <div
          key={draft.id}
          ref={editorRef}
          className="wr-editor"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-ph={t('writing.pad.placeholder')}
          {...handlers}
        />

        <div className="wr-metrics">
          <span className={'wr-metric' + (inRange ? ' wr-metric--ok' : metrics.w > target[1] ? ' wr-metric--warn' : '')}>
            {t('writing.pad.mWords')} <b>{metrics.w}</b> <i>/ {target[0]}–{target[1]}</i>
          </span>
          <span className="wr-metric">
            {t('writing.pad.mChars')} <b>{metrics.ch}</b>
          </span>
          <span className="wr-metric">
            {t('writing.pad.mSents')} <b>{metrics.s}</b>
          </span>
          <span
            className={'wr-metric' + (metrics.avg > 25 ? ' wr-metric--warn' : metrics.avg >= 8 && metrics.avg <= 24 ? ' wr-metric--ok' : '')}
            title={metrics.avg > 25 ? t('writing.pad.mAvgTitleLong') : t('writing.pad.mAvgTitle')}
          >
            {t('writing.pad.mAvg')} <b>{metrics.avg}</b>
          </span>
          {metrics.avg > 25 && <span className="wr-metric wr-metric--warn">{t('writing.pad.mLong')}</span>}
          {metrics.gold > 0 && <span className="wr-metric wr-metric--gold">{t('writing.pad.mGold', { n: metrics.gold })}</span>}
        </div>

        {lastSaved && (
          <div className="wr-savedline">{t('writing.pad.savedAt', { time: timeStr(lastSaved.at), n: lastSaved.words })}</div>
        )}
        {timeUp && <div className="wr-note">{t('writing.pad.timeUp')}</div>}
        {checkNote && <div className="wr-note wr-note--err">{checkNote}</div>}

        <div className="wr-padbar">
          <div className="wr-padbar__extras">
            <button type="button" className="wr-ghost wr-ghost--sm" onClick={saveExplicit}>
              {t('writing.pad.save')}
            </button>
            <button type="button" className="wr-ghost wr-ghost--sm" onClick={() => setModal('works')}>
              {t('writing.pad.works')}
            </button>
            <button type="button" className="wr-ghost wr-ghost--sm" onClick={() => setModal('versions')}>
              {t('writing.pad.history')}
            </button>
            <button type="button" className="wr-ghost wr-ghost--sm" onClick={toggleTimer}>
              {timerOn ? t('writing.pad.timerStop') : t('writing.pad.timerStart')}
            </button>
            <button type="button" className="wr-ghost wr-ghost--sm" onClick={exportTxt}>
              {t('writing.pad.download')}
            </button>
            <button type="button" className="wr-ghost wr-ghost--sm" onClick={copyText}>
              {t('writing.pad.copy')}
            </button>
          </div>
          <button type="button" className="wr-primary wr-padbar__check" onClick={handleCheck} disabled={checking}>
            {checking && <span className="wr-spin" />}
            {checking ? t('writing.pad.checking') : t('writing.pad.check')}
          </button>
        </div>
      </div>

      <PadPanes
        genre={genre}
        checks={checks}
        onToggleCheck={toggleCheck}
        getText={getText}
        tick={tick}
        onInsert={insertText}
        onToast={toast}
        onWordsChange={() => setWordsTick((v) => v + 1)}
      />

      {modal === 'works' && (
        <div className="wr-modal" onClick={() => setModal(null)}>
          <div className="wr-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3>{t('writing.pad.works')}</h3>
            <p className="wr-sec-sub">{t('writing.pad.worksSub')}</p>
            {!worksList.length && <div className="wr-note">{t('writing.pad.worksEmpty')}</div>}
            <div className="wr-worklist">
              {worksList.map((it) => (
                <button key={it.id} type="button" className="wr-workrow" onClick={() => openDraft(it)}>
                  <span>
                    <b>{it.title || it.genreTitle}</b>
                    <small>
                      {dateStr(it.updatedAt)} · {(it.levelId || '').toUpperCase()} · {t('writing.pad.nWords', { n: it.words || 0 })} ·{' '}
                      {it.assessment ? it.assessment.cefr + ' · ' + avgScore(it.assessment.scores) + '/5' : t('writing.pad.notChecked')}
                    </small>
                  </span>
                  <span className="wr-pill">{t('writing.pad.worksOpen')}</span>
                </button>
              ))}
            </div>
            <button type="button" className="wr-ghost" onClick={() => setModal(null)}>
              {t('writing.pad.close')}
            </button>
          </div>
        </div>
      )}

      {modal === 'versions' && (
        <div className="wr-modal" onClick={() => setModal(null)}>
          <div className="wr-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3>{t('writing.pad.history')}</h3>
            <p className="wr-sec-sub">{t('writing.pad.histSub')}</p>
            {!versionsList.length && <div className="wr-note">{t('writing.pad.histEmpty')}</div>}
            <div className="wr-worklist">
              {versionsList.map((s, i) => (
                <button key={s.ts + '-' + i} type="button" className="wr-workrow" onClick={() => restoreVersion(s)}>
                  <span>
                    <b>
                      {dateStr(s.ts)}
                      {i === 0 ? ' · ' + t('writing.pad.histLatest') : ''}
                    </b>
                    <small>{t('writing.pad.nWords', { n: wordsOf(s.text || '').length })}</small>
                  </span>
                  <span className="wr-pill">{t('writing.pad.histRestore')}</span>
                </button>
              ))}
            </div>
            <button type="button" className="wr-ghost" onClick={() => setModal(null)}>
              {t('writing.pad.close')}
            </button>
          </div>
        </div>
      )}

      {toastMsg && <div className="wr-toast">{toastMsg}</div>}
    </div>
  )
}
