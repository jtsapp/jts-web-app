import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import AssetImage from '../components/AssetImage.jsx'
import LangSelector from '../components/LangSelector.jsx'
import { addVocabWords } from '../lib/vocabBank.js'
import { saveWord } from '../api.js'
import { useI18n } from '../i18n.jsx'
import { answerMatches, normAnswer } from '../lib/answer-match.js'
import { reportAudio } from '../screens/live/audioReport.js'
import { playTts, stopTts } from '../lib/speech.js'
import { VOICE } from '../lib/ttsShared.js'
import { isTapSelection, isPhraseSelection, isOversizedPhrase } from '../lib/wordTranslate.js'
import { useTapTranslate } from '../screens/workspace/useTapTranslate.js'
import TapText from '../screens/workspace/TapText.jsx'
import TappableHtml from '../screens/workspace/TappableHtml.jsx'
import TranslatePopover from '../screens/workspace/TranslatePopover.jsx'
import { readResume, saveResume, clearResume } from '../lib/lessonResume.js'

// Пошаговый плеер урока (макет Figma «Обучение», секции Warm-up … Wrap).
//
// Урок — очередь экранов: одно задание на экран, сверху полоса прогресса,
// снизу одна кнопка. Данные готовит scripts/build-course-steps.js из уроков
// перенесённого курса, поэтому здесь нет ни его разметки, ни его движка.
//
// Оценивается только то, у чего есть правильный ответ (choice/listen): верно —
// монеты. Слова, слайды правила, свободный ответ и чек-лист идут без оценки,
// как и в макете.
//
// Сердец в уроке нет: ошибка стоит монет и портит процент в итогах, но не
// выбрасывает из урока. Раньше три промаха обрывали урок на середине — на
// стадии из десяти однотипных вопросов это случалось регулярно, и студент
// терял всё пройденное вместо того, чтобы доучить тему.

const REWARD = 10
const GRADED = new Set(['choice', 'listen', 'gap', 'order'])

// Проверяется шаг или нет. У listen ответ есть не всегда: экстрактор вынимает
// кнопку плеера из строки урока ОТДЕЛЬНЫМ блоком, поэтому часть таких шагов —
// это «послушай и иди дальше», без единого варианта. Пока listen считался
// проверяемым безусловно, «Проверить» на таком экране не включалась никогда
// (picked навсегда null) и урок вставал намертво — тот самый фидбек «не смог
// продолжить, не понятно, что надо проверить».
//
// Записи у шага тоже может не быть: в A0 два вопроса на слух выгрузились с
// src: null. Проверять такой шаг значит засчитывать угадайку, поэтому без
// записи он идёт как неоцениваемый — вопрос виден, но в зачёт не идёт.
export function isGraded(step) {
  if (step.type === 'listen') return !!listenSrc(step, '') && !!step.answer && (step.options || []).length > 0
  if (step.type === 'match') return (step.pairs || []).length > 0
  if (step.type === 'group' || step.type === 'rows') return (step.items || []).length > 0
  if (step.type === 'mistake') return (step.tokens || []).length > 0
  if (step.type === 'cols') return (step.items || []).length > 0
  if (step.type === 'cloze') return (step.answers || []).length > 0
  return GRADED.has(step.type)
}

// Ответ пропуска: сверяем без учёта регистра, знаков и формы стяжения — «do
// not» и «don't» здесь один ответ (см. lib/answer-match.js).
const gapIsRight = (item, value) => answerMatches(value, item.answers, gapCue(item))

// Подсказка для заданий «перепиши предложение»: поле стоит в конце строки, и
// студент печатает весь остаток, а эталон хранит только его начало.
const gapCue = (item) => `${item.before || ''} ${item.after || ''}`

// Английское слово вслух. Сначала — записанный файл (scripts/make-lesson-audio.js),
// если записи нет — Soniox тем же голосом, каким сделаны записи (Owen), и
// только если сервер не ответил — синтез браузера, каким слово произносил
// исходный курс (sayWord / sayText).
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
  // На живом уроке преподаватель следует за тем же звуком — вне урока репортёр
  // не подписан (см. audioReport.js), и вызов ничего не делает.
  reportAudio({ kind: 'tts', action: 'play', text: String(text) })
  if (src) {
    liveAudio = new Audio(src)
    liveAudio.playbackRate = rate
    // Файл не доехал (сеть, 404) — договариваем синтезом, чтобы экран не
    // остался немым. Но громко жалуемся в консоль: молчаливый откат уже стоил
    // разбирательства «на телефоне голос хороший, на компьютере роботный» —
    // там браузер держал в кэше старую копию данных, где записи ещё не было.
    liveAudio.play().catch((e) => {
      console.warn('[lesson] запись не проиграла, читаю Soniox:', src, e?.name || e)
      speakSoniox(text, rate)
    })
    return
  }
  speakSoniox(text, rate)
}

