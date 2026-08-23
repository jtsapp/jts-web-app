import { useMemo, useRef, useState } from 'react'
import { translationOf, answersMatch, writeTranslationOk, buildChoiceOptions, uniqueByKey } from './lessonReview.js'

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ChoiceTask({ word, bank, lang, t, onDone }) {
  const options = useMemo(
    () => buildChoiceOptions(word, bank, lang),
    [word.key, lang, bank],
  )
  const [picked, setPicked] = useState(null)

  if (!options) {
    return <WriteTask word={word} t={t} onDone={onDone} />
  }

  return (
    <div className="v-lv-task">
      <p className="v-q-ask">{t('vocab.lesson.askChoice')}</p>
      <div className="v-lv-prompt">{word.word}</div>
      {word.ipa && <div className="v-lv-ipa">/{String(word.ipa).replace(/\//g, '')}/</div>}
      <div className="v-lv-opts">
        {options.map((opt, i) => {
          const cls = picked
            ? opt.ok ? ' v-ok' : picked === opt ? ' v-bad' : ' v-dim'
            : ''
          return (
            <button
              key={i}
              type="button"
              className={`v-choice${cls}`}
              disabled={!!picked}
              onClick={() => {
                if (picked) return
                setPicked(opt)
                setTimeout(() => onDone([{ key: word.key, ok: opt.ok }]), 480)
              }}
            >
              <span className="v-k">{'ABCD'[i]}</span>
              {opt.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MatchTask({ words, lang, t, onDone }) {
  const items = useMemo(() => uniqueByKey(words), [words])
  const left = useMemo(() => shuffle(items), [items])
  const right = useMemo(() => shuffle(items), [items])
  const [pick, setPick] = useState(null)
  const [done, setDone] = useState({})
  const [wrong, setWrong] = useState(null)
  const missedRef = useRef(new Set())

  const markCorrect = (key) => {
    setDone((prev) => {
      const next = { ...prev, [key]: true }
      if (Object.keys(next).length === items.length) {
        setTimeout(() => onDone(items.map((w) => ({ key: w.key, ok: !missedRef.current.has(w.key) }))), 400)
      }
      return next
    })
  }

  const click = (item, col) => {
    if (done[item.key] === true) return
    if (!pick) {
      setPick({ key: item.key, col })
      return
    }
    if (pick.col === col) {
      setPick({ key: item.key, col })
      return
    }
    const ok = pick.key === item.key
    if (ok) {
      markCorrect(item.key)
      setPick(null)
      setWrong(null)
    } else {
      missedRef.current.add(pick.key)
      missedRef.current.add(item.key)
      setWrong([pick.key, item.key])
      setPick(null)
      setTimeout(() => setWrong(null), 400)
    }
  }

  const cellCls = (item, col) => {
    if (done[item.key] === true) return ' v-ok'
    if (wrong?.includes(item.key)) return ' v-bad'
    if (pick?.key === item.key && pick.col === col) return ' v-sel'
    return ''
  }

  return (
    <div className="v-lv-task">
      <p className="v-q-ask">{t('vocab.lesson.askMatch')}</p>
      <div className="v-match-wrap v-lv-match">
        <div className="v-mcol">
          {left.map((w) => (
            <button key={`L-${w.key}`} type="button" className={`v-mcard${cellCls(w, 'L')}`} onClick={() => click(w, 'L')}>
              {w.word}
            </button>
          ))}
        </div>
        <div className="v-mcol">
          {right.map((w) => (
            <button key={`R-${w.key}`} type="button" className={`v-mcard${cellCls(w, 'R')}`} onClick={() => click(w, 'R')}>
              {translationOf(w, lang)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DictationTask({ word, t, speak, onDone }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(null)
  const submit = () => {
    if (checked != null) return
    const ok = answersMatch(value, word.word)
    setChecked(ok)
    setTimeout(() => onDone([{ key: word.key, ok }]), 700)
  }
  return (
    <div className="v-lv-task">
      <p className="v-q-ask">{t('vocab.lesson.askDictation')}</p>
      <button type="button" className="v-bigspk" onClick={() => speak(word.word)} aria-label={t('vocab.lesson.listen')}>🔊</button>
      <input
        className={`v-lv-input${checked == null ? '' : checked ? ' v-ok' : ' v-bad'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={t('vocab.lesson.typeEnglish')}
        autoCapitalize="off"
        autoCorrect="off"
        disabled={checked != null}
      />
      <button type="button" className="v-btn" disabled={!value.trim() || checked != null} onClick={submit}>
        {t('vocab.lesson.check')}
      </button>
      {checked === false && <p className="v-lv-key">{word.word}</p>}
    </div>
  )
}

export function WriteTask({ word, t, onDone }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(null)
  const submit = () => {
    if (checked != null) return
    const ok = writeTranslationOk(value, word)
    setChecked(ok)
    setTimeout(() => onDone([{ key: word.key, ok }]), 700)
  }
  return (
    <div className="v-lv-task">
      <p className="v-q-ask">{t('vocab.lesson.askWrite')}</p>
      <div className="v-lv-prompt">{word.word}</div>
      {word.ipa && <div className="v-lv-ipa">/{String(word.ipa).replace(/\//g, '')}/</div>}
      <input
        className={`v-lv-input${checked == null ? '' : checked ? ' v-ok' : ' v-bad'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={t('vocab.lesson.typeTranslation')}
        disabled={checked != null}
      />
      <button type="button" className="v-btn" disabled={!value.trim() || checked != null} onClick={submit}>
        {t('vocab.lesson.check')}
      </button>
      {checked === false && (
        <p className="v-lv-key">{[word.translationRu, word.translationKz].filter(Boolean).join(' · ')}</p>
      )}
    </div>
  )
}
