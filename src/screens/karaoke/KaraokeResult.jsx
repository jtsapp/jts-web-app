'use client'

import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { pluralForm } from '../../lib/plural.js'
import { MEDALS, MEDAL_MIN } from '../../practice/karaoke/scoring.js'
import { fmtTime, splitHard } from '../../practice/karaoke/timeline.js'
import {
  ChevronLeftIco,
  TrendingUpIco,
  ScheduleIco,
  HeadphonesIco,
  MicIco,
  PlayCircleIco,
  ReplayIco,
  ArrowForwardIco,
  MedalStar,
} from './KaraokeIcons.jsx'

// Разбор исполнения — макет Figma «Караоке», 3 · Результат. Живёт в раскладке
// Практики (сайдбар на месте), в отличие от самого плеера.
//
// Карточек три — ровно то, что просили оценивать: ритм, произношение и сами
// слова. С оценкой Azure они же и составляют балл (35/30/35, см. finalScore).
// Без неё (сбой сервиса, гость) «Произношение» пустое, ритм — по маске
// голоса, а в итог по-прежнему входят спетые строки и темп.
//
// До 27.09.2026 карточка «Произношение» показывала на самом деле слова по
// распознаванию: оценки звуков у караоке тогда не было вовсе.

const hint = (value) => (value >= 75 ? 'good' : value >= 50 ? 'mid' : 'low')

function Plural({ k, n, vars }) {
  const { t, lang } = useI18n()
  return t(`${k}.${pluralForm(n, lang)}`, { n, ...vars })
}

