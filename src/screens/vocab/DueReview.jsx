'use client'

// «Повторить по расписанию» на главной «Словаря» (ТЗ v2.0, 8.3: «слова возвращаются через 1, 3, 7, 14 дней»; спека
// модели ученика, раздел 6). Слова, у которых вышел срок, отдаёт GET /api/study/review — с переводом и примером из
// строки вещи модели, поэтому тренировка собирается без каталога словаря. Это и есть шаг плана «слова в «Словаре»»:
// повторение идёт первым. Ответы тренировки двигают коробки (VocabPractice → practice/studyLog.js).
//
// Без входа, без базы или без слов к повторению блока нет вовсе.

import { useEffect, useState } from 'react'
import { IconPlay, IconRefresh, IconSpeaker } from './VocabIcons.jsx'

/** Слова к повторению; перечитывается, когда ученик вернулся на главную (refreshKey). */
export function useDueWords(token, refreshKey) {
  // Список помнит, чей он: вышел и вошёл другой — чужие слова не показываются и до ответа сервера.
  const [state, setState] = useState({ token: null, words: [] })
  useEffect(() => {
    // null — ученик не на главной словаря: блок не виден, спрашивать незачем (список останется прежним до возврата).
    if (!token || refreshKey == null) return undefined
    let alive = true
    fetch('/api/study/review', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) setState({ token, words: Array.isArray(data?.words) ? data.words.filter((w) => w?.en) : [] })
      })
      .catch(() => {
        /* модель — подсказка, а не прогресс: без неё блока просто нет */
      })
    return () => {
      alive = false
    }
  }, [token, refreshKey])
  return token && state.token === token ? state.words : []
}

/** Карточки тренировки: ключ — тот же, что у слова в модели, по нему ответ сдвинет его коробку. */
export function dueCards(words) {
  return words.map((w) => ({ id: w.key, en: w.en, ru: w.ru, kk: w.kk, example: w.example }))
}

export default function DueReview({ t, vlang, words, speak, onStart }) {
  if (!words?.length) return null
  return (
    <div className="vp-sec" id="vsec-due" data-due={words.length}>
      <div className="vp-sec-hd">
        <div>
          <h2>{t('vocab.home.due')}</h2>
          <p>{t('vocab.home.dueLead', { n: String(words.length) })}</p>
        </div>
      </div>
      <div className="vp-top3">
        <div className="vp-top3-hd">
          <span aria-hidden="true"><IconRefresh /></span>
          {t('vocab.prac.review')}
        </div>
        {words.slice(0, 5).map((w) => (
          <div className="vp-top3-row" key={w.key}>
            <button type="button" className="vp-spk" onClick={() => speak(w.en)} aria-label={t('vocab.lesson.listen')}>
              <IconSpeaker />
            </button>
            <b>{w.en}</b>
            <span>{vlang === 'kk' ? w.kk || w.ru : w.ru || w.kk}</span>
          </div>
        ))}
        <button type="button" className="vp-btn wide" style={{ marginTop: 14 }} onClick={() => onStart(dueCards(words))}>
          <span className="vp-play" aria-hidden="true"><IconPlay /></span>
          {t('vocab.home.dueStart')}
        </button>
      </div>
    </div>
  )
}
