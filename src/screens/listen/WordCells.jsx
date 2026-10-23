'use client'

// Ячейки слова: по букве в ячейке, пробел фразы делит группы. Набор идёт в
// прозрачное поле поверх ячеек — на телефоне по нему открывается клавиатура,
// автозамена и заглавные выключены. Буквы чистит и режет по длине сессия.

import { enMain } from '../../practice/listen/compare.js'

/** Индексы ячеек по группам слов фразы: только латинские буквы. */
export function cellGroups(en) {
  let k = 0
  return enMain(en)
    .split(' ')
    .filter(Boolean)
    .map((g) => [...g].filter((c) => /[a-z]/i.test(c)).map(() => k++))
}

export default function WordCells({ item, inputRef, label, onType, onSubmit }) {
  const groups = cellGroups(item.card.en)
  const n = item.target.length
  const size = n > 16 ? ' jl-cells--xs' : n > 9 ? ' jl-cells--sm' : ''
  const mark = item.wordMark ? ` is-${item.wordMark}` : ''
  const active = item.step === 'word'
  const cur = Math.min(item.typed.length, n - 1)
  return (
    <div className={`jl-cells${size}${mark}`} onClick={() => inputRef.current?.focus()}>
      {groups.map((g, gi) => (
        <span className="jl-grp" key={gi}>
          {g.map((k) => (
            <span
              key={k}
              className={`jl-cell${item.typed[k] ? ' is-filled' : ''}${active && k === cur ? ' is-cur' : ''}${k < item.revealed ? ' is-hint' : ''}`}
            >
              {item.typed[k] || ''}
            </span>
          ))}
        </span>
      ))}
      <input
        ref={inputRef}
        className="jl-cells__input"
        value={item.typed}
        disabled={!active}
        maxLength={n}
        aria-label={label}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        onChange={(e) => onType(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
    </div>
  )
}
