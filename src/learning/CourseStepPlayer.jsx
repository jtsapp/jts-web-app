import { useEffect, useMemo, useRef, useState } from 'react'
import AssetImage from '../components/AssetImage.jsx'
import { addVocabWords } from '../lib/vocabBank.js'
import { useI18n } from '../i18n.jsx'

// Пошаговый плеер урока (макет Figma «Обучение», секции Warm-up … Wrap).
//
// Урок — очередь экранов: одно задание на экран, сверху прогресс и сердца,
// снизу одна кнопка. Данные готовит scripts/build-course-steps.js из уроков
// перенесённого курса, поэтому здесь нет ни его разметки, ни его движка.
//
// Оценивается только то, у чего есть правильный ответ (choice/listen): верно —
// монеты, неверно — минус сердце. Слова, слайды правила, свободный ответ и
// чек-лист идут без оценки, как и в макете.

const REWARD = 10
const START_HEARTS = 3
const GRADED = new Set(['choice', 'listen', 'gap', 'order'])

// Проверяется шаг или нет. У listen ответ есть не всегда: экстрактор вынимает
// кнопку плеера из строки урока ОТДЕЛЬНЫМ блоком, поэтому часть таких шагов —
// это «послушай и иди дальше», без единого варианта. Пока listen считался
// проверяемым безусловно, «Проверить» на таком экране не включалась никогда
// (picked навсегда null) и урок вставал намертво — тот самый фидбек «не смог
// продолжить, не понятно, что надо проверить».
export function isGraded(step) {
  if (step.type === 'listen') return !!step.answer && (step.options || []).length > 0
  if (step.type === 'match') return (step.pairs || []).length > 0
  if (step.type === 'group') return (step.items || []).length > 0
  return GRADED.has(step.type)
}

// Ответ пропуска: сверяем без учёта регистра и знаков (см. norm).
const gapIsRight = (item, value) => (item.answers || []).some((a) => norm(a) === norm(value))

// Английское слово вслух. Сначала — записанный файл (scripts/make-lesson-audio.js),
// и только если записи нет — синтез браузера, каким слово произносил исходный
// курс (sayWord / sayText).
//
// Порядок именно такой, потому что браузерный синтез — лотерея: голос и
// качество зависят от того, что стоит в системе, а на Android для en-US его
// может не быть вовсе. Слово при этом одно и то же на карточке словаря и в
// задании на слух через несколько экранов, и звучать оно обязано одинаково —
// иначе задание проверяет не память, а способность узнать другой голос.
//
// Одна функция на весь плеер: две реализации разошлись бы по языку и скорости.
let liveAudio = null

function speakEnglish(text, { src = null, rate = 1 } = {}) {
  stopSpeaking()
  if (src) {
    liveAudio = new Audio(src)
    liveAudio.playbackRate = rate
    // Файл не доехал (сеть, 404) — договариваем синтезом, чтобы экран не
    // остался немым.
    liveAudio.play().catch(() => speakSynth(text, rate))
    return
  }
  speakSynth(text, rate)
}

function speakSynth(text, rate) {
  const s = typeof window === 'undefined' ? null : window.speechSynthesis
  if (!s || !text) return
  const u = new SpeechSynthesisUtterance(String(text))
  u.lang = 'en-US'
  u.rate = rate
  s.speak(u)
}

// Обрываем предыдущее: студент тапает карточки подряд, и без остановки звук
// копится — слово звучит через несколько секунд после тапа, уже не своё.
function stopSpeaking() {
  if (typeof window === 'undefined') return
  window.speechSynthesis?.cancel()
  if (liveAudio) {
    liveAudio.pause()
    liveAudio = null
  }
}
// В макете крупная фиолетовая строка — всегда сам вопрос, а тёмная поменьше —
// инструкция к нему. У заданий без правильного ответа вопрос стоит первым
// («Pick anything you like» / «I can …»), у проверяемых — под инструкцией.
const PROMPT_FIRST = new Set(['pick', 'write', 'checklist'])

