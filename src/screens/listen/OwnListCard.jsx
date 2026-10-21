'use client'

// «Свой список слов» преподавателя (в прототипе — для всех; по ТЗ ученикам не
// показываем). Список — текст поля этого устройства, на сервер не уходит;
// чистится при выходе вместе с прогрессом (practiceSync.js).

import { useRef, useState } from 'react'
import { LISTEN_OWN_KEY } from '../../practice/practiceKeys.js'
import { parseOwnList } from '../../practice/listen/runs.js'

const PLACEHOLDER = 'apple - яблоко - I eat an apple every day. - Я ем яблоко каждый день.\nbig - большой/огромный'

function readOwn() {
  try {
    return localStorage.getItem(LISTEN_OWN_KEY) || ''
  } catch {
    return ''
  }
}

export default function OwnListCard({ t, onStart }) {
  const [text, setText] = useState(readOwn)
  const ref = useRef(null)
  const start = () => {
    try {
      localStorage.setItem(LISTEN_OWN_KEY, text)
    } catch {
      /* квота — список останется только в поле */
    }
    const rows = parseOwnList(text)
    if (!rows.length) {
      ref.current?.focus()
      return
    }
    onStart(rows)
  }
  return (
    <section className="jl-card">
      <details className="jl-own">
        <summary>{t('listen.own.title')}</summary>
        <p>{t('listen.own.help')}</p>
        <textarea
          ref={ref}
          aria-label={t('listen.own.label')}
          spellCheck={false}
          value={text}
          placeholder={PLACEHOLDER}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="jl-row">
          <button type="button" className="jl-btn" onClick={start}>
            {t('listen.own.start')}
          </button>
        </div>
      </details>
    </section>
  )
}
