import { useCallback, useEffect, useRef, useState } from 'react'
import { cleanWord, translateWord } from '../../lib/wordTranslate.js'
import { saveWord } from '../../api.js'

// Тап-перевод слова в живом уроке — тот же приём, что в читалке книг
// (BookDetail.jsx: словарь книги → gtx-перевод → сохранение в личный словарь),
// портирован сюда без книжного словаря (в уроке его нет — сразу gtx) и с
// попапом, позиционированным через position: fixed от вьюпорта, а не от
// скроллящегося хоста — карточка живого урока не таскает попап вручную при
// прокрутке, фиксированная позиция уже держит его у слова.
//
// openWord/close/onSave стабильны (useCallback без зависимостей, актуальные
// token/lang/source и pop читаются из рефов) — InfoBlock, куда openWord
// уходит пропом, обёрнут в memo специально для того, чтобы не пересобирать
// <audio> внутри разметки на каждый поллинг живого урока (см. комментарий
// там); нестабильная ссылка на функцию сломала бы этот memo так же, как
// сломал бы её сам объект block.
export function useTapTranslate({ token, lang, source }) {
  const tl = lang === 'kk' ? 'kk' : 'ru'
  const [pop, setPop] = useState(null)
  const popRef = useRef(null)
  useEffect(() => {
    popRef.current = pop
  }, [pop])
  const seqRef = useRef(0)
  const ctxRef = useRef({ token, tl, source })
  useEffect(() => {
    ctxRef.current = { token, tl, source }
  })

  const openWord = useCallback((raw, anchorEl) => {
    const w = cleanWord(raw)
    if (!w || !anchorEl) return
    const seq = ++seqRef.current
    const rect = anchorEl.getBoundingClientRect()
    setPop({ word: w, translation: '', alternates: [], loading: true, saving: false, saved: false, rect })
    translateWord(w, ctxRef.current.tl)
      .then(
        (t) =>
          seqRef.current === seq &&
          setPop((p) => p && { ...p, translation: t.tr, alternates: t.alternates, loading: false }),
      )
      .catch(() => seqRef.current === seq && setPop((p) => p && { ...p, loading: false }))
  }, [])

  const close = useCallback(() => setPop(null), [])

  const onSave = useCallback(async () => {
    const current = popRef.current
    if (!current?.translation || current.saving || current.saved) return
    const seq = seqRef.current
    setPop((p) => p && { ...p, saving: true })
    try {
      await saveWord(ctxRef.current.token, {
        word: current.word,
        translation: current.translation,
        alternates: current.alternates.length ? current.alternates.join(', ') : undefined,
        language: ctxRef.current.tl,
        source: ctxRef.current.source,
      })
      if (seqRef.current === seq) setPop((p) => p && { ...p, saving: false, saved: true })
    } catch {
      if (seqRef.current === seq) setPop((p) => p && { ...p, saving: false })
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return { pop, openWord, close, onSave }
}
