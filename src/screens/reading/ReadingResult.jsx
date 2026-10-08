'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { exTotal } from '../../practice/reading/engine.js'
import { mood } from '../../practice/reading/check.js'
import { flushReading, markTextDone, progressOf, readState } from '../../practice/reading/readingProgress.js'
import ReadingKeywords from './ReadingKeywords.jsx'

// Экран результата (viewResult прототипа, :1057). XP из прототипа не
// перенесены: в приложении нет системы очков, а вторая валюта рядом с
// процентом прогресса только путала бы.
export default function ReadingResult({ text, texts, progressTick, token, onOpen, onLibrary, onReview }) {
  const { t } = useI18n()
  // Итог — числа СЕРВЕРА (решение владельца 05.10.2026): страница могла
  // показать «Всё верно», а сохраниться не успеть или не суметь. Пока отправки
  // не дошли — «Сохраняем…»; сервер не ответил — числа из памяти и плашка с
  // повтором. Гостю flushReading отвечает сразу, из памяти.
  const [save, setSave] = useState({ status: 'saving', state: null })

  // «Дочитал» ставим самим фактом открытия результата — как в прототипе.
  // Отметка встаёт в ту же очередь отправки, поэтому flush дождётся и её.
  useEffect(() => {
    let alive = true
    markTextDone(text.id)
    flushReading().then((r) => {
      if (alive) setSave({ status: r.ok ? 'saved' : 'failed', state: r.state })
    })
    return () => {
      alive = false
    }
  }, [text.id])

  const retrySave = useCallback(() => {
    setSave((s) => ({ ...s, status: 'saving' }))
    flushReading().then((r) => setSave({ status: r.ok ? 'saved' : 'failed', state: r.state }))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memState = useMemo(() => readState(), [progressTick, text.id])
  const state = save.state || memState
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

      <div className="rd-stats" aria-live="polite">
        {save.status === 'saving' ? (
          <div className="rd-stat">
            <span>⏳ {t('reading.result.saving')}</span>
          </div>
        ) : (
          <>
            <div className="rd-stat">
              <b>{sc.pct}%</b>
              <span>✅ {t('reading.result.score')} {sc.got}/{sc.total}</span>
            </div>
            <div className="rd-stat">
              <b>{doneCount}/{text.exercises.length}</b>
              <span>✏️ {t('reading.result.tasksDone')}</span>
            </div>
          </>
        )}
      </div>

      {save.status === 'failed' && (
        <div className="rd-note rd-note--err" role="alert">
          {t('reading.result.saveFailed')}{' '}
          <button type="button" className="rd-btn rd-btn--secondary rd-btn--sm" onClick={retrySave}>
            {t('reading.result.retrySave')}
          </button>
        </div>
      )}

      <section className="rd-panel">
        <h2 className="rd-label">🔁 {t('reading.result.review')}</h2>
        {review.length ? (
          <ul className="rd-review">
            {review.map((o) => (
              <li key={o.i}>
                <span>{o.i + 1}. {t('reading.exType.' + o.ex.type)}</span>
                <span className="rd-review__score">{o.s ? o.s.score : 0}/{exTotal(o.ex)}</span>
                <button type="button" className="rd-btn rd-btn--secondary rd-btn--sm" onClick={() => onReview(o.i)}>
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
        <ReadingKeywords words={text.words} compact token={token} source={text.title} />
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