// Ответ на впиши-пропуск сверяем без учёта регистра и знаков — как в старом
// плеере заданий: студент печатает руками, и точка в конце не ошибка.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Предложение шага «впиши пропуск» целиком: в макете оно стоит вопросом, а поле
// ответа — отдельным блоком под ним. Пропуск дорисовываем только если его нет в
// самих данных — у части уроков он уже стоит внутри половинки.
function gapSentence(step) {
  const before = String(step.before || '').trim()
  const after = String(step.after || '').trim()
  const joined = `${before} ${after}`.replace(/\s+/g, ' ').trim()
  if (/_{2,}/.test(joined)) return joined
  return `${before} ___ ${after}`.replace(/\s+/g, ' ').trim()
}

function shuffle(arr, seed) {
  // Порядок вариантов фиксирован для шага: без seed React перемешивал бы их на
  // каждый ререндер (например, после выбора ответа).
  const a = arr.slice()
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function CourseStepPlayer({ steps, title, subtitle, level, passRatio = null, onExit, onDone }) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [points, setPoints] = useState(0)
  const [hearts, setHearts] = useState(START_HEARTS)
  const endedRef = useRef(false)

  const total = steps.length
  const step = steps[idx]

  // Юнит-тест сдаётся долей верных ответов (passRatio из данных теста), а не
  // тремя сердцами: два десятка вопросов подряд без права на три ошибки — это
  // лотерея, а не проверка. В тесте сердца не тратятся, исход считается в конце.
  const exam = passRatio != null
  const reportDone = (outcome) => {
    if (endedRef.current) return
    endedRef.current = true
    const answered = correct + wrong
    const acc = answered ? Math.round((correct / answered) * 100) : 100
    onDone?.({
      outcome: exam ? (acc >= passRatio * 100 ? 'success' : 'fail') : outcome,
      correct,
      wrong,
      points,
      accuracy: acc,
    })
  }

  const advance = () => {
    if (!exam && hearts <= 0) reportDone('fail')
    else if (idx + 1 >= total) reportDone('success')
    else setIdx((i) => i + 1)
  }

  if (!step) return null

  return (
    <div className="cp">
      <div className="cp-bar">
        <button className="cp-bar__exit" onClick={onExit}>
          {t('lesson.exitLesson')}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="m9 9 6 6m0-6-6 6" stroke="#9047ff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="cp-bar__place">
          <b>{step.stage}</b>
          <span>{title}</span>
        </div>
        <button className="cp-bar__dict" type="button" disabled>
          {t('nav.vocab')}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 7h7M8 11h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="cp-scroll">
        <div className="cp-hud">
          <div className="cp-hud__track">
            <div className="cp-hud__fill" style={{ width: `${Math.round((idx / Math.max(1, total)) * 100)}%` }} />
          </div>
          <div className="cp-hud__hearts" aria-label={t('lesson.hearts')}>
            <span className="cp-hud__heart" aria-hidden="true">
              ❤
            </span>
            <b>{hearts}</b>
          </div>
        </div>

        <Step
          key={idx}
          step={step}
          seed={idx + 1}
          level={level}
          onAdvance={advance}
          onGraded={(ok) => {
            if (ok) {
              setCorrect((c) => c + 1)
              setPoints((p) => p + REWARD)
            } else {
              setWrong((w) => w + 1)
              if (!exam) setHearts((h) => Math.max(0, h - 1))
            }
          }}
          t={t}
        />
      </div>
    </div>
  )
}

