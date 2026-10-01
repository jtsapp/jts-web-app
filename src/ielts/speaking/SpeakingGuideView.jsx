import { useCallback, useEffect, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { getIeltsTest } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { MenuBookIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Стратегия Part 1–3 (прототип 40-speaking, банк speaking-guide): что ждёт экзаменатор, формула ответа, ошибки и
// примеры — блоками по части. Документ SP-GUIDE банка, правит методист импортом.
export default function SpeakingGuideView({ token, initialPart = 1, onBack }) {
  const { t, lang } = useI18n()
  const pick = useCallback((o) => (o && typeof o === 'object' ? o[lang] || o.ru || o.en : o), [lang])
  const [state, setState] = useState({ status: 'loading' })
  const [part, setPart] = useState(initialPart)

  useEffect(() => {
    let alive = true
    getIeltsTest(token || loadToken(), 'SP-GUIDE')
      .then((r) => alive && setState({ status: 'ready', guide: r.document }))
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [token])

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Speaking', onClick: onBack }, { label: t('ieltsSpeaking.strategy') }]
  if (state.status !== 'ready')
    return (
      <div className="ih-wguide">
        <Breadcrumbs items={crumbs} />
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
      </div>
    )
  const p = (state.guide.parts || []).find((x) => x.part === part) || state.guide.parts[0]
  return (
    <div className="ih-wguide">
      <Breadcrumbs items={crumbs} />
      <h2>{t('ieltsSpeaking.guideTitle', { n: String(p.part) })}</h2>
      <div className="ih-wguide__tabs" role="tablist">
        {state.guide.parts.map((x) => (
          <button key={x.part} type="button" role="tab" aria-selected={x.part === p.part} className={x.part === p.part ? 'is-on' : ''} onClick={() => setPart(x.part)}>
            Part {x.part}
          </button>
        ))}
      </div>
      <section className="ih-card ih-wguide__rules"><p>{pick(p.lead)}</p></section>
      {p.blocks.map((b) => (
        <section key={b.id} className="ih-card ih-wguide__group">
          <h3>{pick(b.title)}</h3>
          <ul className="ih-sguide__items">{(b.items || []).map((it, i) => <li key={i}>{pick(it)}</li>)}</ul>
          {b.example && (
            <div className="ih-wguide__row">
              <span className="ih-muted">{t('ieltsSpeaking.p.guide.example')}</span>
              {typeof b.example === 'string' ? <p className="ih-wguide__ex" lang="en">{b.example}</p> : <p className="ih-wguide__ex" lang="en">{b.example.en || pick(b.example)}</p>}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
