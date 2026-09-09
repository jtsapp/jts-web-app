'use client'

import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { speak } from '../../practice/workbook/voice.js'
import { saveReadingKeyword } from '../../practice/reading/saveKeyword.js'

// Список ключевых слов текста: озвучка и «забрать в словарь».
// Сохранённые в этой сессии помечаются галочкой — повторный тап ничего
// не меняет (слово в словаре уникально), а студенту нужен видимый ответ.
export default function ReadingKeywords({ words, compact, token, source }) {
  const { t } = useI18n()
  const [saved, setSaved] = useState({})

  const add = async (w) => {
    const key = w.en
    if (saved[key]) return
    setSaved((s) => ({ ...s, [key]: true }))
    const ok = await saveReadingKeyword(token, w, source)
    if (!ok) setSaved((s) => ({ ...s, [key]: false }))
  }

  return (
    <ul className={`rd-words${compact ? ' rd-words--compact' : ''}`}>
      {words.map((w) => (
        <li key={w.en} className="rd-word">
          <div className="rd-word__main">
            <div className="rd-word__top">
              <span className="rd-word__en" lang="en">{w.en}</span>
              <span className="rd-word__tr">{w.tr}</span>
            </div>
            <div className="rd-word__row"><span className="rd-flag">RU</span><span lang="ru">{w.ru}</span></div>
            <div className="rd-word__row"><span className="rd-flag">KZ</span><span lang="kk">{w.kz}</span></div>
            {!compact && <div className="rd-word__ex" lang="en">“{w.ex}”</div>}
          </div>
          <div className="rd-word__acts">
            <button type="button" className="rd-say" onClick={() => speak([w.en])} aria-label={`🔊 ${w.en}`}>🔊</button>
            <button
              type="button"
              className={`rd-save${saved[w.en] ? ' is-saved' : ''}`}
              disabled={!!saved[w.en]}
              title={saved[w.en] ? t('lesson.inVocab') : t('lesson.addToVocab')}
              aria-label={saved[w.en] ? t('lesson.inVocab') : t('lesson.addToVocab')}
              onClick={() => add(w)}
            >
              {saved[w.en] ? <SavedIcon /> : <BookIcon />}
              <span>{saved[w.en] ? t('lesson.inVocab') : t('lesson.toVocab')}</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22.5V4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 7h8M9 11h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SavedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5 9.5 17 19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