// Один экран задания: тело по типу шага, снизу кнопка «Проверить»/«Продолжить»
// и, после проверки, плашка результата.
function Step({ step, seed, level, onAdvance, onGraded, t }) {
  const graded = isGraded(step)
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)

  const options = useMemo(
    () => (step.options ? shuffle(step.options, seed * 7919) : []),
    [step, seed],
  )
  // Собранная фраза шага «порядок слов».
  const [seq, setSeq] = useState([])
  // Соединение пар: левый пункт → выбранный правый.
  const [links, setLinks] = useState({})
  // Экран с несколькими пропусками: ответ на каждый.
  const [fills, setFills] = useState({})

  const verdict = () => {
    // Экран засчитывается целиком: это одно упражнение из нескольких строк,
    // и сердце за него снимается один раз, а не за каждый пропуск.
    if (step.type === 'group') return (step.items || []).every((it, i) => gapIsRight(it, fills[i] || ''))
    if (step.type === 'gap') return (step.answers || []).some((a) => norm(a) === norm(text))
    if (step.type === 'order') return norm(seq.map((i) => step.words[i]).join(' ')) === norm(step.answer)
    // Соединение засчитывается целиком: это одно упражнение, а не N вопросов,
    // и сердце за него снимается один раз.
    if (step.type === 'match') return (step.pairs || []).every((p, i) => links[i] === p.right)
    return picked !== null && options[picked] === step.answer
  }
  const isRight = checked && verdict()

  // Кнопка: пока не проверено — «Проверить» (голубая), после и у неоценённых
  // шагов — «Продолжить» (фиолетовая), как в макете.
  const canCheck = graded
    ? step.type === 'group'
      ? (step.items || []).every((_, i) => (fills[i] || '').trim() !== '')
      : step.type === 'gap'
      ? text.trim() !== ''
      : step.type === 'order'
        ? seq.length === (step.words || []).length
        : step.type === 'match'
          ? Object.keys(links).length === (step.pairs || []).length
          : picked !== null
    : step.type === 'write'
      ? text.trim() !== ''
      : true
  const showCheck = graded ? !checked : step.type === 'write' && !revealed && !!step.model

  const act = () => {
    if (showCheck) {
      if (graded) {
        setChecked(true)
        onGraded(verdict())
      } else setRevealed(true)
      return
    }
    onAdvance()
  }

  // Шаг «впиши пропуск» в макете показывает предложение целиком крупной
  // строкой, а поле ответа стоит отдельным блоком под ним — поэтому склеиваем
  // половинки в вопрос, а не режем строку полем посередине.
  const promptFirst = PROMPT_FIRST.has(step.type)
  const big = step.type === 'gap' ? gapSentence(step) : promptFirst ? step.title : step.prompt || step.sub
  const small = promptFirst ? step.sub : step.title

  return (
    <>
      <div className="cp-step">
        {/* Слайд правила несёт заголовок внутри карточки — в макете над ней
            ничего нет. */}
        {step.type !== 'note' &&
          (promptFirst ? (
            <>
              {big && <div className="cp-step__prompt">{big}</div>}
              {small && <h2 className="cp-step__title">{small}</h2>}
            </>
          ) : (
            <>
              {small && <h2 className="cp-step__title">{small}</h2>}
              {big && <div className="cp-step__prompt">{big}</div>}
            </>
          ))}

        <StepBody
          step={step}
          options={options}
          picked={picked}
          setPicked={setPicked}
          checked={checked}
          text={text}
          setText={setText}
          seq={seq}
          setSeq={setSeq}
          links={links}
          setLinks={setLinks}
          fills={fills}
          setFills={setFills}
          isRight={isRight}
          revealed={revealed}
          level={level}
          t={t}
        />
      </div>

      {/* Плашка результата из макета «Обучения» (Figma, Vocabulary → Screen
          4023:33924): кружок 42 с белым знаком, справа — монета в белой
          пилюле. Раньше знак был текстовым глифом в белом кружке 28. */}
      {checked && (
        <div className={`cp-fb ${isRight ? 'is-ok' : 'is-no'}`}>
          <span className="cp-fb__ic" aria-hidden="true">
            {isRight ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3.5 12.5 9.2 18.2 20.5 5.8" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10.6" stroke="#fff" strokeWidth="1.8" />
                <path d="M8.6 9.6v.01M15.4 9.6v.01" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M8.7 16.2c.9-1.3 2-1.9 3.3-1.9s2.4.6 3.3 1.9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <b>{isRight ? t('lesson.correct') : t('lesson.wrong')}</b>
          {isRight && (
            <span className="cp-fb__coin">
              <img src="/assets/lesson/coin.png" alt="" width="24" height="24" />
              +{REWARD}
            </span>
          )}
        </div>
      )}

      <div className="cp-foot">
        <button className={`cp-cta ${showCheck ? 'is-check' : 'is-go'}`} disabled={!canCheck} onClick={act}>
          {showCheck ? t('lesson.check') : step.type === 'checklist' ? t('lesson.finish') : t('lesson.continue')}
        </button>
      </div>
    </>
  )
}

