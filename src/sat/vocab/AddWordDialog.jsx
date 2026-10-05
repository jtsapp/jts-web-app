import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'

/**
 * «+ Слово» (Figma SAT 18 — кнопка; сама форма — Нет в Figma: адаптация прототипа vocab.js, addModal). Слово, которое
 * стоит выучить, попадается посреди чтения: форма короткая, нужны только слово и определение, остальное — по желанию.
 */
export default function AddWordDialog({ busy, error, onSave, onClose }) {
  const { t } = useI18n()
  const [f, setF] = useState({ word: '', definition: '', example: '', ru: '' })
  const [miss, setMiss] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = (e) => {
    e.preventDefault()
    if (!f.word.trim() || !f.definition.trim()) {
      setMiss(true)
      return
    }
    onSave(f)
  }
  return (
    <SatModal title={t('sat.wl.addTitle')} onClose={onClose}>
      <form className="st-aw" onSubmit={save}>
        <label>
          <span>{t('sat.wl.f.word')}</span>
          <input autoFocus value={f.word} onChange={set('word')} maxLength={120} />
        </label>
        <label>
          <span>{t('sat.wl.f.definition')}</span>
          <textarea rows={2} value={f.definition} onChange={set('definition')} maxLength={500} />
        </label>
        <label>
          <span>{t('sat.wl.f.example')}</span>
          <textarea rows={2} value={f.example} onChange={set('example')} maxLength={500} />
        </label>
        <label>
          <span>{t('sat.wl.f.ru')}</span>
          <input value={f.ru} onChange={set('ru')} maxLength={300} />
        </label>
        {(miss || error) && <p className="st-error" role="alert">{error || t('sat.wl.need')}</p>}
        <div className="st-aw__acts">
          <button type="button" className="ih-btn ih-btn--outline" onClick={onClose}>{t('sat.mock.abandonCancel')}</button>
          <button type="submit" className="ih-cta" disabled={busy}>{t('sat.wl.save')}</button>
        </div>
      </form>
    </SatModal>
  )
}
