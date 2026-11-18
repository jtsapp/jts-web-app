'use client'

// Строка фразы: видимые слова — текстом, пропуски — ячейками по буквам (вид ячеек Just to Listen: jl-cells, jl-grp,
// jl-cell и их состояния is-ok / is-near / is-bad / is-shown). Ввод один на все пропуски фразы — прозрачное поле
// поверх строки, как у WordCells: на телефоне по нему открывается клавиатура, автозамена и заглавные выключены.
// Буквы чистит и режет сессия, поэтому maxLength у поля нет: вставка «love muddy» с пробелом обрезалась бы браузером.
// После ответа под строкой — вся фраза со знаками препинания.
//
// Для Луны (screenSnapshot.js) поле несёт вердикт классом — is-wrong / is-ok / is-rev, как у других разделов, — а
// набранное до показа фразы — в data-assistant-entered: после показа в поле стоит уже верный ответ.

import { useEffect, useRef, useState } from 'react'

const CYRILLIC = /[а-яёәғқңөұүһі]/i
const FIELD_MARK = { near: ' is-wrong', bad: ' is-wrong', ok: ' is-ok', shown: ' is-rev' }

// Слово — это токен и всё, что приклеено к нему без пробела (glue): `un[believ]able` — одна группа, в ней части идут
// вплотную и не переносятся порознь; между группами — gap строки.
function groupTokens(tokens) {
  const groups = []
  for (const tok of tokens) {
    if (tok.glue && groups.length) groups[groups.length - 1].push(tok)
    else groups.push([tok])
  }
  return groups
}

// Размер ячеек решает самая длинная группа ячеек, а не вся фраза: слово не переносится, пока влезает в строку,
// а фраза из многих коротких пропусков переносится по словам, и крупные ячейки ей не мешают.
export function cellSizeClass(tokens) {
  const longest = Math.max(
    0,
    ...groupTokens(tokens).map((group) => group.reduce((sum, tok) => sum + (tok.kind === 'text' ? 0 : tok.size), 0)),
  )
  return longest > 16 ? ' jl-cells--xs' : longest > 9 ? ' jl-cells--sm' : ''
}

export default function DictationLine({ item, number, inputRef, t, onType, onSubmit }) {
  // Подсказка про раскладку привязана к фразе, для которой набрано кириллицей: у следующей фразы она сама пропадает.
  const [layoutFor, setLayoutFor] = useState(null)
  const lineRef = useRef(null)
  const { tokens, target, plain } = item.phrase
  const n = target.length
  const size = cellSizeClass(tokens)
  const wrongLayout = layoutFor === item.phrase
  const mark = item.mark ? ` is-${item.mark}` : ''
  const cur = Math.min(item.typed.length, n - 1)

  // Клавиатура телефона открылась (видимая область сжалась), пока поле в фокусе, — строка встаёт над ней.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return undefined
    const onResize = () => {
      if (document.activeElement === inputRef.current) lineRef.current?.scrollIntoView({ block: 'center' })
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [inputRef])

  return (
    <div className="vd-line" ref={lineRef}>
      <div className={`jl-cells vd-cells${size}${mark}`} onClick={() => inputRef.current?.focus()}>
        <span className="vd-cells__view" aria-hidden="true">
          {groupTokens(tokens).map((group, g) => (
            <span key={g} className="vd-wg">
              {group.map((tok, i) =>
                tok.kind === 'text' ? (
                  <span key={i} className="vd-word" lang="en">
                    {tok.text}
                  </span>
                ) : (
                  <span key={i} className="jl-grp">
                    {Array.from({ length: tok.size }, (_, j) => {
                      const k = tok.start + j
                      const cls = `jl-cell${item.typed[k] ? ' is-filled' : ''}${!item.done && k === cur ? ' is-cur' : ''}${k < item.revealed ? ' is-hint' : ''}`
                      return (
                        <span key={k} className={cls}>
                          {item.typed[k] || ''}
                        </span>
                      )
                    })}
                  </span>
                ),
              )}
            </span>
          ))}
        </span>
        <input
          ref={inputRef}
          className={`jl-cells__input${FIELD_MARK[item.mark] || ''}`}
          value={item.typed}
          disabled={item.done}
          aria-label={t('videoDictation.input', { i: number })}
          data-assistant-entered={item.mark === 'shown' ? item.attempt : undefined}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="done"
          onChange={(e) => {
            setLayoutFor(CYRILLIC.test(e.target.value) ? item.phrase : null)
            onType(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
        />
      </div>
      <p className="vd-layout" role="status">
        {wrongLayout && !item.done ? t('videoDictation.layout') : ''}
      </p>
      {item.done && (
        <p className="vd-full" lang="en">
          {plain}
        </p>
      )}
    </div>
  )
}
