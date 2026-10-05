import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import ConfirmDialog from '../../ielts/ui/ConfirmDialog.jsx'
import { CloseIcon } from '../../ielts/icons.jsx'
import { PlusIcon } from '../icons.jsx'
import { displayWord, shortDef, status } from '../model/vocab.js'

const STATUSES = ['all', 'new', 'learning', 'mastered']
const LIMIT = 300

/**
 * «Мои слова» — вся колода с поиском и фильтрами (Нет в Figma: адаптация прототипа vocab.js, wordList; в макете 18 —
 * только боковая карточка «Мои слова» и ссылка «Все слова и поиск»). Свои слова можно удалить; слова JTS — нет, колода
 * общая. Показ ограничен 300 строками — дальше уточняют поиском.
 */
export default function WordList({ deck, cards, now, onAdd, onRemove, busy }) {
  const { t, lang } = useI18n()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('all')
  const [cat, setCat] = useState('all')
  const [del, setDel] = useState(null)

  const cats = useMemo(() => ['all', ...new Set(deck.map((w) => w.category))], [deck])
  const rows = deck.filter((w) => {
    if (st !== 'all' && status(cards[w.id]) !== st) return false
    if (cat !== 'all' && w.category !== cat) return false
    if (!q) return true
    const s = q.toLowerCase()
    return w.word.toLowerCase().includes(s) || w.definition.toLowerCase().includes(s) || (w.ru || '').toLowerCase().includes(s)
  })

  return (
    <div className="st-card st-wl">
      <div className="st-wl__bar">
        <input type="search" className="st-wl__search" placeholder={t('sat.wl.search')} aria-label={t('sat.wl.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={st} onChange={(e) => setSt(e.target.value)} aria-label={t('sat.wl.status')}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`sat.wl.st.${s}`)}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('sat.wl.category')}>
          {cats.map((c) => <option key={c} value={c}>{c === 'all' ? t('sat.wl.allCats') : t(`sat.vc.cat.${c}`)}</option>)}
        </select>
        <span className="st-spacer" />
        <button type="button" className="ih-cta st-wl__add" onClick={onAdd}><PlusIcon size={18} />{t('sat.wl.add')}</button>
      </div>
      <p className="st-muted">{plural(t, lang, 'sat.wl.found', rows.length)}</p>
      <ul className="st-wl__list">
        {rows.slice(0, LIMIT).map((w) => {
          const c = cards[w.id]
          const s = status(c)
          const days = c ? Math.max(0, Math.ceil((c.dueAt - now) / 86400000)) : null
          return (
            <li key={w.id} className="st-wl__row">
              <div className="st-wl__word">
                <b>{displayWord(w.word)}</b>
                <small>{shortDef(w)}{w.ru && lang === 'ru' ? ` · ${w.ru}` : ''}</small>
              </div>
              {c && <span className="st-muted st-wl__due">{days ? plural(t, lang, 'sat.wl.inDays', days) : t('sat.wl.dueNow')}</span>}
              <span className={`st-vc__status is-${s}`}>{t(`sat.vc.st.${s}`)}</span>
              {w.own ? (
                <button type="button" className="ih-round st-wl__del" disabled={busy} aria-label={t('sat.wl.delete')} title={t('sat.wl.delete')} onClick={() => setDel(w)}><CloseIcon size={16} /></button>
              ) : <span className="st-wl__del" aria-hidden="true" />}
            </li>
          )
        })}
      </ul>
      {rows.length > LIMIT && <p className="st-muted">{t('sat.wl.truncated', { shown: String(LIMIT), total: String(rows.length) })}</p>}
      <ConfirmDialog
        open={!!del}
        title={t('sat.wl.deleteTitle')}
        text={del ? displayWord(del.word) : ''}
        confirmLabel={t('sat.wl.delete')}
        cancelLabel={t('sat.mock.abandonCancel')}
        busy={busy}
        onConfirm={() => {
          const w = del
          setDel(null)
          onRemove(w.id)
        }}
        onCancel={() => setDel(null)}
      />
    </div>
  )
}
