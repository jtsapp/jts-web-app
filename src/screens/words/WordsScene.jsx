'use client'

// Сама игра: сцена с расставленными спрайтами, голос называет слово, студент
// тапает картинку. Порт renderScene/loadRound/pick/nextRound прототипа
// (jtswords.html:~395–545).
//
// Раскладку считает src/practice/words/layout.js — здесь только показ и
// реакция на тап. Координаты приходят в единицах сцены (проценты), спрайт
// позиционируется якорем в низ-центр: left/top — это точка, где он «стоит».
//
// Компонента два, и это не косметика: раунд со всем своим состоянием (что
// найдено, какое слово спрашиваем, замок на время паузы) живёт в WordsRound с
// key={round}. Смена раунда РАЗМОНТИРУЕТ его, и состояние сбрасывается само —
// без эффекта, который дёргал бы четыре setState разом и гнал каскад рендеров.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { makeRng, shuffle } from '../../practice/words/session.js'
import { placeRound, stageAR } from '../../practice/words/layout.js'
import { sceneBgUrl, spriteUrl } from '../../practice/words/assets.js'
import { translate } from '../../practice/words/loc.js'
import { IconSound } from './WordsIcons.jsx'

// Пауза после верного тапа: столько показываем найденное слово с переводом,
// прежде чем спросить следующее. В прототипе — 1500 мс.
const FOUND_PAUSE = 1500
// Заставка между раундами.
const ROUND_PAUSE = 1500
// Задержка перед произнесением следующего слова: без неё оно накладывается на
// звук успеха.
const ANNOUNCE_DELAY = 150

export default function WordsScene({ scene, session, section, seed, portrait, wordLang, voice, onFound, onFinish }) {
  const [round, setRound] = useState(0)
  const [toast, setToast] = useState('')
  const { t } = useI18n()
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const finishRound = useCallback(() => {
    if (round + 1 >= session.rounds.length) {
      onFinish?.()
      return
    }
    voice.stop()
    setToast(t('words.roundNext', { n: round + 2, total: session.rounds.length }))
    timer.current = setTimeout(() => {
      setToast('')
      setRound(round + 1)
    }, ROUND_PAUSE)
  }, [round, session.rounds.length, voice, onFinish, t])

  return (
    <WordsRound
      key={round}
      scene={scene}
      words={session.rounds[round] || EMPTY}
      poolSize={session.pool.length}
      round={round}
      rounds={session.rounds.length}
      section={section}
      seed={seed}
      portrait={portrait}
      wordLang={wordLang}
      voice={voice}
      toast={toast}
      onFound={onFound}
      onRoundDone={finishRound}
    />
  )
}

// Стабильная пустая ссылка: `|| []` в пропсах создавал бы новый массив каждый
// рендер и сбрасывал бы всю мемоизацию раунда.
const EMPTY = []

