'use client'

// Редактор Блокнота — порт contenteditable-механики прототипа
// (data/jtswriting.html: padText 11689, saveRange/insertPlainText 11697–11738,
// автосейв 11814, highlightMyWords 11786, countGold 11776).
//
// ГЛАВНОЕ: contenteditable здесь НЕКОНТРОЛИРУЕМЫЙ. Содержимое редактора
// никогда не попадает в React-state: перерисовка div'а с innerHTML из state
// сбрасывает карет и рвёт IME-композицию (казахская раскладка, автозамена
// на мобильных). React рисует <div ref contentEditable> один раз на черновик
// (key={draft.id} в WritingPad), дальше DOM живёт своей жизнью, а наружу
// уходит только throttled-тик для метрик и чек-листа.
//
// draftRef — мутабельный ref на текущий черновик (им владеет WritingPad):
// persist() читает из него checks/assessment, дописывает html/text/words и
// кладёт результат обратно, поэтому обе стороны всегда видят один объект.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { wordsOf } from '../../../practice/writing/engine.js'
import { saveDraft, snapshotDraft } from '../../../practice/writing/writingStore.js'

// Тик метрик — не чаще раза в 300 мс: metrics/checklist пересчитывают текст
// целиком, на каждый keypress это заметно на длинных текстах.
const TICK_MS = 300
// Автосейв каждые 3 секунды — ровно как обещает плейсхолдер редактора.
const AUTOSAVE_MS = 3000

