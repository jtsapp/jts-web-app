import { useI18n } from '../../../i18n.jsx'
import { loc } from '../../../practice/reading/loc.js'

// Соединение пар: match (слово ↔ эмодзи), wwmatch (вопрос ↔ ответ),
// headings (абзац ↔ заголовок). Правый столбец перемешан в initExercise;
// правильная пара — совпадение индексов, поэтому проверка не знает о порядке
// отображения (см. check.js).
export default function MatchTask({ ex, st, onTap, res }) {
  const { t, lang } = useI18n()
  const rows = res ? res.detail.rows : null
  // Эмодзи-варианты рисуем крупно и подписываем для скринридера: в данных у
  // них есть alt на трёх языках именно для этого.
  const emojiRight = ex.type === 'match' && typeof ex.pairs[0].r === 'string' && !/[a-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(ex.pairs[0].r)

  const pairNoOfLeft = (k) => (st.pairs[k] !== undefined ? k + 1 : null)
  const pairNoOfRight = (k) => {
    const l = Object.keys(st.pairs).find((x) => st.pairs[x] === k)
    return l === undefined ? null : Number(l) + 1
  }

  return (
    <div className="rd-match">
      {ex.pairs.map((p, k) => {
        const rk = st.right[k]
        const lNo = pairNoOfLeft(k)
        const rNo = pairNoOfRight(rk)
        const lCls = ['rd-mt']
        if (st.activeL === k) lCls.push('is-sel')
        if (lNo) lCls.push('is-paired')
        if (rows) lCls.push(rows[k].ok ? 'is-correct' : 'is-wrong')
        const rCls = ['rd-mt']
        if (emojiRight) rCls.push('rd-mt--emoji')
        if (st.activeR === rk) rCls.push('is-sel')
        if (rNo) rCls.push('is-paired')
        if (rows) rCls.push(rows[rk].ok ? 'is-correct' : 'is-wrong')
        return (
          <div className="rd-match__row" key={k}>
            <button
              type="button"
              className={lCls.join(' ')}
              disabled={!!res}
              lang={typeof p.l === 'string' ? 'en' : undefined}
              onClick={() => onTap('l', k)}
            >
              {loc(p.l, lang)}
              {lNo && <span className="rd-mt__tag" aria-hidden="true">{lNo}</span>}
            </button>
            <button
              type="button"
              className={rCls.join(' ')}
              disabled={!!res}
              aria-label={emojiRight ? loc(ex.pairs[rk].alt, lang) || ex.pairs[rk].r : undefined}
              onClick={() => onTap('r', rk)}
            >
              {loc(ex.pairs[rk].r, lang)}
              {rNo && <span className="rd-mt__tag" aria-hidden="true">{rNo}</span>}
            </button>
          </div>
        )
      })}
      <p className="rd-sr">{t('reading.hint.match')}</p>
    </div>
  )
}

/**
 * Тап по половинке пары — порт matchTap (jtsreading.html:899). Повторный тап
 * по уже связанной кнопке разрывает пару: без этого ошибочную связь нельзя
 * было бы исправить, не начиная задание заново.
 */
export function matchTap(st, side, k) {
  const next = { ...st, pairs: { ...st.pairs } }
  if (side === 'l') {
    if (next.pairs[k] !== undefined) {
      delete next.pairs[k]
      next.activeL = null
    } else {
      next.activeL = next.activeL === k ? null : k
    }
  } else {
    const l = Object.keys(next.pairs).find((x) => next.pairs[x] === k)
    if (l !== undefined) {
      delete next.pairs[l]
      next.activeR = null
    } else {
      next.activeR = next.activeR === k ? null : k
    }
  }
  if (next.activeL !== null && next.activeR !== null) {
    next.pairs[next.activeL] = next.activeR
    next.activeL = null
    next.activeR = null
  }
  return next
}
