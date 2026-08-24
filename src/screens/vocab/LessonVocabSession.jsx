import { useCallback, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { initVoices, speak as ttsSpeak } from '../../practice/vocab/audio.js'
import { completeLessonVocabCycle } from '../../api.js'
import {
  keyOf,
  uniqueByKey,
  translationOf,
  planCycle,
  foldResults,
  shouldOfferCycle4,
} from './lessonReview.js'
import { ChoiceTask, MatchTask, DictationTask, WriteTask } from './lessonTasks.jsx'

function toWord(row) {
  return {
    key: keyOf(row.word),
    word: row.word,
    translationRu: row.translationRu,
    translationKz: row.translationKz,
    ipa: row.ipa,
  }
}

function isSavedDeck(session) {
  return session?.lessonId == null || session?.code === 'SAVED'
}

function nextPracticeCycle(session, saved) {
  const done = session.finishedCycle || 0
  if (saved) {
    // Личный словарь не закрывается после циклов — новые слова приходят постоянно.
    return done >= 3 ? 1 : done + 1
  }
  if (done >= 4) return 0
  if (done === 3) return shouldOfferCycle4(session.cycleResults?.[3] || session.cycleResults?.['3'] || {}) ? 4 : 0
  return done + 1
}

export default function LessonVocabSession({ session, token, lang, onExit, onFinished }) {
  const { t } = useI18n()
  const saved = isSavedDeck(session)
  const words = useMemo(
    () => uniqueByKey((session.words || []).map(toWord)),
    [session.words],
  )
  const byKey = useMemo(() => Object.fromEntries(words.map((w) => [w.key, w])), [words])

  const startCycle = nextPracticeCycle(session, saved)

  const [cycle, setCycle] = useState(startCycle)
  const [tasks, setTasks] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [phase, setPhase] = useState('preview')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [taskNonce, setTaskNonce] = useState(0)

  const speak = useCallback((text) => {
    initVoices()
    ttsSpeak(text, { onNoVoice: () => setToast(t('vocab.lesson.noVoice')) })
  }, [t])

  const begin = () => {
    setTasks(planCycle(words, cycle, cycle === 1 ? null : session.cycleResults?.[cycle - 1] || null))
    setIdx(0)
    setAnswers([])
    setPhase('task')
  }

  const task = tasks[idx]
  const progress = tasks.length ? Math.round((idx / tasks.length) * 100) : 0

  const finishCycle = async (allAnswers) => {
    setSaving(true)
    try {
      const results = foldResults(allAnswers)
      const next = await completeLessonVocabCycle(session.lessonId, cycle, results, token)
      const nextCycle = cycle + 1
      if (nextCycle === 4 && !shouldOfferCycle4(results)) {
        onFinished?.(next)
        setCycle(saved ? 1 : 0)
        setTasks([])
        setPhase('preview')
        return
      }
      if (nextCycle > 4) {
        onFinished?.(next)
        setCycle(saved ? 1 : 0)
        setTasks([])
        setPhase('preview')
        return
      }
      setCycle(nextCycle)
      setTasks(planCycle(words, nextCycle, results))
      setIdx(0)
      setAnswers([])
      setPhase('between')
    } catch {
      setToast(t('vocab.lesson.saveError'))
      setTaskNonce((n) => n + 1)
    } finally {
      setSaving(false)
    }
  }

  const onDone = (chunk) => {
    const next = answers.concat(chunk)
    setAnswers(next)
    if (idx + 1 >= tasks.length) finishCycle(next)
    else setIdx(idx + 1)
  }

  if (phase === 'preview' || phase === 'done') {
    const canTest = cycle > 0 && words.length > 0
    const restart = saved && (session.finishedCycle || 0) >= 3
    return (
      <section className="v-screen v-show">
        <div className="v-scroll v-pad">
          {canTest && !restart && <p className="v-chip">{t('vocab.lesson.cycleOf', { n: cycle })}</p>}
          <h1 className="v-setup-title">{session.title || t('vocab.lesson.savedTitle')}</h1>
          <p className="v-setup-lead">
            {words.length
              ? t('vocab.lesson.previewLead', { n: words.length })
              : t('vocab.lesson.empty')}
          </p>
          {words.length > 0 && (
            <ul className="v-lv-preview">
              {words.map((w) => (
                <li key={w.key}>
                  <b>{w.word}</b>
                  <span>{translationOf(w, lang)}</span>
                </li>
              ))}
            </ul>
          )}
          {canTest && (
            <button type="button" className="v-btn" onClick={begin}>
              {restart ? t('vocab.lesson.reviewAgain') : t('vocab.lesson.startTest')}
            </button>
          )}
          <button type="button" className="v-btn v-ghost" onClick={onExit}>
            {t('vocab.lesson.back')}
          </button>
        </div>
      </section>
    )
  }

  if (phase === 'between') {
    return (
      <section className="v-screen v-show">
        <div className="v-scroll v-pad">
          <p className="v-chip">{t('vocab.lesson.cycleOf', { n: cycle - 1 })}</p>
          <h1 className="v-setup-title">{t('vocab.lesson.nextCycle', { n: cycle })}</h1>
          <p className="v-setup-lead">
            {cycle === 4 ? t('vocab.lesson.cycle4Lead') : t('vocab.lesson.cycleLead')}
          </p>
          <button type="button" className="v-btn" onClick={() => setPhase('task')}>
            {t('vocab.lesson.continue')}
          </button>
        </div>
      </section>
    )
  }

  if (!task) {
    return (
      <section className="v-screen v-show">
        <div className="v-scroll v-pad">
          <p className="v-lv-state">{t('vocab.lesson.empty')}</p>
          <button type="button" className="v-btn v-ghost" onClick={onExit}>{t('vocab.lesson.back')}</button>
        </div>
      </section>
    )
  }

  const bank = words
  const itemWords = uniqueByKey((task.wordKeys || []).map((k) => byKey[k]).filter(Boolean))

  return (
    <section className="v-screen v-show">
      <div className="v-sess-top">
        <button type="button" className="v-sess-x" onClick={onExit} aria-label={t('vocab.lesson.back')}>✕</button>
        <div className="v-lv-head">
          <b>{t('vocab.lesson.cycleOf', { n: cycle })}</b>
          <span>{idx + 1} / {tasks.length}</span>
        </div>
      </div>
      <div className="v-lv-bar"><i style={{ width: `${progress}%` }} /></div>
      <div className="v-scroll v-pad">
        {task.type === 'choice' && itemWords[0] && (
          <ChoiceTask key={`${cycle}-${idx}-${taskNonce}`} word={itemWords[0]} bank={bank} lang={lang} t={t} onDone={onDone} />
        )}
        {task.type === 'match' && itemWords.length >= 3 && (
          <MatchTask key={`${cycle}-${idx}-${taskNonce}`} words={itemWords} lang={lang} t={t} onDone={onDone} />
        )}
        {task.type === 'match' && itemWords.length < 3 && itemWords[0] && (
          <ChoiceTask key={`${cycle}-${idx}-${taskNonce}`} word={itemWords[0]} bank={bank} lang={lang} t={t} onDone={onDone} />
        )}
        {task.type === 'dictation' && itemWords[0] && (
          <DictationTask key={`${cycle}-${idx}-${taskNonce}`} word={itemWords[0]} t={t} speak={speak} onDone={onDone} />
        )}
        {task.type === 'write' && itemWords[0] && (
          <WriteTask key={`${cycle}-${idx}-${taskNonce}`} word={itemWords[0]} t={t} onDone={onDone} />
        )}
        {saving && <p className="v-lv-state">{t('vocab.lesson.saving')}</p>}
        {toast && <p className="v-lv-state">{toast}</p>}
      </div>
    </section>
  )
}
