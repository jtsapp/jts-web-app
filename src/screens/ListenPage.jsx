'use client'

// Just Listen It — раздел Практики: слышишь слово и пишешь его по буквам, потом
// записываешь на слух предложение с ним. Порт data/jtslisten.html. Наборы —
// с бэкенда (/mobile/listen; их загружает админка в MinIO), движок —
// src/practice/listen/, экраны — src/screens/listen/.
//
// Экран держит навигацию раздела (меню → набор → тест) и итог теста: монеты в
// баланс (только прирост к лучшему), лучший результат, ошибки в «Словарь».

import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { completeLessonModule } from '../api.js'
import { isTeacher } from '../lib/jwt.js'
import { unlockSpeech } from '../lib/speech.js'
import { readBest, recordBest } from '../practice/listen/listenProgress.js'
import { coinsToCredit } from '../practice/listen/rules.js'
import { enMain, first } from '../practice/listen/compare.js'
import { makeDeck, runDeck, shuffle } from '../practice/listen/runs.js'
import { silence } from '../practice/listen/voice.js'
import { LISTEN_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { recordVocabMisses } from './vocab/vocabMisses.js'
import { useListenIndex, useListenSet } from './listen/useListenData.js'
import Icon from './listen/ListenIcons.jsx'
import ListenMenu from './listen/ListenMenu.jsx'
import ListenSetView from './listen/ListenSetView.jsx'
import ListenRun from './listen/ListenRun.jsx'

function Notice({ status, t, onRetry }) {
  const text = {
    missing: t('listen.notUploaded'),
    guest: t('listen.guest'),
    error: t('listen.loadError'),
  }[status] || t('listen.loading')
  return (
    <div className={`jl-notice${status === 'error' ? ' jl-notice--err' : ''}`} role="status">
      {text}
      {status === 'error' && (
        <button type="button" className="jl-btn jl-btn--ghost jl-btn--sm" onClick={onRetry}>
          {t('listen.retry')}
        </button>
      )}
    </div>
  )
}

export default function ListenPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel, initialTarget }) {
  const { t } = useI18n()
  const index = useListenIndex(token)
  const [setId, setSetId] = useState(initialTarget?.set || null)
  const set = useListenSet(token, setId)
  // run: { owner (набор или null у своего списка), run, cards, nonce }
  const [run, setRun] = useState(null)
  const [best, setBest] = useState(readBest)

  useEffect(() => {
    const sync = () => setBest(readBest())
    window.addEventListener(LISTEN_PROGRESS_EVENT, sync)
    return () => {
      window.removeEventListener(LISTEN_PROGRESS_EVENT, sync)
      silence()
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [setId, run?.nonce])

  const start = (owner, r, cards) => {
    unlockSpeech() // в тике нажатия: иначе iPhone не пустит автоплей слова
    setRun({ owner, run: r, cards, nonce: Date.now() })
  }

  // Итог теста: зачисление считается от лучшего ДО записи нового.
  const finish = (summary) => {
    const key = run.run.key
    const prev = key ? readBest()[key] : null
    const credit = coinsToCredit(summary.earned, prev, !!key)
    if (key) recordBest(key, { ok: summary.ok, n: summary.n, coins: summary.earned })
    if (token && credit > 0) completeLessonModule(token, credit).catch(() => {})
    if (token && summary.wrong.length) {
      recordVocabMisses(token, summary.wrong.map((c) => ({ word: enMain(c.en), ru: first(c.ru), kk: '' })))
    }
    return { credit, keyed: !!key }
  }

  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'listening' }))

  let body
  if (run) {
    body = (
      <ListenRun
        key={run.nonce}
        cards={run.cards}
        owner={run.owner}
        run={run.run}
        t={t}
        onExit={() => setRun(null)}
        onRestart={() => start(run.owner, run.run, run.run.key ? runDeck(run.run) : shuffle(run.cards))}
        onRedo={(cards) => start(run.owner, { key: null, kind: 'redo', title: run.run.title }, shuffle(cards))}
        onFinish={finish}
      />
    )
  } else if (!token) {
    body = <Notice status="guest" t={t} />
  } else if (setId) {
    body =
      set.status === 'ready' ? (
        <ListenSetView
          set={set.set}
          best={best}
          t={t}
          onBack={() => setSetId(null)}
          onStart={(r) => start(set.set, r, runDeck(r))}
        />
      ) : (
        <Notice status={set.status} t={t} onRetry={set.retry} />
      )
  } else if (index.status === 'ready') {
    body = (
      <ListenMenu
        index={index.index}
        best={best}
        teacher={isTeacher(token)}
        t={t}
        onOpen={setSetId}
        onOwn={(rows) => start(null, { key: null, kind: 'own', title: t('listen.own.name') }, makeDeck(rows))}
      />
    )
  } else {
    body = <Notice status={index.status} t={t} onRetry={index.retry} />
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="jl">
        {!run && !setId && (
          <div className="jl-top">
            <button type="button" className="jl-back" onClick={goBack}>
              <Icon name="back" /> {backLabel || t('listen.toPractice')}
            </button>
            <span className="jl-crumb">
              <b>{t('listen.title')}</b>
            </span>
          </div>
        )}
        {body}
      </div>
    </LearningLayout>
  )
}
