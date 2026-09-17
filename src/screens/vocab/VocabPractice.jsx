import { useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { initVoices, speak as ttsSpeak } from '../../practice/vocab/audio.js'
import { useTimeOnTask } from '../../lib/useTimeOnTask.js'
import {
  uniqueByKey,
  planCycle,
  fitTasks,
  translationOf,
  meaningOf,
  normalizeAnswer,
  latinLookalikes,
  answersMatch,
  writeTranslationOk,
  buildChoiceOptions,
} from './lessonReview.js'
import { recordVocabMisses, clearVocabMiss } from './vocabMisses.js'
import { recordVocabLearned, vocabKey } from './vocabLearned.js'
import { saveStudentVocab, markVocabLearned } from '../../api.js'
import {
  IconSpeaker,
  IconCheck,
  IconX,
  IconPlay,
  IconRefresh,
  IconPin,
  IconBulb,
  IconBookmark,
} from './VocabIcons.jsx'

function toWord(card) {
  return {
    key: vocabKey(card),
    word: card.en,
    translationRu: card.ru,
    translationKz: card.kk,
    ipa: card.ipa,
    example: card.example || card.ex || '',
    def: card.def || '',
    nogap: !!card.nogap,
  }
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sentenceFor(word) {
  const raw = String(word.example || '')
  if (!raw) return null
  // Поддержка эталона: слово в тексте, {{word}}, или пропуск ___ / ______
  if (/_{3,}/.test(raw) || /\{\{.+?\}\}/.test(raw)) {
    return raw
      .replace(/\{\{.+?\}\}/g, '________')
      .replace(/_{3,}/g, '________')
  }
  const blanked = raw.replace(new RegExp(`\\b${escapeRe(word.word)}\\b`, 'i'), '________')
  if (!blanked.includes('________')) return null
  return blanked
}

/** Пропуск, который имеет смысл спрашивать набором: ровно один и не выданный
 *  самим предложением. В двух пропусках («I ___ as much ___ online» у waste
 *  time) слово разорвано, а ячейки ждут его целиком; флаг nogap ставит файл
 *  словаря, когда слово видно в тексте (call stack: «Each function call…»). */
function gapSentence(word) {
  if (word.nogap) return null
  const gaps = String(word.example || '').match(/_{3,}|\{\{.+?\}\}/g) || []
  if (gaps.length > 1) return null
  return sentenceFor(word)
}

/** Перевод, который можно написать буквами. У чисел A0 «перевод» — цифра
 *  (seven → «7»): «семь» тоже верно, и такое честнее спросить на слух. */
function canAskTranslation(word) {
  return [word.translationRu, word.translationKz].some((tr) => /\p{L}/u.test(String(tr || '')))
}

/** Буква или цифра — под неё ячейка; пробел и знаки стоят готовыми. */
const isSlot = (ch) => /[\p{L}\p{N}]/u.test(ch)

/** Одна буква совпала — с той же терпимостью к двойникам, что и всё слово. */
function sameLetter(a, b) {
  return !!a && latinLookalikes(a).toLowerCase() === latinLookalikes(b).toLowerCase()
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function examplePlain(word) {
  return String(word.example || '')
    .replace(/\{\{(.+?)\}\}/g, '$1')
    .replace(/___+/g, word.word || '')
    .trim()
}

function exampleHtml(word) {
  const raw = String(word.example || '')
  if (!raw) return ''
  const w = word.word || ''
  if (/\{\{.+\}\}/.test(raw) || /___+/.test(raw)) {
    return raw
      .replace(/\{\{(.+?)\}\}/g, '<b>$1</b>')
      .replace(/___+/g, w ? `<b>${w}</b>` : '___')
  }
  if (!w) return raw
  return raw.replace(new RegExp(`\\b(${escapeRe(w)})\\b`, 'i'), '<b>$1</b>')
}

/** Карточка «Правильный ответ» при ошибке (слово / IPA / перевод / пример). */
function CorrectReveal({ word, lang, t, speak, token }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const tr = translationOf(word, lang)
  // Показываем значение, а сохраняем только перевод: определение B2 в поле
  // translationRu личного словаря выдавало бы себя за перевод.
  const meaning = meaningOf(word, lang)
  const ipa = word.ipa ? `/${String(word.ipa).replace(/\//g, '')}/` : ''
  const exHtml = exampleHtml(word)
  const exSpeak = examplePlain(word)

  const save = () => {
    if (!token || saved || saving) return
    setSaving(true)
    const body = { word: word.word, source: 'practice' }
    if (lang === 'kk') {
      if (word.translationKz || word.kk) body.translationKz = word.translationKz || word.kk
      else if (tr) body.translationKz = tr
    } else if (word.translationRu || word.ru || tr) {
      body.translationRu = word.translationRu || word.ru || tr
    }
    if (word.ipa) body.ipa = String(word.ipa).replace(/\//g, '')
    saveStudentVocab(token, body)
      .then(() => markVocabLearned(token, [word.word]).catch(() => {}))
      .then(() => setSaved(true))
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  return (
    <div className="vp-reveal">
      <div className="vp-reveal-card">
        <div className="vp-reveal-lbl">{t('vocab.prac.rightAnswer')}</div>
        <div className="vp-reveal-row">
          <div className="vp-reveal-main">
            <b className="vp-reveal-word">{word.word}</b>
            {ipa ? <span className="vp-reveal-ipa">{ipa}</span> : null}
            {meaning ? <span className="vp-reveal-tr">— {meaning}</span> : null}
          </div>
          <div className="vp-reveal-acts">
            {speak ? (
              <button type="button" className="vp-spk" onClick={() => speak(word.word)} aria-label={t('vocab.lesson.listen')}>
                <IconSpeaker />
              </button>
            ) : null}
            {token ? (
              <button
                type="button"
                className={`vp-spk vp-bookmark${saved ? ' is-on' : ''}`}
                onClick={save}
                disabled={saved || saving}
                aria-label={saved ? t('vocab.prac.saved') : t('vocab.prac.saveWord')}
                title={saved ? t('vocab.prac.saved') : t('vocab.prac.saveWord')}
              >
                <IconBookmark />
              </button>
            ) : null}
          </div>
        </div>
        {exHtml ? (
          <div className="vp-reveal-ex">
            <span dangerouslySetInnerHTML={{ __html: exHtml }} />
            {speak && exSpeak ? (
              <button type="button" className="vp-spk" onClick={() => speak(exSpeak)} aria-label={t('vocab.lesson.listen')}>
                <IconSpeaker />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="vp-fb no">
        <IconX /> {t('vocab.prac.incorrect')}
      </div>
    </div>
  )
}

function AnswerFeedback({ ok, word, lang, t, speak, token }) {
  if (ok) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span className="vp-fb ok"><IconCheck /> {t('vocab.prac.correct')}</span>
      </div>
    )
  }
  return <CorrectReveal word={word} lang={lang} t={t} speak={speak} token={token} />
}

export default function VocabPractice({ cards, lang, title, onExit, speak: speakProp, token, scopeId, onLearned }) {
  const { t } = useI18n()
  // Практика «Словаря» — «actual» модуля vocabulary_sr недельной сводки. Экран
  // смонтирован ровно пока идёт практика, поэтому считаем всё его время.
  useTimeOnTask('vocabulary_sr', { token })
  const words = useMemo(() => uniqueByKey((cards || []).map(toWord).filter((w) => w.word)), [cards])
  const byKey = useMemo(() => Object.fromEntries(words.map((w) => [w.key, w])), [words])
  const [phase, setPhase] = useState('intro')
  const [tasks] = useState(() => fitTasks(planCycle(words, 1, null), byKey, lang))
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [toast, setToast] = useState('')
  const recordedRef = useRef(false)

  const speak = (text, opts) => {
    initVoices()
    ttsSpeak(text, {
      rate: opts?.slow ? 0.65 : undefined,
      onNoVoice: () => {
        setToast(t('vocab.lesson.noVoice'))
        speakProp?.(text)
      },
    })
  }

  const correct = answers.filter((a) => a.ok).length
  const wrong = answers.length - correct
  const totalQ = Math.max(1, tasks.reduce((n, task) => n + (task.wordKeys?.length || 1), 0))
  const answeredQ = answers.length
  const progress = Math.min(100, Math.round((answeredQ / totalQ) * 100))

  const onDone = (chunk) => {
    const next = answers.concat(chunk)
    setAnswers(next)
    if (idx + 1 >= tasks.length) setPhase('result')
    else setIdx(idx + 1)
  }

  if (!words.length) {
    return (
      <div className="vp-prac">
        <p className="vp-state">{t('vocab.lesson.empty')}</p>
        <button type="button" className="vp-btn ghost" onClick={onExit}>{t('vocab.back')}</button>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="vp-prac">
        <div className="vp-prac-top">
          <button type="button" className="vp-exit" onClick={onExit}>
            <IconX /> <span className="vp-exit-lbl">{t('vocab.prac.exit')}</span>
          </button>
        </div>
        <div className="vp-intro">
          <span className="vp-badge">{t('vocab.prac.check')}</span>
          <div className="big">{t('vocab.home.words', { n: words.length })}</div>
          <h2>{t('vocab.prac.introTitle')}</h2>
          <p>{t('vocab.prac.introLead')}</p>
          <button type="button" className="vp-btn wide" onClick={() => setPhase('run')}>
            {t('vocab.prac.start')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const missMap = {}
    for (const a of answers) {
      if (!a.ok && a.key && byKey[a.key]) missMap[a.key] = byKey[a.key]
    }
    const missed = Object.values(missMap).slice(0, 3)
    const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0
    const good = pct >= 50
    const headline = pct >= 85
      ? t('vocab.prac.resGreat')
      : good
        ? t('vocab.prac.resOk')
        : t('vocab.prac.resBad')

    if (!recordedRef.current) {
      recordedRef.current = true
      const allMissed = Object.values(missMap)
      if (allMissed.length) recordVocabMisses(token, allMissed)
      const okKeys = [...new Set(answers.filter((a) => a.ok && a.key).map((a) => a.key))]
      // Верно отвеченное уходит из «хуже всего запомненных». Снятия не было
      // нигде: список только копился, и слово, которое ученик уже знает,
      // висело на главной словаря навсегда.
      for (const k of okKeys) if (!missMap[k]) clearVocabMiss(token, k)
      if (scopeId && okKeys.length) recordVocabLearned(token, scopeId, okKeys)
      if (okKeys.length) onLearned?.(okKeys)
    }

    return (
      <div className="vp-prac vp-prac--res">
        <div className={`vp-res-card${good ? ' is-good' : ' is-bad'}`}>
          <div className="vp-res-hero" aria-hidden="true">
            <img
              src={good ? '/practice/listening/win.png' : '/practice/listening/lose.png'}
              alt=""
            />
          </div>
          <div className="vp-res-body">
            <h2>{headline}</h2>
            <div className="vp-res-stats">
              <span className="ok"><IconCheck /> {t('vocab.prac.correctN', { n: correct })}</span>
              <span className={`no${wrong > 0 && !good ? ' solid' : ''}`}>
                <IconX /> {t('vocab.prac.wrongN', { n: wrong })}
              </span>
            </div>
            {missed.length > 0 && (
              <div className="vp-res-list">
                <h4>
                  <IconRefresh />
                  {t('vocab.prac.review')}
                </h4>
                {missed.map((w) => (
                  <div className="row" key={w.key}>
                    <b>
                      <button
                        type="button"
                        className="vp-spk"
                        onClick={() => speak(w.word)}
                        aria-label={t('vocab.lesson.listen')}
                      >
                        <IconSpeaker />
                      </button>
                      {w.word}
                    </b>
                    <span>{translationOf(w, lang)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="acts">
              <button type="button" className="vp-btn wide" onClick={onExit}>
                {t('vocab.prac.backDict')}
              </button>
              <button
                type="button"
                className="vp-btn ghost wide"
                onClick={() => {
                  recordedRef.current = false
                  setIdx(0)
                  setAnswers([])
                  setPhase('intro')
                }}
              >
                <IconRefresh /> {t('vocab.prac.again')}
              </button>
            </div>
          </div>
        </div>
        {toast ? <p className="vp-state">{toast}</p> : null}
      </div>
    )
  }

  const task = tasks[idx]
  const itemWords = uniqueByKey((task?.wordKeys || []).map((k) => byKey[k]).filter(Boolean))
  const qLabel = t('vocab.prac.questionOf', { n: Math.min(answeredQ + 1, totalQ), total: totalQ })

  return (
    <div className="vp-prac">
      <div className="vp-prac-top">
        <button type="button" className="vp-exit" onClick={onExit}>
          <IconX /> <span className="vp-exit-lbl">{t('vocab.prac.exit')}</span>
        </button>
        <div className="vp-prac-title">
          <b>{title || t('vocab.practiceTitle')}</b>
          <span>{qLabel}</span>
        </div>
      </div>
      <div className="vp-meter-row">
        <div className="vp-meter"><i style={{ width: `${progress}%` }} /></div>
        <div className="vp-score">
          <span className="ok"><IconCheck /> {correct}</span>
          <span className="no"><IconX /> {wrong}</span>
        </div>
      </div>

      {task?.type === 'choice' && itemWords[0] && (
        <ChoiceUI key={idx} word={itemWords[0]} bank={words} lang={lang} t={t} speak={speak} token={token} onDone={onDone} />
      )}
      {task?.type === 'match' && itemWords.length >= 3 && (
        <MatchUI key={idx} words={itemWords} lang={lang} t={t} onDone={onDone} />
      )}
      {task?.type === 'match' && itemWords.length < 3 && itemWords[0] && (
        <ChoiceUI key={idx} word={itemWords[0]} bank={words} lang={lang} t={t} speak={speak} token={token} onDone={onDone} />
      )}
      {task?.type === 'dictation' && itemWords[0] && (
        <DictationUI key={idx} word={itemWords[0]} lang={lang} t={t} speak={speak} token={token} onDone={onDone} />
      )}
      {task?.type === 'write' && itemWords[0] && (
        <WriteTask key={idx} word={itemWords[0]} lang={lang} t={t} speak={speak} token={token} onDone={onDone} />
      )}
      {toast ? <p className="vp-state">{toast}</p> : null}
    </div>
  )
}

/**
 * «Напишите слово». Чем спросить, решает само слово: предложение с одним
 * пропуском — набор по буквам; нет предложения, но перевод пишется буквами —
 * ввод перевода; иначе — на слух. Раньше без предложения всегда спрашивался
 * перевод, в том числе у B2, где его нет, — и любой ответ был ошибкой.
 */
function WriteTask(props) {
  const sentence = gapSentence(props.word)
  if (sentence) return <FillUI {...props} sentence={sentence} />
  if (canAskTranslation(props.word)) return <WriteUI {...props} />
  return <DictationUI {...props} />
}

function ChoiceUI({ word, bank, lang, t, speak, token, onDone }) {
  const options = useMemo(() => buildChoiceOptions(word, bank, lang), [word.key, lang, bank])
  const [picked, setPicked] = useState(null)
  if (!options) return <WriteTask word={word} lang={lang} t={t} speak={speak} token={token} onDone={onDone} />
  const byDefinition = !translationOf(word, lang)

  return (
    <>
      <p className="vp-howto">{t(byDefinition ? 'vocab.prac.askChoiceDef' : 'vocab.prac.askChoice')}</p>
      <div className="vp-wordbox">
        <div className="w">
          {word.word}
          {speak ? (
            <button type="button" className="vp-spk" onClick={() => speak(word.word)}>
              <IconSpeaker />
            </button>
          ) : null}
        </div>
        {word.ipa ? <div className="ipa">/{String(word.ipa).replace(/\//g, '')}/</div> : null}
      </div>
      <div className="vp-opts">
        {options.map((opt, i) => {
          let cls = ''
          if (picked) {
            if (opt.ok) cls = ' ok'
            else if (picked === opt) cls = ' no'
            else cls = ' dim'
          }
          return (
            <button
              key={i}
              type="button"
              className={`vp-opt${cls}`}
              disabled={!!picked}
              onClick={() => {
                if (picked) return
                setPicked(opt)
              }}
            >
              {opt.text}
            </button>
          )
        })}
      </div>
      {picked && (
        <AnswerFeedback ok={!!picked.ok} word={word} lang={lang} t={t} speak={speak} token={token} />
      )}
      <div className="vp-foot">
        <button
          type="button"
          className="vp-btn wide"
          disabled={!picked}
          onClick={() => onDone([{ key: word.key, ok: !!picked?.ok }])}
        >
          {t('vocab.prac.continue')} <IconPlay />
        </button>
      </div>
    </>
  )
}

/** «Соедините». Экспортируется ради теста — как и FillUI. */
export function MatchUI({ words, lang, t, onDone }) {
  const items = useMemo(() => uniqueByKey(words), [words])
  const left = useMemo(() => shuffle(items), [items])
  const right = useMemo(() => shuffle(items), [items])
  const [pick, setPick] = useState(null)
  // Сделанное — отдельно по колонкам: при одинаковых переводах слово слева
  // может сойтись с «чужой» кнопкой справа, и пара больше не одно слово.
  const [done, setDone] = useState({ L: {}, R: {} })
  const [flash, setFlash] = useState(null)
  const missedRef = useRef(new Set())
  const allDone = Object.keys(done.L).length === items.length
  const meaning = (w) => normalizeAnswer(meaningOf(w, lang))
  const byDefinition = items.every((w) => !translationOf(w, lang))

  const finish = () => {
    onDone(items.map((w) => ({ key: w.key, ok: !missedRef.current.has(w.key) })))
  }

  const click = (item, col) => {
    if (done[col][item.key]) return
    if (!pick || pick.col === col) {
      setPick({ item, col })
      return
    }
    const l = col === 'L' ? item : pick.item
    const r = col === 'R' ? item : pick.item
    // Пара верна и тогда, когда перевод у двух слов один: hello и hi — оба
    // «привет», и одинаковые кнопки справа не различить. Засчитывалась
    // только «своя» из двух — ученик жал на верный перевод и получал ошибку.
    const ok = l.key === r.key || (!!meaning(l) && meaning(l) === meaning(r))
    if (ok) {
      setDone((prev) => ({ L: { ...prev.L, [l.key]: true }, R: { ...prev.R, [r.key]: true } }))
      setPick(null)
      setFlash(null)
    } else {
      missedRef.current.add(l.key)
      missedRef.current.add(r.key)
      setFlash({ L: l.key, R: r.key })
      setPick(null)
      setTimeout(() => setFlash(null), 450)
    }
  }

  const cls = (item, col) => {
    if (done[col][item.key]) return ' ok'
    if (flash?.[col] === item.key) return ' no'
    if (pick?.item.key === item.key && pick.col === col) return ' sel'
    return ''
  }

  return (
    <>
      <p className="vp-howto">{t(byDefinition ? 'vocab.prac.askMatchDef' : 'vocab.prac.askMatch')}</p>
      <div className="vp-tip"><IconPin /> {t(byDefinition ? 'vocab.prac.matchTipDef' : 'vocab.prac.matchTip')}</div>
      <div className="vp-pairs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {left.map((w) => (
            <button key={`L-${w.key}`} type="button" className={`vp-pair${cls(w, 'L')}`} disabled={!!done.L[w.key]} onClick={() => click(w, 'L')}>
              {w.word}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {right.map((w) => (
            <button key={`R-${w.key}`} type="button" className={`vp-pair${cls(w, 'R')}`} disabled={!!done.R[w.key]} onClick={() => click(w, 'R')}>
              {meaningOf(w, lang)}
            </button>
          ))}
        </div>
      </div>
      <div className="vp-foot">
        <button type="button" className={`vp-btn wide${!allDone ? ' disabled' : ''}`} disabled={!allDone} onClick={finish}>
          {t('vocab.prac.continue')}
        </button>
      </div>
    </>
  )
}

function DictationUI({ word, lang, t, speak, token, onDone }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(null)
  const submit = () => {
    if (checked != null || !value.trim()) return
    const ok = answersMatch(value, word.word)
    setChecked(ok)
  }
  const cont = () => onDone([{ key: word.key, ok: !!checked }])

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askListen')}</p>
      <button type="button" className="vp-listen-big" onClick={() => speak(word.word)} aria-label={t('vocab.lesson.listen')}>
        <IconSpeaker size={28} />
      </button>
      <button type="button" className="vp-slow" onClick={() => speak(word.word, { slow: true })}>
        {t('vocab.prac.listenSlow')}
      </button>
      <input
        className={`vp-input${checked == null ? '' : checked ? ' ok' : ' no'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (checked == null ? submit() : cont())}
        placeholder={t('vocab.prac.typeWord')}
        autoCapitalize="off"
        autoCorrect="off"
        disabled={checked != null}
      />
      {checked != null && (
        <AnswerFeedback ok={!!checked} word={word} lang={lang} t={t} speak={speak} token={token} />
      )}
      <div className="vp-foot">
        {checked == null ? (
          <button type="button" className="vp-btn wide" disabled={!value.trim()} onClick={submit}>
            {t('vocab.lesson.check')}
          </button>
        ) : (
          <button type="button" className="vp-btn wide" onClick={cont}>
            {t('vocab.prac.continue')} <IconPlay />
          </button>
        )}
      </div>
    </>
  )
}

function WriteUI({ word, lang, t, speak, token, onDone }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(null)
  const submit = () => {
    if (checked != null || !value.trim()) return
    setChecked(writeTranslationOk(value, word))
  }
  const cont = () => onDone([{ key: word.key, ok: !!checked }])

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askWrite')}</p>
      <div className="vp-wordbox">
        <div className="w">
          {word.word}
          {speak ? (
            <button type="button" className="vp-spk" onClick={() => speak(word.word)}>
              <IconSpeaker />
            </button>
          ) : null}
        </div>
        {word.ipa ? <div className="ipa">/{String(word.ipa).replace(/\//g, '')}/</div> : null}
      </div>
      <input
        className={`vp-input${checked == null ? '' : checked ? ' ok' : ' no'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (checked == null ? submit() : cont())}
        placeholder={t('vocab.prac.typeTr')}
        disabled={checked != null}
      />
      {checked != null && (
        <AnswerFeedback ok={!!checked} word={word} lang={lang} t={t} speak={speak} token={token} />
      )}
      <div className="vp-foot">
        {checked == null ? (
          <button type="button" className="vp-btn wide" disabled={!value.trim()} onClick={submit}>
            {t('vocab.lesson.check')}
          </button>
        ) : (
          <button type="button" className="vp-btn wide" onClick={cont}>
            {t('vocab.prac.continue')} <IconPlay />
          </button>
        )}
      </div>
    </>
  )
}

/** Набор слова по буквам. Экспортируется ради теста: живьём до него надо
 *  пройти три задания подряд, а проверяется здесь ровно он. */
export function FillUI({ word, sentence, lang, t, speak, token, onDone }) {
  const letters = [...word.word]
  // Половина каталога — фразы: «look at», «What's your name?». Прочерк под
  // пробелом или апострофом выглядел как ещё одна буква — ученик набирал
  // верное слово, а «Проверить» оставалась серой. Ячейка теперь только под
  // букву или цифру, остальное стоит готовым.
  const slot = letters.map(isSlot)
  const firstSlot = slot.indexOf(true)
  const lastSlot = slot.lastIndexOf(true)
  const [chars, setChars] = useState(() => letters.map(() => ''))
  const [opened, setOpened] = useState(() => letters.map((_, i) => i === firstSlot))
  const [checked, setChecked] = useState(null)
  const [msg, setMsg] = useState('')
  const meaning = meaningOf(word, lang || 'ru')
  /** Позиция не ждёт ввода: открыта подсказкой или это не буква. */
  const fixed = (i) => opened[i] || !slot[i]
  const active = chars.findIndex((c, i) => !fixed(i) && !c)

  // Ячейки нужны, чтобы перевести фокус самим: без этого человек печатает
  // букву и ЖДЁТ, а курсор стоит на месте — приходится мышью тыкать в каждый
  // следующий прочерк. Про это и написали: «букву пишешь, потом нужно на
  // второй _ нажимать и только потом ещё букву».
  const boxes = useRef([])

  /** Следующая ячейка, куда имеет смысл встать: не открытая подсказкой. */
  const focusNext = (from) => {
    for (let j = from + 1; j < letters.length; j++) {
      if (!fixed(j)) {
        boxes.current[j]?.focus()
        return
      }
    }
  }

  const setAt = (i, ch) => {
    if (fixed(i) || checked != null) return
    const next = chars.slice()
    next[i] = ch.slice(-1)
    setChars(next)
    if (next[i]) focusNext(i)
  }

  // Курсор уезжает вперёд сам — значит, и назад его нужно вернуть без мыши:
  // Backspace в пустой ячейке стирает предыдущую букву и встаёт на неё.
  const onKeyDown = (i, e) => {
    if (e.key !== 'Backspace' || chars[i] || checked != null) return
    for (let j = i - 1; j >= 0; j--) {
      if (fixed(j)) continue
      e.preventDefault()
      const next = chars.slice()
      next[j] = ''
      setChars(next)
      boxes.current[j]?.focus()
      return
    }
  }

  const openLetter = () => {
    const i = opened.findIndex((o, idx) => !fixed(idx) && !chars[idx])
    if (i < 0) return
    const nextO = opened.slice()
    nextO[i] = true
    const nextC = chars.slice()
    nextC[i] = letters[i]
    setOpened(nextO)
    setChars(nextC)
  }

  const giveUp = () => {
    setChars(letters.slice())
    setOpened(letters.map(() => true))
    setChecked(false)
    setMsg('')
  }

  const submit = () => {
    if (checked != null) return
    const typed = chars.map((c, i) => (fixed(i) ? letters[i] : c)).join('')
    if (answersMatch(typed, word.word)) {
      setChecked(true)
      setMsg('')
      return
    }
    // Не сошлось. Раньше здесь просто звали openLetter() и советовали открыть
    // ещё букву — но открывает он только ПУСТУЮ ячейку, а на этом шаге пустых
    // уже нет: все заполнены, иначе кнопка «Проверить» была бы недоступна.
    // Кнопка молчала, совет повторялся, и единственным выходом оставалось
    // «Не помню» — то есть засчитанная ошибка. Так и выглядела жалоба
    // «пишет ошибку, хоть и верно»: на экране целое правильное слово и
    // красный вердикт.
    //
    // Поэтому чистим ровно неверные буквы (верные человек уже угадал — отнимать
    // их незачем) и открываем одну сверху. Подсказка после этого выполнима.
    const kept = chars.map((c, i) => (fixed(i) || sameLetter(c, letters[i]) ? c : ''))
    const freeIdx = kept.findIndex((c, i) => !fixed(i) && !c)
    if (freeIdx < 0) {
      // Открывать нечего — всё слово уже раскрыто подсказками. Тогда честный
      // вердикт, а не совет, которому нельзя последовать.
      setChars(letters.slice())
      setOpened(letters.map(() => true))
      setChecked(false)
      setMsg('')
      return
    }
    const nextO = opened.slice()
    nextO[freeIdx] = true
    kept[freeIdx] = letters[freeIdx]
    setOpened(nextO)
    setChars(kept)
    setMsg(t('vocab.prac.openMore'))
  }

  const cont = () => onDone([{ key: word.key, ok: checked === true }])
  const filled = chars.every((c, i) => fixed(i) || c)

  // Слова фразы — отдельными группами: перенос строки идёт между словами, а
  // пробел виден как пробел, а не как ячейка.
  const groups = []
  let group = null
  letters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      group = null
      return
    }
    if (!group) groups.push((group = []))
    group.push(i)
  })

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askFill')}</p>
      <div className="vp-wordbox">
        <p style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 700, lineHeight: 1.45 }}>{sentence}</p>
        <div className="vp-letters">
          {groups.map((idxs) => (
            <span className="vp-letters-word" key={idxs[0]}>
              {idxs.map((i) => {
                const L = letters[i]
                if (!slot[i]) {
                  return <span key={i} className="vp-letter-sep" aria-hidden="true">{L}</span>
                }
                const shown = opened[i] ? L : chars[i]
                const isActive = i === (active < 0 ? lastSlot : active)
                let cls = 'vp-letter'
                if (opened[i] && checked == null) cls += i === firstSlot ? ' revealed' : ' hint'
                if (checked === true) cls += ' ok'
                if (checked === false) cls += ' no'
                if (isActive && checked == null && !opened[i]) cls += ' on'
                return (
                  <input
                    key={i}
                    ref={(el) => { boxes.current[i] = el }}
                    className={cls}
                    maxLength={1}
                    value={shown}
                    disabled={opened[i] || checked != null}
                    onChange={(e) => setAt(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                  />
                )
              })}
            </span>
          ))}
        </div>
        {msg ? <p className="vp-state" style={{ color: 'var(--vp-red)' }}>{msg}</p> : null}
        {meaning ? (
          <div className="vp-meaning">
            <IconBulb /> {t('vocab.prac.meaning', { m: meaning })}
          </div>
        ) : null}
        <div className="vp-fill-acts">
          <button type="button" className="vp-btn ghost" onClick={openLetter} disabled={checked != null}>
            {t('vocab.prac.openLetter')}
          </button>
          <button type="button" className="vp-btn ghost" onClick={giveUp} disabled={checked != null}>
            {t('vocab.prac.dontKnow')}
          </button>
        </div>
      </div>
      {checked != null && (
        <AnswerFeedback ok={checked === true} word={word} lang={lang} t={t} speak={speak} token={token} />
      )}
      <div className="vp-foot">
        {checked == null ? (
          <button type="button" className="vp-btn wide" disabled={!filled} onClick={submit}>
            {t('vocab.lesson.check')}
          </button>
        ) : (
          <button type="button" className="vp-btn wide" onClick={cont}>
            {t('vocab.prac.continue')} <IconPlay />
          </button>
        )}
      </div>
    </>
  )
}