function WordsRound({
  scene,
  words,
  poolSize,
  round,
  rounds,
  section,
  seed,
  portrait,
  wordLang,
  voice,
  toast,
  onFound,
  onRoundDone,
}) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const [found, setFound] = useState(() => new Set())
  const [lock, setLock] = useState(false)
  const [wrong, setWrong] = useState(null) // { id } — для тряски спрайта
  const timer = useRef(null)

  // Порядок опроса — свой у раунда: расстановка и очередь вопросов не должны
  // совпадать, иначе слова спрашиваются слева направо и картинку можно не
  // слушать вовсе.
  const order = useMemo(() => shuffle(words, makeRng(seed + round * 7919)), [words, seed, round])

  // Расстановка считается один раз на раунд и заново при повороте экрана —
  // это relayout прототипа: координаты пересчитываются, прогресс раунда живёт.
  const placed = useMemo(
    () => placeRound(words, scene, { portrait, rng: makeRng(seed + round * 104729), section }),
    [words, scene, portrait, seed, round, section],
  )

  const target = order[idx] || null
  const ar = stageAR(portrait)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Записи раунда тянем заранее: пауза перед первым словом читается как
  // поломка, а не как загрузка.
  useEffect(() => {
    voice.preload(words)
  }, [words, voice])

  // Слово произносится на каждую смену цели. Проверка актуальности внутри
  // schedule: пока ждали, человек мог выйти в каталог.
  useEffect(() => {
    if (!target || toast) return undefined
    let alive = true
    voice.schedule(target, ANNOUNCE_DELAY, () => alive)
    return () => {
      alive = false
    }
  }, [target, toast, voice])

  const pick = useCallback(
    (word) => {
      if (lock || !target || found.has(word.id)) return
      if (word.id !== target.id) {
        // Промах — только визуальный отклик. Слово НЕ переспрашивается само:
        // в прототипе так же, иначе перебор картинок становится дешевле, чем
        // вслушивание.
        setWrong({ id: word.id })
        return
      }
      setLock(true)
      setWrong(null)
      voice.stop()
      setFound((prev) => new Set(prev).add(word.id))
      onFound?.(word.id)
      timer.current = setTimeout(() => {
        setLock(false)
        if (idx + 1 < order.length) setIdx(idx + 1)
        else onRoundDone()
      }, FOUND_PAUSE)
    },
    [lock, target, found, idx, order.length, voice, onFound, onRoundDone],
  )

  // Пробел повторяет слово — как в прототипе. Кнопку при этом расфокусируем,
  // иначе пробел сначала «нажмёт» её.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' || e.repeat || lock) return
      e.preventDefault()
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur()
      if (target) voice.play(target)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [target, lock, voice])

  const justFound = lock && target ? target : null

  return (
    <div className="wd-play">
      <div className="wd-task">
        <div className="wd-task__row">
          <span className="wd-task__text">{t('words.task.' + section)}</span>
          <span className="wd-dots" aria-hidden="true">
            {words.map((w) => (
              <i key={w.id} className={found.has(w.id) ? 'on' : ''} />
            ))}
          </span>
          {rounds > 1 && <span className="wd-task__round">{t('words.round', { n: round + 1, total: rounds })}</span>}
        </div>
        <button
          type="button"
          className={`wd-speak${wrong ? ' wd-speak--nudge' : ''}${voice.failedAt ? ' wd-speak--missing' : ''}`}
          onClick={() => target && voice.play(target)}
          aria-label={t('words.replay')}
        >
          <IconSound />
        </button>
        {/* Найденное слово с переводом. Показывается на паузе после верного
            тапа — это единственный момент, когда написание видно рядом с
            картинкой, и ради него пауза и держится. */}
        <div className={`wd-fb${justFound ? ' wd-fb--show' : ''}`} aria-live="polite">
          {justFound && (
            <>
              <b>{justFound.word}</b>
              {translate(justFound, wordLang) && <em>{translate(justFound, wordLang)}</em>}
            </>
          )}
        </div>
        <div className="wd-hint" role="status">
          {wrong ? t('words.wrong') : ''}
        </div>
      </div>

      <div className="wd-stagewrap">
        <div
          className={`wd-stage${scene.water ? ' wd-stage--water' : ''}`}
          style={{ '--wd-ar': ar, backgroundImage: `url(${sceneBgUrl(scene.id)})` }}
        >
          {placed.map((p) => {
            const isFound = found.has(p.word.id)
            return (
              <button
                key={p.word.id}
                type="button"
                className={[
                  'wd-sprite',
                  isFound ? 'wd-sprite--found' : '',
                  wrong && wrong.id === p.word.id ? 'wd-sprite--no' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%` }}
                onClick={() => pick(p.word)}
                onAnimationEnd={() => wrong && wrong.id === p.word.id && setWrong(null)}
                disabled={isFound}
                aria-label={isFound ? `${p.word.word} — ${t('words.found')}` : t('words.sprite')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- спрайты уже
                    пережаты офлайн (WebP 640px) и лежат в public: оптимизатор
                    next/image здесь только добавил бы прокси на 562 файла. */}
                <img src={spriteUrl(p.word.id)} alt="" draggable="false" decoding="async" />
              </button>
            )
          })}
          {toast && <div className="wd-toast">{toast}</div>}
        </div>
      </div>

      <p className="wd-foot">
        <span>
          <b>{scene.name}</b> · {t('words.wordCount', { n: poolSize })}
        </span>
        <span>{t('words.spaceHint')}</span>
      </p>
    </div>
  )
}