function StepBody({ step, options, picked, setPicked, checked, text, setText, seq, setSeq, links, setLinks, fills, setFills, isRight, revealed, level, t }) {
  switch (step.type) {
    // Впиши пропущенное: само предложение ушло в вопрос, здесь только поле.
    case 'gap':
      return (
        <input
          className={`cp-field cp-gap__in ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}
          value={checked && !isRight ? step.answers[0] : text}
          onChange={(e) => setText(e.target.value)}
          disabled={checked}
          autoComplete="off"
          spellCheck="false"
          placeholder={t('lesson.typeAnswer')}
        />
      )

    // Порядок слов: банк снизу, собранная фраза сверху — слова остаются
    // плашками и на строке ответа, как в макете.
    case 'order':
      return (
        <div className="cp-order">
          <div className={`cp-order__line ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}>
            {seq.length ? (
              seq.map((i) => (
                <span key={i} className="cp-chip is-set">
                  {step.words[i]}
                </span>
              ))
            ) : (
              <span className="cp-order__ph">…</span>
            )}
          </div>
          <div className="cp-order__bank">
            {(step.words || []).map((w, i) => (
              <button
                key={i}
                className="cp-chip"
                disabled={checked || seq.includes(i)}
                onClick={() => setSeq((s) => [...s, i])}
              >
                {w}
              </button>
            ))}
          </div>
          {!checked && seq.length > 0 && (
            <button className="cp-order__undo" onClick={() => setSeq((s) => s.slice(0, -1))}>
              ← {t('common.back')}
            </button>
          )}
        </div>
      )

    // Несколько пропусков одним экраном: строка задания + поле под каждую.
    case 'group':
      return (
        <div className="cp-group">
          {(step.items || []).map((it, i) => {
            const value = fills[i] || ''
            const ok = checked && gapIsRight(it, value)
            return (
              <div className="cp-group__row" key={i}>
                <span className="cp-group__q">{gapSentence(it)}</span>
                <input
                  className={`cp-field cp-group__in ${checked ? (ok ? 'is-right' : 'is-wrong') : ''}`}
                  value={checked && !ok ? (it.answers || [''])[0] : value}
                  onChange={(e) => setFills((s) => ({ ...s, [i]: e.target.value }))}
                  disabled={checked}
                  autoComplete="off"
                  spellCheck="false"
                  placeholder={t('lesson.typeAnswer')}
                />
              </div>
            )
          })}
        </div>
      )

    // Соединение пар: слева пункты задания, справа банк вариантов.
    case 'match':
      return <MatchBoard step={step} options={options} links={links} setLinks={setLinks} checked={checked} t={t} />

    // Выбор без правильного ответа: отмечаем сколько угодно карточек.
    case 'pick':
      return <PickCards options={step.options} />

    // Слова урока: карточка переворачивается на перевод по клику.
    case 'cards':
      return <WordCards words={step.words} t={t} />

    case 'note':
      return (
        <div className="cp-note">
          {step.title && <h2 className="cp-note__h">{step.title}</h2>}
          <div className="cp-note__body" dangerouslySetInnerHTML={{ __html: step.html || '' }} />
        </div>
      )

    case 'listen':
      return (
        <>
          {/* У курса (A2/B1) дорожка лежит рядом с уроком и известна по имени,
              у A0/A1 в задании сразу абсолютный URL на files-dev. */}
          <AudioButton src={step.src || `/course/${String(level).toLowerCase()}/audio/${step.track}`} t={t} />
          {/* Материал для чтения вслух: у части заданий A1 сам текст и есть
              задание («Read each script — and play it out loud»), поэтому он
              стоит под плеером, а не прячется. */}
          {step.html && (
            <div className="cp-note">
              <div className="cp-note__body" dangerouslySetInnerHTML={{ __html: step.html }} />
            </div>
          )}
          {/* На слух варианты в макете лежат в две колонки: слово короткое,
              и колонкой во всю высоту экрана оно смотрелось бы пусто. */}
          <Choices options={options} picked={picked} setPicked={setPicked} checked={checked} answer={step.answer} grid />
        </>
      )

    case 'choice':
      return (
        <>
          {/* Задание «Listen. Choose the word you hear.»: слова нет ни в
              вопросе, ни в вариантах — оно живёт только в поле say, и без
              озвучки экран неразрешим (см. SayButton). */}
          {step.say && <SayButton text={step.say} src={step.sayTrack || null} t={t} />}
          <Choices
            options={options}
            picked={picked}
            setPicked={setPicked}
            checked={checked}
            answer={step.answer}
            grid={!!step.say}
          />
        </>
      )

    case 'write':
      return (
        <>
          <textarea
            className="cp-field cp-write"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={step.placeholder || t('lesson.typeAnswer')}
            rows={1}
          />
          {revealed && (step.modelHtml || step.model) && (
            <div className="cp-model">
              <b>{t('lesson.modelAnswer')}</b>
              {/* У A0/A1 образец размеченный: в нём список «Check yourself»,
                  плоским текстом он склеился бы в одну строку. */}
              {step.modelHtml ? (
                <div className="cp-model__body" dangerouslySetInnerHTML={{ __html: step.modelHtml }} />
              ) : (
                <span>{step.model}</span>
              )}
            </div>
          )}
        </>
      )

    case 'checklist':
      return <Checklist items={step.items} />

    default:
      return null
  }
}