// Темп записей курса — 0.85 (make-lesson-audio.js); «медленно» у Soniox упирается
// в нижнюю границу провайдера 0.7, как ни проси 0.6.
function speakSoniox(text, rate) {
  playTts(text, {
    voice: VOICE.course,
    speed: rate < 1 ? 0.7 : 0.85,
    onFail: (why) => {
      if (why === 'empty') return
      console.warn('[lesson] Soniox не ответил, читаю синтезом:', why)
      speakSynth(text, rate)
    },
  })
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
  stopTts()
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

// scripts/selfstudy/steps.js печёт подпись стадии в JSON один раз при выгрузке
// курса: у A1–B2 она английская («Practice»), у A0 — уже русская
// («Практика»). Перегонять экстрактор ради подписи незачем (файлы уровня —
// сотни МБ, не в репозитории), поэтому переводим на экране. Раньше здесь была
// карта только на русский, и казахский или английский интерфейс всё равно
// видел «Практика» — теперь оба варианта из данных ведут на ключ словаря.
const STAGE_KEY = {
  'Warm-up': 'warmup',
  Разминка: 'warmup',
  Vocabulary: 'vocab',
  Слова: 'vocab',
  Grammar: 'grammar',
  Грамматика: 'grammar',
  Practice: 'practice',
  Практика: 'practice',
  Listening: 'listening',
  Аудирование: 'listening',
  Speaking: 'speaking',
  Говорение: 'speaking',
  Wrap: 'wrap',
  Итоги: 'wrap',
  // Казахские подписи — на случай выгрузки курса с lang=kk: названия те же,
  // что печёт сам сборщик (STAGE_NAMES в scripts/selfstudy/steps.js).
  Қыздыру: 'warmup',
  Сөздер: 'vocab',
  Тәжірибе: 'practice',
  Тыңдалым: 'listening',
  Сөйлеу: 'speaking',
  Қорытынды: 'wrap',
}

export function stageLabel(stage, t) {
  const key = STAGE_KEY[stage]
  return key ? t(`lesson.stage.${key}`) : stage
}


// Предложение шага «впиши пропуск» целиком: в макете оно стоит вопросом, а поле
// ответа — отдельным блоком под ним. Пропуск дорисовываем только если его нет в
// самих данных — у части уроков он уже стоит внутри половинки.
function gapSentence(step) {
  const before = String(step.before || '').trim()
  const after = String(step.after || '').trim()
  // Обеих половинок нет — это «перепиши предложение целиком»: сама фраза стоит
  // над полем карточкой, и рисовать вместо вопроса голый пропуск незачем.
  if (!before && !after) return ''
  const joined = `${before} ${after}`.replace(/\s+/g, ' ').trim()
  if (/_{2,}/.test(joined)) return joined
  return `${before} ___ ${after}`.replace(/\s+/g, ' ').trim()
}

// Адрес дорожки шага. У A0/A1 в шаге лежит готовый абсолютный URL (поле audio
// или src), у перенесённого курса — имя файла рядом с уроком.
function trackSrc(step, level) {
  if (step.audio) return step.audio
  if (step.src) return step.src
  return step.track ? `/course/${String(level).toLowerCase()}/audio/${step.track}` : ''
}

// Запись шага listen. Отдельно от trackSrc, потому что у listen нет поля
// audio, а пустой ответ тут значит «записи нет»: раньше адрес собирался
// безусловно, и шаг с src: null получал /course/a0/audio/undefined — 404.
function listenSrc(step, level) {
  if (step.src) return step.src
  return step.track ? `/course/${String(level).toLowerCase()}/audio/${step.track}` : ''
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

// resumeKey — адрес урока для памяти «где остановился» (см. lib/lessonResume.js).
// Передаёт только тропа «Обучения»: там урок длинный и проходится в одиночку;
// каталог и живой урок ведёт преподаватель, и позицию там помнить незачем.
export default function CourseStepPlayer({ steps, title, subtitle, level, passRatio = null, token, catalogLessonId, resumeKey, onExit, onVocab, onDone }) {
  const { t, lang } = useI18n()
  const { pop, openWord, openLimit, close, onSave } = useTapTranslate({ token, lang, source: `course:${level}`, catalogLessonId })
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [points, setPoints] = useState(0)
  const endedRef = useRef(false)
  // Незаконченная попытка этого урока: перезагрузка страницы раньше
  // отбрасывала на первый из 40–90 экранов. Предлагаем, а не прыгаем сами:
  // ученик мог вернуться именно затем, чтобы пройти урок заново.
  const [resume, setResume] = useState(() => (resumeKey ? readResume(token, resumeKey, steps.length) : null))
  // Лист словаря по макету («Обучение», кадр 4108:1689): null — закрыт,
  // иначе открытая вкладка.
  const [dict, setDict] = useState(null)

  // Дорожка живёт вне экрана задания (см. getStageAudio) — значит, обрывать её
  // надо на выходе из урока, иначе запись догоняет студента уже на тропе.
  useEffect(() => stopStageAudio, [])

  const total = steps.length
  const step = steps[idx]

  // Предложение «продолжить» в силе, пока ученик его не решил и сам не дошёл
  // до сохранённого шага. На экране две кнопки «Продолжить» — в плашке и внизу
  // шага, и нижняя заметнее: нажавший её уходил на шаг 2, а позиция «шаг 31»
  // тут же затиралась. Поэтому плашка остаётся на следующих шагах, а запись
  // всё это время не трогаем.
  const offer = resume && idx < resume.idx ? resume : null

  // Позицию пишем на входе в шаг — со счётом, набранным до него. Ответ внутри
  // шага при перезагрузке теряется вместе с шагом: его проходят заново, и
  // счёт тогда не задваивается.
  useEffect(() => {
    if (!resumeKey || endedRef.current || idx === 0 || offer) return
    saveResume(token, resumeKey, total, { idx, correct, wrong, points })
    // Счёт в зависимостях не нужен: он меняется внутри шага, а пишем на входе.
  }, [idx, resumeKey, token, total, offer]) // eslint-disable-line react-hooks/exhaustive-deps

  const continueFromResume = () => {
    setIdx(resume.idx)
    setCorrect(resume.correct)
    setWrong(resume.wrong)
    setPoints(resume.points)
    setResume(null)
  }
  // «Начать сначала» — отказ от предложения: старую позицию забываем, дальше
  // пишется текущая. Сам шаг не меняем: ученик уже там, откуда хочет идти.
  const restartLesson = () => {
    clearResume(token, resumeKey)
    setResume(null)
  }

  // Слова урока для листа словаря — те же карточки, что показывает стадия
  // Vocabulary; ничего нового не собираем и никуда не ходим. Повторы убираем:
  // одно слово может встретиться в нескольких стадиях.
  const lessonWords = useMemo(() => {
    const seen = new Set()
    return steps
      .filter((s) => s.type === 'cards')
      .flatMap((s) => s.words || [])
      .filter((w) => {
        const key = String(w?.en || '').toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [steps])

  const closeDict = () => {
    stopSpeaking()
    setDict(null)
  }

  // Провалить можно только юнит-тест, и решает это доля верных ответов
  // (passRatio из данных теста). Обычный урок всегда доходит до итогов: там
  // считаются проценты, монеты и число ошибок, но выбросить из урока нечему.
  const exam = passRatio != null
  const reportDone = () => {
    if (endedRef.current) return
    endedRef.current = true
    // Урок пройден — продолжать нечего.
    if (resumeKey) clearResume(token, resumeKey)
    const answered = correct + wrong
    const acc = answered ? Math.round((correct / answered) * 100) : 100
    onDone?.({
      outcome: exam && acc < passRatio * 100 ? 'fail' : 'success',
      correct,
      wrong,
      points,
      accuracy: acc,
    })
  }

  const advance = () => {
    if (idx + 1 >= total) reportDone()
    else setIdx((i) => i + 1)
  }

  if (!step) return null

  return (
    <div className="cp">
      <div className="cp-bar">
        {/* Значок стоит ПЕРЕД подписью у обеих кнопок полосы — так в макете.
            Раньше оба висели справа, и «Выйти ✕» читалось как «закрыть эту
            плашку», а не «выйти из урока». */}
        {/* aria-label — потому что на телефоне подпись скрыта стилями и кнопка
            остаётся одним значком. */}
        <button className="cp-bar__exit" onClick={onExit} aria-label={t('lesson.exitLesson')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="m9 9 6 6m0-6-6 6" stroke="#9047ff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {/* Подпись в span: на телефоне в макете обе кнопки полосы — только
              значки в круге, а спрятать голый текстовый узел нечем. */}
          <span className="cp-bar__label">{t('lesson.exitLesson')}</span>
        </button>
        <div className="cp-bar__place">
          <b>{stageLabel(step.stage, t)}</b>
          <span>{title}</span>
        </div>
        {/* Язык интерфейса прямо в уроке: в макете «Обучение» пилюля с флагом
            стоит на каждом шаге между названием и словарём. Урок — самый
            длинный сценарий в приложении, и уходить за сменой языка в профиль,
            теряя шаг, незачем. Подпись языка скрыта (compact): рядом с
            названием шага на 440px её некуда положить. */}
        <LangSelector flagOnly />

        {/* «Словарь» открывает лист поверх урока, а не уводит из него: в макете
            это отдельный экран со словами, и раньше кнопка выбрасывала студента
            в раздел словаря посреди шага. Уйти в сам раздел по-прежнему можно —
            ссылкой на вкладке «Сохранено». */}
        <button className="cp-bar__dict" type="button" onClick={() => setDict('lesson')} aria-label={t('nav.vocab')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5z" stroke="currentColor" strokeWidth="2" />
            <path d="M8 7h7M8 11h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="cp-bar__label">{t('nav.vocab')}</span>
        </button>
      </div>

      <div
        className="cp-scroll"
        data-selectable=""
        onClick={() => {
          const raw = window.getSelection()?.toString() || ''
          if (isTapSelection(raw) || isOversizedPhrase(raw)) return
          close()
        }}
        onMouseUp={(e) => {
          const sel = window.getSelection()
          const raw = sel?.toString() || ''
          if (isPhraseSelection(raw) || isOversizedPhrase(raw)) {
            if (!e.currentTarget.contains(sel.anchorNode)) return
            if (!sel.rangeCount) return
            const rect = sel.getRangeAt(0).getBoundingClientRect()
            if (!rect.width && !rect.height) return
            const anchor = { getBoundingClientRect: () => rect }
            if (isOversizedPhrase(raw)) openLimit(raw, anchor)
            else openWord(raw, anchor)
            return
          }
          if (raw.trim()) close()
        }}
      >
        {/* Плашка висит, пока предложение в силе (см. offer выше) — не только
            на первом шаге: иначе промах мимо неё стоил бы сохранённой позиции. */}
        {offer && (
          <div className="cp-resume" role="status">
            <span>{t('lesson.resume.text', { n: String(offer.idx + 1), total: String(total) })}</span>
            <div className="cp-resume__acts">
              <button type="button" className="cp-resume__go" onClick={continueFromResume}>
                {t('lesson.resume.continue', { n: String(offer.idx + 1) })}
              </button>
              <button type="button" className="cp-resume__restart" onClick={restartLesson}>
                {t('lesson.resume.restart')}
              </button>
            </div>
          </div>
        )}

        <div className="cp-hud">
          <div className="cp-hud__track">
            <div className="cp-hud__fill" style={{ width: `${Math.round((idx / Math.max(1, total)) * 100)}%` }} />
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
            }
          }}
          t={t}
          onWord={openWord}
          token={token}
          catalogLessonId={catalogLessonId}
        />
      </div>

      {dict && (
        <DictSheet
          tab={dict}
          words={lessonWords}
          onTab={setDict}
          onClose={closeDict}
          onVocab={onVocab}
          t={t}
        />
      )}

      <TranslatePopover pop={pop} onSave={token ? onSave : undefined} />
    </div>
  )
}

/**
 * Лист словаря поверх урока — макет «Обучение», кадр 4108:1689.
 *
 * Вкладка «Практика» показывает слова самого урока: это те же карточки стадии
 * Vocabulary, никакой новой механики за ними нет. Вкладка «Сохранено» — пока
 * заглушка: прочитать личный словарь отсюда нечем (`vocabBank` умеет только
 * складывать слова, читает их раздел «Словарь»), и вместо выдуманного списка
 * здесь стоит объяснение и переход в сам раздел.
 */
function DictSheet({ tab, words, onTab, onClose, onVocab, t }) {
  return (
    <div className="cp-dict" role="dialog" aria-modal="true" aria-label={t('nav.vocab')}>
      <div className="cp-dict__bar">
        <h2 className="cp-dict__title">{t('nav.vocab')}</h2>
        <button className="cp-dict__close" type="button" onClick={onClose} aria-label={t('common.close')}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="cp-dict__tabs" role="tablist">
        <button
          className={`cp-dict__tab ${tab === 'saved' ? 'is-on' : ''}`}
          type="button"
          role="tab"
          aria-selected={tab === 'saved'}
          onClick={() => onTab('saved')}
        >
          {t('lesson.dictSaved')}
        </button>
        <button
          className={`cp-dict__tab ${tab === 'lesson' ? 'is-on' : ''}`}
          type="button"
          role="tab"
          aria-selected={tab === 'lesson'}
          onClick={() => onTab('lesson')}
        >
          {t('lesson.dictLesson')}
        </button>
      </div>

      {tab === 'lesson' ? (
        words.length ? (
          <ul className="cp-dict__list">
            {words.map((w, i) => (
              <li key={`${w.en}-${i}`}>
                {/* Строка целиком — кнопка озвучки: в макете значок стоит
                    справа, но попадать пальцем в 18px на телефоне неудобно. */}
                <button
                  className="cp-dict__row"
                  type="button"
                  onClick={() => speakEnglish(w.en, { src: w.audio || null })}
                  aria-label={t('lesson.hearWord', { word: w.en })}
                >
                  <span className="cp-dict__word">
                    <b>{w.en}</b>
                    <span>{[w.ru, w.kk].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="cp-dict__say" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
                      <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cp-dict__empty">{t('lesson.dictEmpty')}</p>
        )
      ) : (
        <div className="cp-dict__empty">
          <p>{t('lesson.dictSavedHint')}</p>
          {onVocab && (
            <button className="cp-dict__link" type="button" onClick={onVocab}>
              {t('lesson.dictOpen')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Один экран задания: тело по типу шага, снизу кнопка «Проверить»/«Продолжить»
// и, после проверки, плашка результата.
function Step({ step, seed, level, onAdvance, onGraded, t, onWord, token, catalogLessonId }) {
  const graded = isGraded(step)
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)

  // Варианты перемешиваются, чтобы верный не стоял всегда первым. Исключение —
  // шаг с флагом keep: там порядок сам по себе часть задания (шкала, числа,
  // шаги по времени), и перемешать его значит сломать вопрос.
  const options = useMemo(
    () => (step.options ? (step.keep ? step.options : shuffle(step.options, seed * 7919)) : []),
    [step, seed],
  )
  // Иконки вариантов лежат в шаге параллельно options в ИСХОДНОМ порядке, а
  // варианты на экране перемешаны: связываем по значению варианта, иначе
  // «sun» получил бы картинку двери.
  const optionIcons = useMemo(() => {
    if (!Array.isArray(step.optionIcons) || !step.options) return null
    const byOption = new Map(step.options.map((o, i) => [o, step.optionIcons[i]]))
    return options.map((o) => byOption.get(o) || null)
  }, [step, options])
  // Собранная фраза шага «порядок слов».
  const [seq, setSeq] = useState([])
  // Соединение пар: левый пункт → выбранный правый.
  const [links, setLinks] = useState({})
  // Экран с несколькими пропусками: ответ на каждый.
  const [fills, setFills] = useState({})
  // Разминка «отметь, что нравится»: выбор живёт здесь, а не внутри карточек, —
  // кнопка внизу в макете бледная, пока не отмечено ни одной.
  const [picks, setPicks] = useState({})

  const verdict = () => {
    // Экран засчитывается целиком: это одно упражнение из нескольких строк,
    // и сердце за него снимается один раз, а не за каждый пропуск.
    if (step.type === 'group') return (step.items || []).every((it, i) => gapIsRight(it, fills[i] || ''))
    if (step.type === 'rows') return (step.items || []).every((it, i) => normAnswer(fills[i]) === normAnswer(it.answer))
    if (step.type === 'gap') return answerMatches(text, step.answers, gapCue(step))
    if (step.type === 'order') return normAnswer(seq.map((i) => step.words[i]).join(' ')) === normAnswer(step.answer)
    // Соединение засчитывается целиком: это одно упражнение, а не N вопросов,
    // и сердце за него снимается один раз.
    if (step.type === 'match') return (step.pairs || []).every((p, i) => links[i] === p.right)
    // «Найди ошибку»: засчитывается тап ровно по тем словам, которые неверны.
    // У B2 таких слов в предложении сразу несколько, поэтому bad — список, а
    // отмечать приходится все: одно слово из четырёх это ещё не разбор.
    if (step.type === 'mistake') {
      const bad = mistakeBad(step)
      const marked = Object.keys(picks).filter((i) => picks[i]).map(Number)
      return marked.length === bad.length && bad.every((i) => marked.includes(i))
    }
    // Текст с пропусками: экран засчитывается целиком, как и «несколько
    // пропусков» — это одно упражнение, а не N вопросов.
    if (step.type === 'cloze') {
      return (step.answers || []).every((answers, i) => answerMatches(fills[i] || '', answers, ''))
    }
    // Разбор по колонкам: экран — одно упражнение, верно только если каждая
    // карточка легла в свою колонку.
    if (step.type === 'cols') return (step.items || []).every((it, i) => fills[i] === it.col)
    return picked !== null && options[picked] === step.answer
  }
  const isRight = checked && verdict()

  // Кнопка: пока не проверено — «Проверить» (голубая), после и у неоценённых
  // шагов — «Продолжить» (фиолетовая), как в макете.
  const canCheck = graded
    ? step.type === 'group' || step.type === 'rows'
      ? (step.items || []).every((_, i) => String(fills[i] || '').trim() !== '')
      : step.type === 'gap'
      ? text.trim() !== ''
      : step.type === 'order'
        ? seq.length === (step.words || []).length
        : step.type === 'match'
          ? Object.keys(links).length === (step.pairs || []).length
          : step.type === 'cols'
            ? (step.items || []).every((_, i) => fills[i] !== undefined)
            : step.type === 'cloze'
              ? (step.answers || []).every((_, i) => String(fills[i] || '').trim() !== '')
              : step.type === 'mistake'
                ? Object.values(picks).some(Boolean)
                : picked !== null
    : step.type === 'write'
      ? text.trim() !== ''
      : step.type === 'pick'
        ? Object.values(picks).some(Boolean)
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
  // У списка утверждений сам вопрос стоит в строках, а над ними в макете одна
  // тёмная строка — инструкция. Крупной фиолетовой на этом экране нет.
  // У cols инструкция в данных («Put the words in the correct column.») —
  // авторский текст курса, а не UI-строка, и в источнике он английский без
  // ru/kk (см. stageLabel выше — тот же баг). Заголовки колонок (was/were
  // и т.п.) и так называют, что куда класть, поэтому вместо содержимого
  // экрана — общая переведённая инструкция; title экрана в cols не показываем
  // вовсе, чтобы английский не просочился второй строкой.
  const big =
    step.type === 'rows'
      ? ''
      : step.type === 'gap'
        ? gapSentence(step)
        : step.type === 'cols'
          ? t('lesson.cols.instr')
          : promptFirst
            ? step.title
            : step.prompt || step.sub
  const small = step.type === 'cols' ? '' : promptFirst ? step.sub : step.title

  return (
    <>
      <div className="cp-step">
        {/* Слайд правила несёт заголовок внутри карточки — в макете над ней
            ничего нет. */}
        {step.type !== 'note' &&
          (promptFirst ? (
            <>
              {big && <TapText as="div" className="cp-step__prompt" text={big} onWord={onWord} />}
              {small && <TapText as="h2" className="cp-step__title" text={small} onWord={onWord} />}
            </>
          ) : (
            <>
              {small && <TapText as="h2" className="cp-step__title" text={small} onWord={onWord} />}
              {big && <TapText as="div" className="cp-step__prompt" text={big} onWord={onWord} />}
            </>
          ))}

        {/* Подпись стадии у списка утверждений: крупной строки тут нет, и без
            неё подпись некуда деть — она стоит мелкой строкой под инструкцией. */}
        {step.type === 'rows' && step.sub && <p className="cp-step__sub">{step.sub}</p>}

        {/* Запись стадии стоит над заданием, а не отдельным экраном перед ним
            (см. spreadAudio): иначе послушать заново на самом задании нечем.
            Шаг listen рисует свой плеер сам, в теле задания (см. StepBody). */}
        {step.type !== 'listen' && trackSrc(step, level) && <AudioButton src={trackSrc(step, level)} t={t} />}

        <StepBody
          step={step}
          options={options}
          optionIcons={optionIcons}
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
          picks={picks}
          setPicks={setPicks}
          isRight={isRight}
          revealed={revealed}
          level={level}
          t={t}
          onWord={onWord}
          token={token}
          catalogLessonId={catalogLessonId}
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
          {/* Разбор ответа из самого курса («don't ставится перед like»):
              без него у ошибки нет объяснения, а оно там написано. */}
          <b>
            {isRight ? t('lesson.correct') : t('lesson.wrong')}
            {step.why && <span className="cp-fb__why">{step.why}</span>}
          </b>
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

function StepBody({ step, options, optionIcons, picked, setPicked, checked, text, setText, seq, setSeq, links, setLinks, fills, setFills, picks, setPicks, isRight, revealed, level, t, onWord, token, catalogLessonId }) {
  switch (step.type) {
    // Впиши пропущенное: само предложение ушло в вопрос, здесь только поле.
    case 'gap':
      return (
        <>
          {/* У A0/A1 к пропуску идёт готовый набор слов: на этом уровне
              студент выбирает форму, а не печатает её по памяти. */}
          {step.html && (
            <div className="cp-note">
              <TappableHtml className="cp-note__body" html={step.html} onWord={onWord} />
            </div>
          )}
          <input
            className={`cp-field cp-gap__in ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}
            value={checked && !isRight ? step.answers[0] : text}
            onChange={(e) => setText(e.target.value)}
            disabled={checked}
            autoComplete="off"
            spellCheck="false"
            placeholder={t('lesson.typeAnswer')}
          />
          {(step.bank || []).length > 0 && (
            <div className="cp-gap__bank">
              {step.bank.map((w, i) => (
                <button key={i} type="button" className={`cp-chip ${text === w ? 'is-set' : ''}`} disabled={checked} onClick={() => setText(w)}>
                  {w}
                </button>
              ))}
            </div>
          )}
        </>
      )

    // Порядок слов: банк снизу, собранная фраза сверху — слова остаются
    // плашками и на строке ответа, как в макете.
    case 'order':
      return (
        <div className="cp-order">
          <div className={`cp-order__line ${checked ? (isRight ? 'is-right' : 'is-wrong') : ''}`}>
            {/* Задание просит «tap a word above to remove it», поэтому слово в
                собранной фразе — кнопка: убрать лишнее из середины иначе можно
                было только откатив всю фразу до него. */}
            {seq.map((i, at) => (
              <button
                key={`${i}-${at}`}
                type="button"
                className="cp-chip is-set"
                disabled={checked}
                onClick={() => setSeq((s) => s.filter((_, j) => j !== at))}
              >
                {step.words[i]}
              </button>
            ))}
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

    // Список утверждений с общей парой кнопок: один экран вместо пяти.
    case 'rows':
      return <RowsBoard step={step} answers={fills} setAnswers={setFills} checked={checked} />

    // Соединение пар: слева пункты задания, справа банк вариантов.
    case 'match':
      return <MatchBoard step={step} options={options} links={links} setLinks={setLinks} checked={checked} t={t} />

    // Выбор без правильного ответа: отмечаем сколько угодно карточек.
    case 'pick':
      return <PickCards options={step.options} single={step.single} picks={picks} setPicks={setPicks} />

    // Слова урока: карточка переворачивается на перевод по клику.
    case 'cards':
      return (
        <WordCards
          words={step.words}
          t={t}
          token={token}
          catalogLessonId={catalogLessonId}
          source={`course:${level || 'lesson'}`}
        />
      )

    case 'note':
      return (
        <>
          <div className="cp-note">
            {step.title && <TapText as="h2" className="cp-note__h" text={step.title} onWord={onWord} />}
            <TappableHtml className="cp-note__body" html={step.html || ''} onWord={onWord} />
          </div>
          {/* Примеры правила в макете лежат каруселью ПОД карточкой, а не
              внутри неё: карточка — это правило, а карусель — как оно звучит. */}
          {(step.examples || []).length > 0 && <ExampleCarousel items={step.examples} onWord={onWord} />}
        </>
      )

    // Видео-репортаж юнита (B2): его смотрят и идут дальше — проверять тут
    // нечего, вопросы к ролику стоят следующими экранами. Файл лежит рядом с
    // уроком, как и дорожки: /course/<level>/video/<файл>.
    case 'watch':
      return (
        <video
          className="cp-watch"
          controls
          preload="metadata"
          playsInline
          src={step.src || `/course/${String(level).toLowerCase()}/video/${step.video}`}
        />
      )

    case 'listen':
      return (
        <>
          {/* У курса (A2/B1) дорожка лежит рядом с уроком и известна по имени,
              у A0/A1 в задании сразу абсолютный URL на files-dev. */}
          {/* Без записи заголовок «Послушайте…» висел бы над пустотой — экран
              читался как поломка. Говорим прямо, что шаг можно пропустить. */}
          {listenSrc(step, level) ? (
            <AudioButton src={listenSrc(step, level)} t={t} />
          ) : (
            <p className="cp-audio__err cp-audio__err--soft">{t('lesson.noRecording')}</p>
          )}
          {/* Материал для чтения вслух: у части заданий A1 сам текст и есть
              задание («Read each script — and play it out loud»), поэтому он
              стоит под плеером, а не прячется. */}
          {step.html && (
              <div className="cp-note">
                <TappableHtml className="cp-note__body" html={step.html} onWord={onWord} />
              </div>
          )}
          {/* На слух варианты в макете лежат в две колонки: слово короткое,
              и колонкой во всю высоту экрана оно смотрелось бы пусто. */}
          {/* Без записи варианты не рисуем: выбрать среди них честно нечем, а
              неоцениваемый шаг всё равно пропустил бы любой выбор. */}
          {listenSrc(step, level) && (
            <Choices options={options} icons={optionIcons} picked={picked} setPicked={setPicked} checked={checked} answer={step.answer} grid={inTwoColumns(options)} />
          )}
        </>
      )

    case 'choice':
      return (
        <>
          {/* Задание «Listen. Choose the word you hear.»: слова нет ни в
              вопросе, ни в вариантах — оно живёт только в поле say, и без
              озвучки экран неразрешим (см. SayButton). */}
          {step.say && <SayButton text={step.say} src={step.sayTrack || null} t={t} />}
          {/* Текст, к которому задан вопрос (диалог, абзац статьи, примеры
              правила): задание на него ссылается, и отвечать по памяти
              студент не должен. */}
          {step.html && (
            <div className="cp-note">
              <TappableHtml className="cp-note__body" html={step.html} onWord={onWord} />
            </div>
          )}
          <Choices
            options={options}
            icons={optionIcons}
            picked={picked}
            setPicked={setPicked}
            checked={checked}
            answer={step.answer}
            grid={!!step.say && inTwoColumns(options)}
          />
        </>
      )

    case 'write':
      return (
        <>
          {/* Опора задания: рамки предложений («I like ___ .») и слова, из
              которых их собирают. Подпись «Используйте слова ниже» ссылается
              именно на них, а ветка их не рисовала — студент видел пустое поле
              под требованием использовать слова, которых нет. */}
          {step.html && (
            <div className="cp-note">
              <TappableHtml className="cp-note__body" html={step.html} onWord={onWord} />
            </div>
          )}
          {/* Поле растёт под ответ само: уголок ресайза в макете не нарисован,
              а без роста двух предложений в него не видно. */}
          <textarea
            className="cp-field cp-write"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            placeholder={step.placeholder || t('lesson.typeAnswer')}
            rows={1}
          />
          {revealed && (step.modelHtml || step.model) && (
            <div className="cp-model">
              <b>{t('lesson.modelAnswer')}</b>
              {/* У A0/A1 образец размеченный: в нём список «Check yourself»,
                  плоским текстом он склеился бы в одну строку. */}
              {step.modelHtml ? (
                <TappableHtml className="cp-model__body" html={step.modelHtml} onWord={onWord} />
              ) : (
                <TapText as="span" text={step.model} onWord={onWord} />
              )}
            </div>
          )}
        </>
      )

    case 'checklist':
      return <Checklist items={step.items} />

    // Найди ошибку: предложение разобрано на слова, тап по неверному.
    case 'mistake':
      return <MistakeLine step={step} picks={picks} setPicks={setPicks} checked={checked} />

    // Текст с пропусками: абзац целиком, поля ответа под ним по номерам.
    case 'cloze':
      return <ClozeText step={step} fills={fills} setFills={setFills} checked={checked} t={t} onWord={onWord} />

    // Разбор по колонкам: выбрать карточку, затем колонку — как в курсе.
    case 'cols':
      return <ColumnsBoard step={step} fills={fills} setFills={setFills} checked={checked} />

    // Фразы урока: строка с кнопкой звука. Задания тут нет — их слушают и
    // повторяют, поэтому экран идёт без оценки.
    case 'phrases':
      return <PhraseList items={step.items} onWord={onWord} />

    case 'record':
      return <RecordBoard items={step.items} audio={step.itemAudio} t={t} />

    default:
      return null
  }
}

// Неверных слов в предложении бывает и одно (A0/A1), и четыре (B2), поэтому
// bad читается списком независимо от того, как он записан в данных.
export function mistakeBad(step) {
  return (Array.isArray(step.bad) ? step.bad : [step.bad]).filter((i) => Number.isInteger(i))
}

// Строка с ошибкой. После проверки неверные слова подсвечены всегда — иначе
// студент, ткнувший наугад, не узнает, где была ошибка.
function MistakeLine({ step, picks, setPicks, checked }) {
  const bad = mistakeBad(step)
  return (
    <div className="cp-mistake">
      {(step.tokens || []).map((w, i) => {
        // Точку и вопросительный знак в исходном курсе тапнуть нельзя: они не
        // слова, а лишний тап по ним стоил бы верного ответа — у B2 вердикт
        // требует ровно то множество слов, что помечено ошибочным.
        if (/^[.,!?;:—–…"«»]+$/.test(String(w).trim())) {
          return (
            <span key={i} className="cp-mistake__punct">
              {w}
            </span>
          )
        }
        let cls = 'cp-mistake__tok'
        if (checked) {
          if (bad.includes(i)) cls += ' is-bad'
          else if (picks[i]) cls += ' is-wrong'
        } else if (picks[i]) cls += ' is-sel'
        return (
          <button
            key={i}
            type="button"
            className={cls}
            disabled={checked}
            onClick={() => setPicks((s) => ({ ...s, [i]: !s[i] }))}
          >
            {w}
          </button>
        )
      })}
      {checked && step.answer && <p className="cp-mistake__fix">{step.answer}</p>}
    </div>
  )
}

// Текст с пропусками. Абзац показываем целиком — в нём и есть задание, — а
// поля ответа идут под ним по номерам: вставить их внутрь абзаца значило бы
// разорвать текст на куски и потерять то, ради чего он написан.
function ClozeText({ step, fills, setFills, checked, t, onWord }) {
  const answers = step.answers || []
  return (
    <div className="cp-cloze">
      {step.html && (
        <div className="cp-note">
          <TappableHtml className="cp-note__body" html={step.html} onWord={onWord} />
        </div>
      )}
      {/* Банк слов кликабельный: тап кладёт слово в первый пустой пропуск —
          так же, как в исходном курсе, где слово переносят тапом. */}
      {(step.bank || []).length > 0 && (
        <div className="cp-cloze__bank">
          {step.bank.map((w, i) => {
            const used = Object.values(fills).includes(w)
            return (
              <button
                key={i}
                type="button"
                className={`cp-chip ${used ? 'is-set' : ''}`}
                disabled={checked}
                onClick={() =>
                  setFills((s) => {
                    const at = answers.findIndex((_, j) => !String(s[j] || '').trim())
                    return at < 0 ? s : { ...s, [at]: w }
                  })
                }
              >
                {w}
              </button>
            )
          })}
        </div>
      )}
      <div className="cp-group">
        {answers.map((accepted, i) => {
          const value = fills[i] || ''
          const ok = checked && answerMatches(value, accepted, '')
          return (
            <div className="cp-group__row" key={i}>
              <span className="cp-group__q">{i + 1}</span>
              <input
                className={`cp-field cp-group__in ${checked ? (ok ? 'is-right' : 'is-wrong') : ''}`}
                value={checked && !ok ? accepted[0] : value}
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
    </div>
  )
}

// Карточки по колонкам. Разложенную карточку можно снять обратно тапом:
// иначе одна ошибка блокирует весь экран.
function ColumnsBoard({ step, fills, setFills, checked }) {
  const [active, setActive] = useState(null)
  const items = step.items || []
  const place = (col) => {
    if (checked || active === null) return
    setFills((s) => ({ ...s, [active]: col }))
    setActive(null)
  }
  return (
    <div className="cp-cols">
      <div className="cp-cols__bank">
        {items.map((it, i) =>
          fills[i] === undefined ? (
            <button
              key={i}
              type="button"
              className={`cp-chip ${active === i ? 'is-set' : ''}`}
              disabled={checked}
              onClick={() => setActive(active === i ? null : i)}
            >
              {it.text}
            </button>
          ) : null,
        )}
      </div>
      <div className="cp-cols__grid">
        {(step.columns || []).map((name, col) => (
          <div
            key={col}
            className={`cp-cols__col ${active !== null ? 'is-open' : ''}`}
            onClick={() => place(col)}
            role="presentation"
          >
            <h4>{name}</h4>
            {items.map((it, i) =>
              fills[i] === col ? (
                <button
                  key={i}
                  type="button"
                  className={`cp-cols__item ${checked ? (it.col === col ? 'is-right' : 'is-wrong') : ''}`}
                  disabled={checked}
                  onClick={(e) => {
                    e.stopPropagation()
                    setFills((s) => {
                      const next = { ...s }
                      delete next[i]
                      return next
                    })
                  }}
                >
                  {it.text}
                </button>
              ) : null,
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Фразы «послушай и повтори»: у части строк есть запись курса, у остальных
// читает синтез — тот же порядок, что и в исходном движке (say()).
// Рамка — строка с пропуском «…» («Would you mind …ing?»). Синтез читает
// пропуск кашей, поэтому записи у рамки нет намеренно (то же правило —
// scripts/lib/course-frame.js), и браузерным синтезом её тоже не читаем:
// рамка без записи — просто текст, без кнопки «послушать».
const FRAME = /…|\.\.\./
const isFrame = (text) => FRAME.test(String(text ?? '').replace(/<[^>]+>/g, ''))
const silentFrame = (text, src) => !src && isFrame(text)

function PhraseList({ items, onWord }) {
  useEffect(() => stopSpeaking, [])
  return (
    <div className="cp-phrases">
      {(items || []).map((it, i) =>
        silentFrame(it.text, it.src) ? (
          <div key={i} className="cp-phrases__row is-frame">
            <TapText as="span" className="cp-phrases__text" text={it.text} onWord={onWord} />
          </div>
        ) : (
        <button
          key={i}
          type="button"
          className="cp-phrases__row"
          onClick={() => speakEnglish(it.text, { src: it.src || null })}
        >
          <TapText as="span" className="cp-phrases__text" text={it.text} onWord={onWord} />
          <span className="cp-phrases__spk" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M15.5 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </button>
        ),
      )}
    </div>
  )
}

// Экран говорения: строки читаются вслух, ответ студент записывает на
// микрофон и слушает себя. Оценки тут нет — сравнивать запись не с чем.
//
// Микрофон бывает недоступен (нет разрешения, http-контекст, старый браузер):
// экран обязан остаться проходимым, поэтому отказ показывается строкой, а
// кнопка «Продолжить» работает в любом случае.
//
// mimeType — не косметика: Safari на iPhone/iPad писать webm не умеет вообще
// (только audio/mp4), а тегать Blob чужим типом нельзя — <audio> ниже открывает
// его по заявленному типу, и Safari webm не проигрывает ни в каком виде. Без
// подбора запись воспроизводилась бы на Android/десктопе и падала «Error» у
// каждого студента с айфона (см. ShadowingPage.jsx — тот же приём).
function pickRecordMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || ''
}

// Образец шага record — строка, запись к нему — в параллельном массиве
// step.itemAudio (тот же индекс, null — записи нет). Строкой образец был
// всегда, и записи прописать было некуда: его читал только браузерный синтез —
// чужой голос посреди урока, а на Android без английского голоса тишина.
//
// Почему не объект { text, src } прямо в items: плеер до этой правки рендерит
// образец как есть, и на объекте ПАДАЕТ («Objects are not valid as a React
// child») — белый экран. Вкладка, открытая до выкатки, держит старый бандл,
// а шаги урока качает свежие, поэтому новые данные обязаны читаться старым
// плеером. Лишнее поле он просто не видит. Объект здесь всё равно понимаем —
// им недолго писали данные (ветка content/voice-record-samples).
// Экспортируется ради теста и тех, кто читает шаги.
export function recordLine(item, audio = null) {
  if (item && typeof item === 'object') return { text: String(item.text ?? ''), src: item.src || audio || null }
  return { text: String(item ?? ''), src: audio || null }
}

// Строка без записи на кириллице — не образец, а задание («Ответьте вслух: кто
// ваш самый давний друг?»); у B1 таких больше половины строк record. Кнопкой
// «послушать» она была зря: синтез с английским голосом читал кириллицу
// мусором, а говорить здесь должен студент. Записи у задания не будет —
// scripts/voice-step-cards.js озвучивает только английские строки. Рамка с
// пропуском («My closest friend is … .») без записи — тоже текст: см. isFrame.
const CYRILLIC = /\p{Script=Cyrillic}/u
const isRecordTask = (line) => !line.src && (CYRILLIC.test(line.text) || isFrame(line.text))

function RecordBoard({ items, audio, t }) {
  const [state, setState] = useState('idle') // idle | live | done | denied
  const [url, setUrl] = useState('')
  const recRef = useRef(null)

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop()
      } catch {
        /* уже остановлен */
      }
      stopSpeaking()
    }
  }, [])

  const toggle = async () => {
    if (state === 'live') {
      recRef.current?.stop()
      return
    }
    const md = typeof navigator === 'undefined' ? null : navigator.mediaDevices
    if (!md || typeof window === 'undefined' || !window.MediaRecorder) {
      setState('denied')
      return
    }
    try {
      const stream = await md.getUserMedia({ audio: true })
      const mime = pickRecordMime()
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      const chunks = []
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        setUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })))
        setState('done')
        stream.getTracks().forEach((x) => x.stop())
      }
      recRef.current = rec
      rec.start()
      setState('live')
    } catch {
      setState('denied')
    }
  }

  return (
    <div className="cp-rec">
      {(items || []).map((it, i) => recordLine(it, audio?.[i])).map((line, i) =>
        isRecordTask(line) ? (
          <p key={i} className="cp-rec__line cp-rec__line--task">
            {line.text}
          </p>
        ) : (
          <button key={i} type="button" className="cp-rec__line" onClick={() => speakEnglish(line.text, { src: line.src })}>
            {line.text}
          </button>
        ),
      )}
      <button type="button" className={`cp-rec__btn ${state === 'live' ? 'is-live' : ''}`} onClick={toggle}>
        {t(state === 'live' ? 'lesson.recordStop' : state === 'done' ? 'lesson.recordAgain' : 'lesson.record')}
      </button>
      {state === 'denied' && <p className="cp-rec__note">{t('lesson.recordNoMic')}</p>}
      {url && <audio className="cp-rec__play" src={url} controls />}
    </div>
  )
}

// Карусель примеров под слайдом правила. Окно на три карточки со стрелками по
// краям — как в макете; примеров у правила бывает и два, тогда стрелки просто
// не нажимаются.
const EGS_WINDOW = 3

function ExampleCarousel({ items, onWord }) {
  const [from, setFrom] = useState(0)
  const last = Math.max(0, items.length - EGS_WINDOW)
  return (
    <div className="cp-egs">
      <button className="cp-egs__nav" type="button" disabled={from === 0} aria-label="←" onClick={() => setFrom((f) => Math.max(0, f - 1))}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="cp-egs__list">
        {items.slice(from, from + EGS_WINDOW).map((x, i) => (
          <TapText key={from + i} as="span" className="cp-egs__card" text={x} onWord={onWord} />
        ))}
      </div>
      <button className="cp-egs__nav" type="button" disabled={from >= last} aria-label="→" onClick={() => setFrom((f) => Math.min(last, f + 1))}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// Сетка в две колонки — только когда вариантов чётное число. У трёх вариантов
// последний оставался один в ряду: сетка выглядела сломанной, а не короткой.
const inTwoColumns = (options) => (options || []).length % 2 === 0

// «Послушайте. Выберите картинку.»: варианты — иконки курса (optionIcons,
// тот же порядок, что и options), и подписи под ними нет, как в самом курсе:
// слово под картинкой превратило бы задание в «найди услышанное слово».
// Ответ по-прежнему сверяется по options.
const hasPics = (icons, options) => Array.isArray(icons) && icons.length === options.length && icons.every(Boolean)

function Choices({ options, icons, picked, setPicked, checked, answer, grid = false }) {
  const pics = hasPics(icons, options)
  return (
    <div className={`cp-choices ${pics ? 'is-pics' : grid ? 'is-grid' : ''}`}>
      {options.map((o, i) => {
        // Подсвечиваем только выбранный вариант: в макете после неверного
        // ответа правильный не раскрывается — остальные кнопки остаются белыми.
        let cls = pics ? 'cp-choice cp-choice--pic' : 'cp-choice'
        if (checked) {
          if (i === picked) cls += o === answer ? ' is-right' : ' is-wrong'
        } else if (i === picked) cls += ' is-sel'
        return (
          <button key={i} className={cls} disabled={checked} onClick={() => setPicked(i)} aria-label={pics ? o : undefined}>
            {pics ? (
              // Разметка иконки — из файла курса, отфильтрована экстрактором
              // (scripts/selfstudy/read-course.js, courseIcons).
              <svg className="cp-choice__icon" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons[i] }} />
            ) : (
              o
            )}
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
  const pairs = step.pairs || []
  // «Соедините слова и картинки» (A0): правая половина — имя иконки курса, на
  // экране — сама иконка. Сверка пар по-прежнему по имени.
  const icons = step.rightIcons || null
  const face = (o) =>
    icons && icons[o] ? <svg className="cp-match__icon" viewBox="0 0 24 24" role="img" aria-label={o} dangerouslySetInnerHTML={{ __html: icons[o] }} /> : o

  // Банк — инвентарь: одинаковых вариантов в нём может быть несколько, и
  // каждая копия расходуется отдельно. Занятость по ЗНАЧЕНИЮ (`used.has(o)`)
  // гасила все копии разом: у b1 `steps-T12` банк ["of","in","on","on","of"],
  // и первая же пара depend→on выключала оба «on» — соединить пять пар было
  // нечем, «Проверить» оставалась серой без кнопки пропуска, а вместе с
  // непройденным тестом юнита запиралась вся остальная тропа уровня.
  const taken = {}
  Object.values(links).forEach((v) => {
    taken[v] = (taken[v] || 0) + 1
  })
  const bankCount = {}
  options.forEach((o) => {
    bankCount[o] = (bankCount[o] || 0) + 1
  })
  const isFull = (value) => (taken[value] || 0) >= (bankCount[value] || 0)
  // Гаснут ПЕРВЫЕ по счёту копии значения — столько, сколько ушло в пары:
  // иначе после соединения банк выглядел бы нетронутым.
  const spentChip = (() => {
    const seen = {}
    return options.map((o) => {
      seen[o] = (seen[o] || 0) + 1
      return seen[o] <= (taken[o] || 0)
    })
  })()

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
    if (checked || isFull(value)) return
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
              {links[i] !== undefined && <span className="cp-match__pick">{face(links[i])}</span>}
              {checked && links[i] !== p.right && <span className="cp-match__fix">{face(p.right)}</span>}
            </button>
          )
        })}
      </div>
      <div className="cp-match__bank" aria-label={t('lesson.matchBank')}>
        {options.map((o, i) => (
          <button key={i} className={`cp-chip ${icons && icons[o] ? 'cp-chip--pic' : ''}`} disabled={checked || spentChip[i]} onClick={() => tapRight(o)}>
            {face(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

// Строка вопроса и кнопки ответа рядом с ней. Два случая: у True/False набор
// кнопок общий на весь экран (step.options), у вопросов к записи свой на
// каждую строку (it.options) — «post a ___» и три слова к нему.
//
// Ключевое слово в макете выделено фиолетовым — это первое слово утверждения
// после значка, ради него строка и написана («Listen means “use your ears”»).
// У вопроса с пропуском выделять нечего: там ключевое слово и есть ответ.
const ROW_KEYWORD = /^((?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*\s+)?)(\S+)([\s\S]*)$/u

// Длинный вариант в строку не встаёт: у B1 варианты бывают целым предложением
// (медиана 37 символов, максимум 92). Такую строку раскладываем в столбик —
// вопрос сверху, варианты под ним во всю ширину.
const ROW_LONG_OPTION = 24

function RowsBoard({ step, answers, setAnswers, checked }) {
  return (
    <div className="cp-rows">
      {(step.items || []).map((it, i) => {
        const gap = /_{2,}|___/.test(String(it.q || ''))
        const m = gap ? null : ROW_KEYWORD.exec(String(it.q || ''))
        const opts = it.options || step.options || []
        const stacked = opts.some((o) => String(o).length > ROW_LONG_OPTION)
        return (
          <div className={`cp-rows__row ${stacked ? 'is-stacked' : ''}`} key={i}>
            <span className="cp-rows__q">
              {m ? (
                <>
                  {m[1]}
                  <b>{m[2]}</b>
                  {m[3]}
                </>
              ) : (
                it.q
              )}
            </span>
            <span className="cp-rows__opts">
              {opts.map((o) => {
                let cls = 'cp-rows__opt'
                if (answers[i] === o) cls += checked ? (o === it.answer ? ' is-right' : ' is-wrong') : ' is-sel'
                return (
                  <button key={o} className={cls} type="button" disabled={checked} onClick={() => setAnswers((s) => ({ ...s, [i]: o }))}>
                    {o}
                  </button>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Карточки разминки. У «Tap one» выбор один — прежняя отметка снимается сама,
// иначе инструкция обещает одно, а экран разрешает другое.
// Карточка «выбери что ближе» рассчитана на слово с эмодзи («Coffee»), а у
// курса в варианте бывает целая ситуация на десять слов. В колонку 173px такой
// текст не влезает и вылезает за карточку, поэтому длинные варианты идут
// строками во всю ширину — по одному в ряд.
const PICK_LONG_OPTION = 28

function PickCards({ options, single, picks: on, setPicks: setOn }) {
  const rows = (options || []).some((o) => String(o.label || '').length > PICK_LONG_OPTION)
  return (
    <div className={`cp-picks ${rows ? 'is-rows' : ''}`}>
      {(options || []).map((o, i) => (
        <button
          key={i}
          className={`cp-pick ${on[i] ? 'is-on' : ''}`}
          onClick={() => setOn((s) => (single ? { [i]: !s[i] } : { ...s, [i]: !s[i] }))}
        >
          {o.emoji && <span className="cp-pick__emoji">{o.emoji}</span>}
          <span className="cp-pick__label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

// Флаги на плашках перевода рисуем разметкой, а не эмодзи 🇰🇿/🇷🇺: в Windows
// шрифтов с флагами нет вовсе, и вместо флага на экране остаются буквы «KZ».
function FlagKZ() {
  return (
    <svg className="cp-word__flag" width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
      <rect width="18" height="13" rx="2" fill="#00AFCA" />
      <circle cx="9" cy="6" r="2.6" fill="#FEC50C" />
    </svg>
  )
}

function FlagRU() {
  return (
    <svg className="cp-word__flag" width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
      <rect width="18" height="13" rx="2" fill="#D52B1E" />
      <path d="M0 2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.33H0z" fill="#fff" />
      <rect y="4.33" width="18" height="4.34" fill="#0039A6" />
    </svg>
  )
}

async function saveCourseWordToLessonDict(token, w, catalogLessonId, source) {
  if (!token || !String(w?.en || '').trim()) return false
  const word = String(w.en).trim()
  let ok = false
  if (w.ru) {
    try {
      await saveWord(token, { word, translation: w.ru, language: 'ru', source, catalogLessonId })
      ok = true
    } catch { /* словарь уроков — best-effort, как vocab_bank */ }
  }
  if (w.kk) {
    try {
      await saveWord(token, { word, translation: w.kk, language: 'kk', source, catalogLessonId })
      ok = true
    } catch { /* kk отдельно: ru уже мог сохраниться */ }
  }
  return ok
}

function WordCards({ words, t, token, catalogLessonId, source }) {
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
      // Подсказка словаря — перевод, а где его нет (B2 весь на английском) —
      // определение слова: пустая подсказка в vocab_bank бесполезна.
    const [bankOk, lessonOk] = await Promise.all([
      addVocabWords([{ word: w.en, hint: [w.ru, w.kk].filter(Boolean).join(' · ') }]),
      saveCourseWordToLessonDict(token, w, catalogLessonId, source),
    ])
      // Не сохранилось — возвращаем кнопку, иначе галочка врёт про слово,
      // которого в словаре нет.
    if (!bankOk && !lessonOk) setSaved((s) => ({ ...s, [i]: false }))
  }

  return (
    <div className="cp-words">
      {(words || []).map((w, i) => (
        // Карточка — не кнопка: внутри неё живёт своя кнопка «в словарь», а
        // кнопку в кнопку вкладывать нельзя. Переворот повесен на внутреннюю.
        // is-noimg — у A1 картинок слов в источнике нет вовсе (0 из 452), и
        // карточка тогда печатала слово ДВАЖДЫ: крупно на пустой плашке и
        // подписью под ней. Модификатор снимает дубль и делает лицо карточки
        // типографским.
        <div key={i} className={`cp-word ${open[i] ? 'is-open' : ''} ${w.img || w.icon ? '' : 'is-noimg'}`}>
          {/* Тап по карточке произносит слово и переворачивает её — ровно то,
              что обещает инструкция стадии («Look and listen. Tap a picture to
              hear the word»). Без озвучки презентация слов была немой: студент
              видел написание и перевод, но не знал, как это звучит, — а через
              экран его уже спрашивают то же слово на слух. */}
          <button
            className="cp-word__flip"
            onClick={() => {
              if (!silentFrame(w.en, w.audio)) speakEnglish(w.en, { src: w.audio || null })
              setOpen((s) => ({ ...s, [i]: true }))
            }}
            aria-label={t('lesson.hearWord', { word: w.en })}
          >
            <span className="cp-word__face">
              {/* alt называет слово: картинка иллюстрирует значение, а не
                  украшает экран. */}
              {w.img ? (
                <AssetImage src={w.img} alt={w.en} loading="lazy" hideOnError />
              ) : w.icon ? (
                // Фото нет — иконка самого курса (A0): та же картинка, что на
                // карточке исходника. Разметка отфильтрована экстрактором.
                <span className="cp-word__art">
                  <svg className="cp-word__icon" viewBox="0 0 24 24" role="img" aria-label={w.en} dangerouslySetInnerHTML={{ __html: w.icon }} />
                </span>
              ) : (
                <span className="cp-word__noimg">{w.en}</span>
              )}
            </span>
          </button>
          {/* Оборот карточки по макету: сверху слово с определением, под ним
              переводы плашками с флагом, снизу «В словарь» и повтор звука.
              Раньше «+» висел углом на лицевой стороне, а озвучка была только
              побочным действием переворота — отдельной кнопки звука не было. */}
          {open[i] && (
            <div className="cp-word__back">
              {/* Закрыть перевод можно тапом по обороту — это кнопка во всю
                  карточку под содержимым: кнопку в кнопку вкладывать нельзя,
                  а «В словарь» и звук на обороте свои. */}
              <button
                className="cp-word__unflip"
                type="button"
                aria-label={t('lesson.hideWord', { word: w.en })}
                onClick={() => setOpen((s) => ({ ...s, [i]: false }))}
              />
              <span className="cp-word__head">
                <b>{w.en}</b>
                {w.def && <i>{w.def}</i>}
              </span>
              <span className="cp-word__trs">
                {w.kk && (
                  <span className="cp-word__tr">
                    <FlagKZ />
                    {w.kk}
                  </span>
                )}
                {w.ru && (
                  <span className="cp-word__tr">
                    <FlagRU />
                    {w.ru}
                  </span>
                )}
              </span>
              <span className="cp-word__acts">
                <button
                  className={`cp-word__save ${saved[i] ? 'is-saved' : ''}`}
                  type="button"
                  disabled={!!saved[i]}
                  title={saved[i] ? t('lesson.inVocab') : t('lesson.addToVocab')}
                  onClick={() => add(i, w)}
                >
                  {saved[i] ? t('lesson.savedVocab') : t('lesson.toVocab')}
                </button>
                {!silentFrame(w.en, w.audio) && (
                  <button
                    className="cp-word__say"
                    type="button"
                    aria-label={t('lesson.hearWord', { word: w.en })}
                    onClick={() => speakEnglish(w.en, { src: w.audio || null })}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
                      <path d="M16 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </span>
            </div>
          )}
          <span className="cp-word__label">{w.en}</span>
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

// Дорожка стадии живёт ВНЕ экрана задания: элемент один на весь урок и
// пересоздаётся только при смене записи. Раньше <audio> лежал внутри шага и
// умирал вместе с ним, а кнопка play каждый раз ставила currentTime = 0 —
// перейдя к следующему вопросу к той же записи, студент слушал её с начала.
// При дорожке в 50–90 секунд и шести вопросах это девять минут аудио на одно
// упражнение.
let stageAudio = null
let stageAudioSrc = ''

function getStageAudio(src) {
  if (stageAudioSrc !== src) {
    stageAudio?.pause()
    stageAudio = new Audio(src)
    stageAudioSrc = src
    // Живой урок: преподаватель следует за той же дорожкой (см. audioReport.js).
    // currentSrc — уже абсолютный URL, в отличие от переданного src, который
    // может быть относительным путём под public/course/<level>/.
    stageAudio.addEventListener('play', () => reportAudio({ kind: 'file', action: 'play', url: stageAudio.currentSrc || src }))
    stageAudio.addEventListener('pause', () => reportAudio({ kind: 'file', action: 'stop', url: stageAudio.currentSrc || src }))
  }
  return stageAudio
}

export function stopStageAudio() {
  stageAudio?.pause()
  stageAudio = null
  stageAudioSrc = ''
}

const AUDIO_EVENTS = ['play', 'pause', 'ended', 'timeupdate']

// Дорожка живёт вне React, поэтому кнопка читает её через подписку на элемент,
// а не хранит своё состояние: экран сменился, а запись та же — и кнопка обязана
// показать «пауза» у играющей дорожки, а не «play».
function useStageAudio(src) {
  const subscribe = useCallback(
    (onChange) => {
      const a = getStageAudio(src)
      for (const e of AUDIO_EVENTS) a.addEventListener(e, onChange)
      return () => {
        for (const e of AUDIO_EVENTS) a.removeEventListener(e, onChange)
      }
    },
    [src],
  )
  const server = () => false
  const playing = useSyncExternalStore(subscribe, () => !getStageAudio(src).paused, server)
  const started = useSyncExternalStore(subscribe, () => getStageAudio(src).currentTime > 0, server)
  return { playing, started }
}

// Аудио стадии слушания: пауза/продолжение, замедленно и «сначала».
function AudioButton({ src, t }) {
  const { playing, started } = useStageAudio(src)
  const [failed, setFailed] = useState(false)

  const play = (rate, fromStart) => {
    const a = getStageAudio(src)
    a.playbackRate = rate
    // Доиграла до конца — следующий тап начинает заново, иначе кнопка молчала бы.
    if (fromStart || a.ended) a.currentTime = 0
    // Отказ раньше гасился молча: на 404 или обрыве сети кнопка выглядела
    // живой, а звука не было — ученик крутил громкость и отвечал наугад.
    // AbortError — не сбой: это пауза, прервавшая ещё не начатый play().
    a.play()
      .then(() => setFailed(false))
      .catch((e) => {
        if (e?.name === 'AbortError') return
        console.warn('[lesson] запись не проиграла:', src, e?.name || e)
        setFailed(true)
      })
  }

  const toggle = () => {
    const a = getStageAudio(src)
    if (a.paused) play(1, false)
    else a.pause()
  }

  return (
    <div className="cp-audio">
      <button className="cp-audio__play" onClick={toggle} aria-label={playing ? t('lesson.pause') : t('lesson.play')}>
        {playing ? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <button className="cp-audio__slow" onClick={() => play(0.6, false)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17h5a5 5 0 0 1 5-5 5 5 0 0 1 5 5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="15" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M16 12V8m3 4V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {t('lesson.playSlow')}
      </button>
      {/* «Сначала» появляется, только когда есть что перематывать: на нетронутой
          записи кнопка ничего бы не делала. */}
      {started && (
        <button className="cp-audio__restart" onClick={() => play(1, true)}>
          {t('lesson.playAgain')}
        </button>
      )}
      {failed && (
        <p className="cp-audio__err" role="alert">
          {t('lesson.audioFailed')}
        </p>
      )}
    </div>
  )
}