function escapeRx(w) {
  return String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function usePadEditor({ draftRef, draftId, getGoldWords }) {
  const editorRef = useRef(null)
  // Карет уходит из редактора при клике по фразе/связке — запоминаем последний
  // Range, чтобы вставка попала туда, где ученик остановился (порт lastRange).
  const lastRangeRef = useRef(null)
  const dirtyRef = useRef(false)
  const tickTimerRef = useRef(null)
  const [tick, setTick] = useState(0)
  const [lastSaved, setLastSaved] = useState(null) // {at, words} — строка «Сохранено в …»
  // goldSeen из прототипа: какие «мои слова» уже встречались в этой работе.
  // XP-начисление прототипа (+3 за слово) не переносим — в вебе нет системы XP,
  // но сам учёт оставлен: он дешёвый и держит счётчик «my words» стабильным.
  const goldSeenRef = useRef({})

  const scheduleTick = useCallback(() => {
    if (tickTimerRef.current) return
    tickTimerRef.current = setTimeout(() => {
      tickTimerRef.current = null
      setTick((n) => n + 1)
    }, TICK_MS)
  }, [])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
    scheduleTick()
  }, [scheduleTick])

  // Инициализация содержимого — только при смене черновика (div уже
  // пересоздан key'ем, но после restore-версии innerHTML ставится руками,
  // поэтому эффект дополнительно страхует первый маунт).
  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    ed.innerHTML = (draftRef.current && draftRef.current.html) || ''
    lastRangeRef.current = null
    goldSeenRef.current = {}
    dirtyRef.current = false
    setTick((n) => n + 1)
  }, [draftId, draftRef])

  /* Текстификация — порт padText: <br> → \n, блочные элементы дописывают \n,
     дальше textContent. Так «два абзаца» в редакторе остаются двумя абзацами
     в тексте для проверки. */
  const getText = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return (draftRef.current && draftRef.current.text) || ''
    const clone = ed.cloneNode(true)
    clone.querySelectorAll('br').forEach((b) => b.parentNode.replaceChild(document.createTextNode('\n'), b))
    clone.querySelectorAll('p,div,li').forEach((b) => b.appendChild(document.createTextNode('\n')))
    return (clone.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
  }, [draftRef])

  const saveRange = useCallback(() => {
    try {
      const ed = editorRef.current
      const sel = window.getSelection()
      if (sel && sel.rangeCount && ed && ed.contains(sel.anchorNode)) lastRangeRef.current = sel.getRangeAt(0).cloneRange()
    } catch {
      /* Selection API недоступен — вставка уйдёт в конец текста */
    }
  }, [])

  const restoreRange = useCallback(() => {
    try {
      if (!lastRangeRef.current) return
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(lastRangeRef.current)
    } catch {
      /* ignore */
    }
  }, [])

  // Вставка ТОЛЬКО плоским текстом (порт insertPlainText): и paste, и чипы
  // фраз идут через Range API, чтобы в черновик не затекала чужая разметка.
  const insertPlainText = useCallback(
    (txt) => {
      const clean = String(txt || '').replace(/\r/g, '')
      const ed = editorRef.current
      if (!ed) return
      ed.focus()
      restoreRange()
      try {
        const sel = window.getSelection()
        if (sel && sel.rangeCount) {
          const r = sel.getRangeAt(0)
          r.deleteContents()
          const node = document.createTextNode(clean)
          r.insertNode(node)
          r.setStartAfter(node)
          r.setEndAfter(node)
          sel.removeAllRanges()
          sel.addRange(r)
          lastRangeRef.current = r.cloneRange()
          return
        }
      } catch {
        /* без селекшена просто дописываем в конец */
      }
      ed.appendChild(document.createTextNode(clean))
    },
    [restoreRange],
  )

  // Публичная вставка для панелей (фразы/связки/слова).
  const insertText = useCallback(
    (txt) => {
      insertPlainText(txt)
      markDirty()
    },
    [insertPlainText, markDirty],
  )

  // Полная замена содержимого (восстановление версии): единственное место,
  // где чужой код «пишет» в редактор, поэтому живёт внутри хука рядом с ref.
  const setContent = useCallback(
    (html) => {
      const ed = editorRef.current
      if (!ed) return
      ed.innerHTML = html || ''
      lastRangeRef.current = null
      markDirty()
    },
    [markDirty],
  )

  // Тулбар: единственное место, где живёт устаревший execCommand — он всё ещё
  // единственный кросс-браузерный способ B/список/абзац без своего движка.
  const exec = useCallback(
    (command) => {
      const ed = editorRef.current
      if (!ed) return
      ed.focus()
      restoreRange()
      try {
        if (command === 'formatBlock') document.execCommand('formatBlock', false, 'p')
        else document.execCommand(command, false, null)
      } catch {
        /* execCommand выключен — форматирование просто не применится */
      }
      markDirty()
    },
    [restoreRange, markDirty],
  )

  /* Сохранение: html/text/words дописываются в актуальный черновик из
     draftRef (там уже лежат свежие checks/assessment от WritingPad), затем
     saveDraft + снимок версии. 30-секундная склейка снимков — внутри
     snapshotDraft; force=true (явное «Сохранить») всегда создаёт новый. */
  const persist = useCallback(
    (force) => {
      const d = draftRef.current
      if (!d) return null
      const ed = editorRef.current
      const text = getText()
      const next = { ...d, html: ed ? ed.innerHTML : d.html, text, words: wordsOf(text).length }
      const saved = saveDraft(next) || next
      draftRef.current = saved
      snapshotDraft(saved.id, text, !!force)
      dirtyRef.current = false
      setLastSaved({ at: saved.updatedAt, words: saved.words })
      return saved
    },
    [draftRef, getText],
  )

  // Автосейв: раз в 3 с при dirty; флаш при уходе со вкладки — иначе
  // последние секунды набора терялись бы при закрытии.
  useEffect(() => {
    const iv = setInterval(() => {
      if (dirtyRef.current) persist(false)
    }, AUTOSAVE_MS)
    const onVis = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current) persist(false)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [persist])

  // Флаш на анмаунте — именно layout-cleanup: пассивный useEffect-cleanup
  // срабатывает уже ПОСЛЕ отцепления ref'ов (editorRef.current = null), и
  // getText увидел бы прошлый сохранённый текст вместо последних секунд
  // набора. Layout-cleanup бежит, пока div ещё в документе.
  useLayoutEffect(
    () => () => {
      if (dirtyRef.current) persist(false)
    },
    [persist],
  )

  // Таймер тика не должен пережить анмаунт.
  useEffect(
    () => () => {
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current)
    },
    [],
  )

  // Сколько «моих слов» уже в тексте — для метрики. goldSeen помечает слово
  // как встреченное (по разу за работу, см. комментарий у goldSeenRef).
  const countGold = useCallback(
    (txt) => {
      const low = String(txt || '').toLowerCase()
      let n = 0
      ;(getGoldWords ? getGoldWords() : []).forEach((w) => {
        if (low.indexOf(String(w).toLowerCase()) >= 0) {
          n++
          goldSeenRef.current[w] = true
        }
      })
      return n
    },
    [getGoldWords],
  )

  /* Золотая подсветка «моих слов» — ТОЛЬКО на blur (порт highlightMyWords):
     переписывать DOM под каретом во время набора нельзя, а после ухода из
     редактора это безопасно. Старые span'ы снимаются, текст нормализуется,
     TreeWalker заворачивает совпадения заново. */
  const highlightGold = useCallback(() => {
    const ed = editorRef.current
    if (!ed || document.activeElement === ed) return
    const words = (getGoldWords ? getGoldWords() : []).filter((w) => w && w.length > 2)
    if (!words.length) return
    const rx = new RegExp('\\b(' + words.map(escapeRx).join('|') + ')\\b', 'gi')
    ed.querySelectorAll('span.wr-wgold').forEach((s) => s.parentNode.replaceChild(document.createTextNode(s.textContent), s))
    ed.normalize()
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, null, false)
    const nodes = []
    let n
    while ((n = walker.nextNode())) nodes.push(n)
    nodes.forEach((node) => {
      const text = node.nodeValue
      rx.lastIndex = 0
      if (!rx.test(text)) return
      rx.lastIndex = 0
      const frag = document.createDocumentFragment()
      let last = 0
      let m
      while ((m = rx.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)))
        const span = document.createElement('span')
        span.className = 'wr-wgold'
        span.textContent = m[0]
        frag.appendChild(span)
        last = m.index + m[0].length
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
      node.parentNode.replaceChild(frag, node)
    })
  }, [getGoldWords])

  // Обработчики для JSX-спреда на contentEditable-div.
  const handlers = {
    onInput: markDirty,
    onKeyUp: saveRange,
    onMouseUp: saveRange,
    onBlur: () => {
      saveRange()
      highlightGold()
    },
    // Вставка принудительно плоским текстом — стили из Word/сайтов не нужны.
    onPaste: (e) => {
      e.preventDefault()
      let txt = ''
      try {
        txt = e.clipboardData.getData('text/plain')
      } catch {
        txt = ''
      }
      insertPlainText(txt)
      markDirty()
    },
    onDrop: (e) => {
      e.preventDefault()
      let txt = ''
      try {
        txt = e.dataTransfer.getData('text/plain')
      } catch {
        txt = ''
      }
      if (txt) {
        insertPlainText(txt)
        markDirty()
      }
    },
  }

  return { editorRef, handlers, tick, lastSaved, getText, insertText, setContent, exec, persist, countGold, highlightGold }
}