function Choices({ options, picked, setPicked, checked, answer, grid = false }) {
  return (
    <div className={`cp-choices ${grid ? 'is-grid' : ''}`}>
      {options.map((o, i) => {
        // Подсвечиваем только выбранный вариант: в макете после неверного
        // ответа правильный не раскрывается — остальные кнопки остаются белыми.
        let cls = 'cp-choice'
        if (checked) {
          if (i === picked) cls += o === answer ? ' is-right' : ' is-wrong'
        } else if (i === picked) cls += ' is-sel'
        return (
          <button key={i} className={cls} disabled={checked} onClick={() => setPicked(i)}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

// Соединение пар: тап по пункту слева, затем по варианту справа — как и
// говорит инструкция исходного курса («Tap a word, then tap its picture»).
// Занятый вариант из банка уходит: в упражнении на соединение каждый вариант
// используется один раз, и с каждой парой выбор сужается. Именно этого не было,
// когда упражнение разворачивалось в отдельные вопросы с полным набором
// вариантов в каждом.
function MatchBoard({ step, options, links, setLinks, checked, t }) {
  const [active, setActive] = useState(null)
  const used = new Set(Object.values(links))
  const pairs = step.pairs || []

  const tapLeft = (i) => {
    if (checked) return
    // Повторный тап по уже соединённому пункту разрывает пару — иначе
    // ошибочный выбор нечем исправить, кроме как потерять сердце.
    if (links[i] !== undefined) {
      setLinks((s) => {
        const next = { ...s }
        delete next[i]
        return next
      })
      setActive(i)
      return
    }
    setActive(active === i ? null : i)
  }

  const tapRight = (value) => {
    if (checked || used.has(value)) return
    const target = active !== null ? active : pairs.findIndex((_, i) => links[i] === undefined)
    if (target < 0) return
    setLinks((s) => ({ ...s, [target]: value }))
    setActive(null)
  }

  return (
    <div className="cp-match">
      <div className="cp-match__col">
        {pairs.map((p, i) => {
          let cls = 'cp-match__item'
          if (active === i) cls += ' is-active'
          if (links[i] !== undefined) cls += ' is-linked'
          if (checked) cls += links[i] === p.right ? ' is-right' : ' is-wrong'
          return (
            <button key={i} className={cls} disabled={checked} onClick={() => tapLeft(i)}>
              <span className="cp-match__left">{p.left}</span>
              {/* Выбранная пара показывается прямо в пункте: тянуть линии между
                  колонками на узком экране некуда. */}
              {links[i] !== undefined && <span className="cp-match__pick">{links[i]}</span>}
              {checked && links[i] !== p.right && <span className="cp-match__fix">{p.right}</span>}
            </button>
          )
        })}
      </div>
      <div className="cp-match__bank" aria-label={t('lesson.matchBank')}>
        {options.map((o, i) => (
          <button key={i} className="cp-chip" disabled={checked || used.has(o)} onClick={() => tapRight(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function PickCards({ options }) {
  const [on, setOn] = useState({})
  return (
    <div className="cp-picks">
      {(options || []).map((o, i) => (
        <button key={i} className={`cp-pick ${on[i] ? 'is-on' : ''}`} onClick={() => setOn((s) => ({ ...s, [i]: !s[i] }))}>
          {o.emoji && <span className="cp-pick__emoji">{o.emoji}</span>}
          <span className="cp-pick__label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

function WordCards({ words, t }) {
  const [open, setOpen] = useState({})
  // Уходя со стадии словаря, обрываем речь: иначе последнее слово догоняет
  // студента уже на следующем экране.
  useEffect(() => stopSpeaking, [])
  // Слова, уже отправленные в личный словарь. Кнопка после этого показывает
  // галочку и больше не нажимается: повторный тап ничего бы не изменил
  // (в vocab_bank слово уникально по word_key), а студенту нужен именно
  // видимый ответ «забрал».
  const [saved, setSaved] = useState({})

  const add = async (i, w) => {
    setSaved((s) => ({ ...s, [i]: true }))
    const ok = await addVocabWords([{ word: w.en, hint: [w.ru, w.kk].filter(Boolean).join(' · ') }])
    // Не сохранилось — возвращаем кнопку, иначе галочка врёт про слово,
    // которого в словаре нет.
    if (!ok) setSaved((s) => ({ ...s, [i]: false }))
  }

  return (
    <div className="cp-words">
      {(words || []).map((w, i) => (
        // Карточка — не кнопка: внутри неё живёт своя кнопка «в словарь», а
        // кнопку в кнопку вкладывать нельзя. Переворот повесен на внутреннюю.
        <div key={i} className={`cp-word ${open[i] ? 'is-open' : ''}`}>
          {/* Тап по карточке произносит слово и переворачивает её — ровно то,
              что обещает инструкция стадии («Look and listen. Tap a picture to
              hear the word»). Без озвучки презентация слов была немой: студент
              видел написание и перевод, но не знал, как это звучит, — а через
              экран его уже спрашивают то же слово на слух. */}
          <button
            className="cp-word__flip"
            onClick={() => {
              speakEnglish(w.en, { src: w.audio || null })
              setOpen((s) => ({ ...s, [i]: !s[i] }))
            }}
            aria-label={t('lesson.hearWord', { word: w.en })}
          >
            <span className="cp-word__face">
              {/* alt называет слово: картинка иллюстрирует значение, а не
                  украшает экран. */}
              {w.img ? <AssetImage src={w.img} alt={w.en} loading="lazy" hideOnError /> : <span className="cp-word__noimg">{w.en}</span>}
            </span>
            {/* Оборот карточки в макете — не одна строка перевода: сверху слово с
                определением, под ним переводы отдельными плашками. */}
            <span className="cp-word__back">
              <span className="cp-word__head">
                <b>{w.en}</b>
                {w.def && <i>{w.def}</i>}
              </span>
              <span className="cp-word__trs">
                <span className="cp-word__tr">{w.ru}</span>
                {w.kk && <span className="cp-word__tr">{w.kk}</span>}
              </span>
            </span>
            <span className="cp-word__label">{w.en}</span>
          </button>
          <button
            className={`cp-word__add ${saved[i] ? 'is-saved' : ''}`}
            type="button"
            disabled={!!saved[i]}
            aria-label={saved[i] ? t('lesson.inVocab') : t('lesson.addToVocab')}
            title={saved[i] ? t('lesson.inVocab') : t('lesson.addToVocab')}
            onClick={() => add(i, w)}
          >
            {saved[i] ? '✓' : '+'}
          </button>
        </div>
      ))}
    </div>
  )
}

function Checklist({ items }) {
  const [on, setOn] = useState({})
  return (
    <div className="cp-check">
      {(items || []).map((it, i) => (
        <button key={i} className={`cp-check__row ${on[i] ? 'is-on' : ''}`} onClick={() => setOn((s) => ({ ...s, [i]: !s[i] }))}>
          <span>{it}</span>
          <span className="cp-check__box" aria-hidden="true">
            {on[i] ? '✓' : ''}
          </span>
        </button>
      ))}
    </div>
  )
}

// Слово, которое исходный курс произносил синтезом речи браузера
// (`onclick="sayWord('repeat')"` в a0.html). Кнопка курса — мёртвый контрол и
// из разметки уходит, поэтому экстрактор кладёт само слово в поле say, а
// озвучивает его плеер. Без этого на экране остаются одни варианты ответа:
// студент угадывает один к четырём и теряет сердце за промах — 250 таких
// заданий в A0.
//
// Разметка та же (.cp-audio), чтобы кнопка выглядела ровно как плеер дорожки:
// для студента это одно и то же действие «послушать».
function SayButton({ text, src, t }) {
  // Уходя с шага, обрываем речь: иначе слово догоняет студента уже на
  // следующем экране.
  useEffect(() => stopSpeaking, [])
  const say = (rate) => speakEnglish(text, { src, rate })
  return (
    <div className="cp-audio">
      <button className="cp-audio__play" onClick={() => say(1)} aria-label={t('lesson.play')}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button className="cp-audio__slow" onClick={() => say(0.6)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17h5a5 5 0 0 1 5-5 5 5 0 0 1 5 5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="15" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M16 12V8m3 4V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {t('lesson.playSlow')}
      </button>
    </div>
  )
}

// Аудио стадии слушания: обычная скорость и замедленная — как в макете.
function AudioButton({ src, t }) {
  const ref = useRef(null)
  useEffect(() => () => ref.current?.pause(), [])
  const play = (rate) => {
    const a = ref.current
    if (!a) return
    a.pause()
    a.currentTime = 0
    a.playbackRate = rate
    a.play().catch(() => {})
  }
  return (
    <div className="cp-audio">
      <audio ref={ref} src={src} preload="none" />
      <button className="cp-audio__play" onClick={() => play(1)} aria-label={t('lesson.play')}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button className="cp-audio__slow" onClick={() => play(0.6)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17h5a5 5 0 0 1 5-5 5 5 0 0 1 5 5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="15" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M16 12V8m3 4V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {t('lesson.playSlow')}
      </button>
    </div>
  )
}