/** «across, alone и calling» — перечисление с союзом языка интерфейса. */
function joinWords(words, t) {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} ${t('karaoke.and')} ${words[words.length - 1]}`
}

export default function KaraokeResult({ track, result, prev, repeats, onRepeat, onAgain, onBack }) {
  const { t, lang } = useI18n()
  const medalIdx = result.medal ? MEDALS.indexOf(result.medal) : -1
  const next = MEDALS[medalIdx + 1] || null
  const delta = prev == null ? null : result.score - prev

  // Послушать строку в оригинале: один <audio> на экран, вторая кнопка
  // обрывает первую. Стоп — по концу строки, а не по таймеру: трек может
  // подвиснуть на буферизации.
  const clipRef = useRef(null)
  const [playing, setPlaying] = useState(null)
  useEffect(
    () => () => {
      clipRef.current?.pause()
      clipRef.current = null
    },
    [],
  )
  const playLine = (row) => {
    let a = clipRef.current
    if (playing === row.id) {
      a?.pause()
      setPlaying(null)
      return
    }
    if (!a) {
      a = new Audio(track.audioUrl)
      a.preload = 'auto'
      clipRef.current = a
    }
    a.ontimeupdate = () => {
      if (a.currentTime >= row.end) {
        a.pause()
        setPlaying(null)
      }
    }
    a.onended = () => setPlaying(null)
    a.currentTime = row.start
    a.play().then(
      () => setPlaying(row.id),
      () => setPlaying(null),
    )
  }

  const deltaPill =
    delta == null ? null : delta > 0 ? (
      <span className="kk-res__delta kk-res__delta--up">
        <TrendingUpIco size={18} />
        {t('karaoke.res.deltaUp', { n: delta })}
      </span>
    ) : (
      <span className="kk-res__delta">
        {delta === 0 ? t('karaoke.res.deltaSame') : t('karaoke.res.deltaDown', { n: `−${Math.abs(delta)}` })}
      </span>
    )

  // `hard` — «сложнее всего дались». С оценкой Azure это слова с худшим
  // произношением, и подпись стоит под «Произношением»; без неё — слова,
  // которые не прозвучали, и место им под «Словами».
  const hardText = result.hard.length ? t('karaoke.res.hardWords', { words: joinWords(result.hard, t) }) : null
  const assessed = result.pron != null

  const pronText = !assessed
    ? t(result.lyrics == null ? 'karaoke.res.noStt' : 'karaoke.res.noPron')
    : hardText || t(`karaoke.res.pron.${hint(result.pron)}`)

  // «Слова»: пропущенные строки — первое, что стоит сказать; всё спето — тогда
  // о том, насколько слова совпали с текстом.
  const missed = result.missed
  const wordsText =
    missed.count > 0 ? (
      <>
        <Plural k="karaoke.res.missed" n={missed.count} />
        {missed.from != null && ` ${t('karaoke.res.missedAt', { from: fmtTime(missed.from), to: fmtTime(missed.to) })}`}
      </>
    ) : !assessed && hardText ? (
      hardText
    ) : result.lyrics == null || hint(result.lyrics) === 'good' ? (
      t('karaoke.res.allLines')
    ) : (
      t(`karaoke.res.words.${hint(result.lyrics)}`)
    )

  return (
    <div className="kk-res">
      <button type="button" className="kk-res__back" onClick={onBack}>
        <ChevronLeftIco size={18} />
        {t('karaoke.res.back')}
      </button>

      <section className="kk-res__hero">
        <div className="kk-res__score">
          <p className="kk-res__verdict">{t(`karaoke.res.verdict.${result.medal || 'none'}`)}</p>
          <p className="kk-res__num">
            <b>{result.score}</b>
            <span>/ 100</span>
          </p>
          {deltaPill}
          {result.offRate && <p className="kk-res__offRate">{t('karaoke.res.offRate')}</p>}
        </div>
        <span className="kk-res__divider" aria-hidden="true" />
        <div className="kk-res__medals">
          <div className="kk-res__medalsHead">
            <span>{t('karaoke.res.medalTitle')}</span>
            {next && (
              <b>
                {t(`karaoke.res.toMedal.${next}`, {
                  pts: t(`karaoke.res.points.${pluralForm(MEDAL_MIN[next] - result.score, lang)}`, {
                    n: MEDAL_MIN[next] - result.score,
                  }),
                })}
              </b>
            )}
          </div>
          <div className="kk-res__track">
            {MEDALS.map((m, i) => {
              const state = i === medalIdx ? 'now' : i < medalIdx ? 'got' : 'next'
              return (
                <div key={m} className="kk-res__medalWrap">
                  {i > 0 && <span className={i <= medalIdx ? 'kk-res__link is-on' : 'kk-res__link'} aria-hidden="true" />}
                  <div className={`kk-medal kk-medal--${m} kk-medal--${state}`}>
                    <span className="kk-medal__coin">
                      <MedalStar size={state === 'now' ? 40.32 : 28.56} />
                    </span>
                    <span className="kk-medal__name">{t(`karaoke.medal.${m}`)}</span>
                    {state === 'now' ? (
                      <span className="kk-medal__you">{t('karaoke.res.yours')}</span>
                    ) : (
                      <span className="kk-medal__from">
                        {t(`karaoke.res.from.${pluralForm(MEDAL_MIN[m], lang)}`, { n: MEDAL_MIN[m] })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="kk-res__metrics">
        <Metric
          icon={<ScheduleIco size={20} />}
          tone="rhythm"
          label={t('karaoke.m.rhythm')}
          value={result.rhythm}
          fill={result.rhythm}
          text={t(`karaoke.res.rhythm.${hint(result.rhythm)}`)}
        />
        <Metric
          icon={<HeadphonesIco size={20} />}
          tone="pron"
          label={t('karaoke.m.pron')}
          value={result.pron ?? '—'}
          fill={result.pron ?? 0}
          text={pronText}
        />
        {/* Третья карточка — «Слова» (решение продукта 27.09.2026): оценивать
            просили ритм, произношение и сами слова. Спетые строки не пропали —
            пропуски пишутся подписью здесь же: пропущенная строка — это
            пропущенные слова. Тон «lines» — от прежней карточки, цвет тот же. */}
        <Metric
          icon={<MicIco size={20} />}
          tone="lines"
          label={t('karaoke.m.words')}
          value={result.lyrics ?? '—'}
          fill={result.lyrics ?? 0}
          text={wordsText}
        />
      </section>

      <section className="kk-res__weak">
        <div className="kk-res__weakHead">
          <h2>{t('karaoke.res.repeatTitle')}</h2>
          <span>{t('karaoke.res.repeatCount', { n: result.repeat.length, total: result.totalLines })}</span>
        </div>
        {result.repeat.length === 0 ? (
          <p className="kk-res__clean">{t('karaoke.res.repeatNone')}</p>
        ) : (
          result.repeat.map((row) => {
            const again = repeats[row.id]
            return (
              <div key={row.id} className="kk-res__row">
                <div className="kk-res__rowText">
                  <p className="kk-res__line">
                    {splitHard(row.text, row.hard).map((s, i) =>
                      s.hard ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>,
                    )}
                  </p>
                  <p className="kk-res__rowMeta">
                    {t('karaoke.res.match', { p: Math.round(row.ratio * 100) })}
                    {again != null && ` → ${Math.round(again * 100)}%`}
                    {row.hard && ` · ${t('karaoke.res.hardWord', { w: row.hard })}`}
                  </p>
                </div>
                <button
                  type="button"
                  className={playing === row.id ? 'kk-res__listen is-playing' : 'kk-res__listen'}
                  onClick={() => playLine(row)}
                  aria-label={t('karaoke.res.listen')}
                  aria-pressed={playing === row.id}
                >
                  <PlayCircleIco size={20} />
                </button>
                <button
                  type="button"
                  className="kk-res__again"
                  onClick={() => {
                    clipRef.current?.pause()
                    setPlaying(null)
                    onRepeat(row)
                  }}
                >
                  <MicIco size={18} />
                  {t('karaoke.res.repeat')}
                </button>
              </div>
            )
          })
        )}
      </section>

      <div className="kk-res__actions">
        <button type="button" className="kk-res__btn kk-res__btn--primary" onClick={onAgain}>
          <ReplayIco size={22} />
          {t('karaoke.res.again')}
        </button>
        <button type="button" className="kk-res__btn kk-res__btn--soft" onClick={onBack}>
          {t('karaoke.res.other')}
          <ArrowForwardIco size={22} />
        </button>
      </div>
    </div>
  )
}

function Metric({ icon, tone, label, value, fill, text }) {
  return (
    <div className={`kk-met kk-met--${tone}`}>
      <div className="kk-met__head">
        <span className="kk-met__icon">{icon}</span>
        <span className="kk-met__label">{label}</span>
        <b className="kk-met__value">{value}</b>
      </div>
      <div className="kk-met__bar" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(100, fill))}%` }} />
      </div>
      <p className="kk-met__text">{text}</p>
    </div>
  )
}
