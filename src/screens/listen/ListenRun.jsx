'use client'

// Один тест: сессия (src/practice/listen/session.js) + звук + экран задания или
// итога. Сессия одна на монтирование (ListenPage перемонтирует прогон по
// nonce) и без побочных эффектов в конструкторе, поэтому создаётся лениво в
// useState; уходя, экран гасит звук. Автоплей как в прототипе: слово через
// 0,35 с после открытия задания, предложение — через 1,5 с после слова.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { enMain } from '../../practice/listen/compare.js'
import { hasSentence, sentenceRef } from '../../practice/listen/rules.js'
import { ListenSession } from '../../practice/listen/session.js'
import { prefetch, say, silence } from '../../practice/listen/voice.js'
import { recordSkill } from '../../practice/skillStats.js'
import ListenResult from './ListenResult.jsx'
import ListenTask from './ListenTask.jsx'

const WORD_DELAY = 350
const SENTENCE_DELAY = 1500

export default function ListenRun({ cards, owner, run, t, onExit, onRestart, onRedo, onFinish }) {
  const [settled, setSettled] = useState(null)
  const [session] = useState(
    () =>
      new ListenSession({
        cards,
        onSay: (text, kind) => say(text, { kind }),
        // Навык «аудирование» растёт от задания, где верны и слово, и предложение.
        onItem: ({ wordOk, sentOk }) => recordSkill('listening', wordOk && sentOk),
        onDone: (summary) => setSettled(onFinish(summary)),
      }),
  )

  useEffect(() => () => silence(), [])

  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  const index = snap.index
  const card = snap.phase === 'task' ? cards[index] : null
  const step = snap.item?.step

  // Слово звучит само; заодно греем предложение задания и следующее слово.
  useEffect(() => {
    if (!card) return undefined
    if (hasSentence(card)) prefetch(sentenceRef(card))
    if (cards[index + 1]) prefetch(enMain(cards[index + 1].en))
    const id = setTimeout(() => say(enMain(card.en), { kind: 'word' }), WORD_DELAY)
    return () => clearTimeout(id)
  }, [card, cards, index])

  useEffect(() => {
    if (!card || step !== 'sent' || !hasSentence(card)) return undefined
    const id = setTimeout(() => say(sentenceRef(card), { kind: 'sentence' }), SENTENCE_DELAY)
    return () => clearTimeout(id)
  }, [card, step])

  useEffect(() => {
    if (snap.phase === 'result') window.scrollTo(0, 0)
  }, [snap.phase])

  if (snap.phase === 'result') {
    return (
      <ListenResult
        summary={snap.summary}
        settled={settled}
        owner={owner}
        t={t}
        onRedo={onRedo}
        onRestart={onRestart}
        onExit={onExit}
      />
    )
  }
  return <ListenTask snap={snap} session={session} owner={owner} run={run} t={t} onQuit={onExit} />
}
