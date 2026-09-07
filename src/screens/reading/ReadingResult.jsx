'use client'

import { useEffect, useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { exTotal } from '../../practice/reading/engine.js'
import { mood } from '../../practice/reading/check.js'
import { markTextDone, progressOf, readState } from '../../practice/reading/readingProgress.js'
import { speak } from '../../practice/workbook/voice.js'

// Экран результата (viewResult прототипа, :1057). XP из прототипа не
// перенесены: в приложении нет системы очков, а вторая валюта рядом с
// процентом прогресса только путала бы.
export default function ReadingResult({ text, texts, progressTick, onOpen, onLibrary, onReview }) {
  const { t } = useI18n()

  // «Дочитал» ставим самим фактом открытия результата — как в прототипе.
  useEffect(() => {
    markTextDone(text.id)
  }, [text.id])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const state = useMemo(() => readState(), [progressTick, text.id])
  const saved = state.texts[text.id] || { ex: {} }
  const sc = progressOf(text, state)
  const doneCount = text.exercises.filter((_, i) => saved.ex[i]).length
  const review = text.exercises
    .map((ex, i) => ({ ex, i, s: saved.ex[i] }))
    .filter((o) => !o.s || o.s.score < exTotal(o.ex))

  // Следующий текст — первый непрочитанный по кругу от текущего; если прочитаны
  // все, просто соседний. Иначе кнопка «читать дальше» исчезала бы у того, кто
  // прошёл уровень целиком.
  const next = useMemo(() => {
    const list = texts || []
    const idx = list.findIndex((y) => y.id === text.id)
    if (idx < 0 || list.length < 2) return null
    for (let k = 1; k <= list.length; k++) {
      const c = list[(idx + k) % list.length]
      if (c.id !== text.id && !(state.texts[c.id] && state.texts[c.id].done)) return c
    }
    return list[(idx + 1) % list.length]
  }, [texts, text.id, state])

  const key = mood(sc.pct)
  const emoji = sc.pct >= 90 ? '🏆' : sc.pct >= 60 ? '🎉' : '💪'

  return (
    <div className="rd-result">
      <div className={`rd-texthero rd-g-${text.genre}`}>
        <h1>{emoji} {t('reading.result.' + key)}</h1>
        <div className="rd-texthero__meta"><span lang="en">{text.title}</span></div>
      </div>

      <div className="rd-stats">
        <div className="rd-stat">
          <b>{sc.pct}%</b>
          <span>✅ {t('reading.result.score')} {sc.got}/{sc.total}</span>
        </div>
        <div className="rd-stat">
          <b>{doneCount}/{text.exercises.length}</b>
          <span>✏️ {t('reading.result.tasksDone')}</span>
        </div>
      </div>

      <section className="rd-panel">
        <h2 className="rd-label">🔁 {t('reading.result.review')}</h2>
        {review.length ? (
          <ul className="rd-review">
            {review.map((o) => (
              <li key={o.i}>
                <span>{o.i + 1}. {t('reading.exType.' + o.ex.type)}</span>
                <span className="rd-review__score">{o.s ? o.s.score : 0}/{exTotal(o.ex)}</span>
                <button type="button" className="rd-btn rd-btn--secondary rd-btn--sm" onClick={onReview}>
                  {t('reading.result.open')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rd-allgood">🌟 {t('reading.result.nothingReview')}</p>
        )}
      </section>

      <section className="rd-panel">
        <h2 className="rd-label">🔑 {t('reading.result.wordsReview')}</h2>
        <ul className="rd-words rd-words--compact">
          {text.words.map((w) => (
            <li key={w.en} className="rd-word">
              <div className="rd-word__main">
                <div className="rd-word__top">
                  <span className="rd-word__en" lang="en">{w.en}</span>
                  <span className="rd-word__tr">{w.tr}</span>
                </div>
                <div className="rd-word__row"><span className="rd-flag">RU</span><span lang="ru">{w.ru}</span></div>
                <div className="rd-word__row"><span className="rd-flag">KZ</span><span lang="kk">{w.kz}</span></div>
              </div>
              <button type="button" className="rd-say" onClick={() => speak([w.en])} aria-label={`🔊 ${w.en}`}>🔊</button>
            </li>
          ))}
        </ul>
      </section>

      <div className="rd-actions">
        {next && (
          <button type="button" className="rd-btn rd-btn--primary" onClick={() => onOpen(next.id)}>
            {t('reading.result.readNext')}: {next.title} →
          </button>
        )}
        <button type="button" className="rd-btn rd-btn--ghost" onClick={onLibrary}>
          📚 {t('reading.result.toLibrary')}
        </button>
      </div>
    </div>
  )
}
