'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import Image from 'next/image'
import { claimPrize, getMyTokens } from '../api.js'
import { useI18n } from '../i18n.jsx'
import './rewards.css'

function number(value) {
  return new Intl.NumberFormat().format(Number(value) || 0)
}

function date(value, lang) {
  if (!value) return '—'
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(parsed)
}

function prizeName(item, lang) {
  if (lang === 'en' && item.nameEn) return item.nameEn
  if (lang === 'kk' && item.nameKk) return item.nameKk
  return item.name || ''
}

function coinCount(value) {
  return new Intl.NumberFormat().format(Math.max(0, Number(value) || 0))
}

function useRewards(token) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const next = await getMyTokens(token)
      setData(next)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [token])
  useEffect(() => {
    let alive = true
    getMyTokens(token).then((next) => {
      if (!alive) return
      setData(next)
      setError(false)
    }).catch(() => {
      if (alive) setError(true)
    }).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [token])
  return { data, loading, error, reload: load }
}

function Shell({ active, userLevel, userName, token, onNav, onProfile, children }) {
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active={active} token={token} onNav={onNav} onProfile={onProfile}>
      <section className="rw-page">{children}</section>
    </LearningLayout>
  )
}

function LoadingOrError({ loading, error, retry, t }) {
  if (loading) return <div className="rw-state" role="status">{t('rewards.loading')}</div>
  if (error) return <div className="rw-state rw-state--error"><span>{t('rewards.loadError')}</span><button type="button" onClick={retry}>{t('rewards.retry')}</button></div>
  return null
}

export function TokensPage({ userLevel, userName, token, onNav, onProfile }) {
  const { t, lang } = useI18n()
  const { data, loading, error, reload } = useRewards(token)
  const period = data?.period
  const max = Math.max(0, Number(period?.max) || 0)
  const balance = Math.max(0, Number(period?.balance) || 0)
  const fill = max ? Math.min(100, Math.round(balance / max * 100)) : 0
  const tierKey = period?.tier === 'gold' ? 'gold' : period?.tier === 'purple' ? 'purple' : 'silver'
  const sortedHistory = useMemo(() => [...(data?.history || [])].filter((entry) => Number(entry.points) !== 0), [data?.history])

  return (
    <Shell active="tokens" userLevel={userLevel} userName={userName} token={token} onNav={onNav} onProfile={onProfile}>
      <header className="rw-header">
        <div>
          <span className="rw-eyebrow">JUST TO STUDY · REWARDS</span>
          <h1>{t('rewards.tokens.title')}</h1>
          <p>{t('rewards.tokens.sub')}</p>
        </div>
      </header>
      <LoadingOrError loading={loading} error={error} retry={reload} t={t} />
      {!loading && !error && period && <>
        <div className="rw-overview">
          <article className="rw-balance-card">
            <div className="rw-balance-card__top">
              <span className="rw-pill"><i />{t(`rewards.tier.${tierKey}`)}</span>
              <span className="rw-period-label">{period.label || t('rewards.period.current')}</span>
            </div>
            <div className="rw-balance-card__amount">
              <Image src="/assets/world/coin.png" width={39} height={39} alt="" />
              <strong>{number(balance)}</strong>
              <span>{t('nav.tokens')}</span>
            </div>
            <div className="rw-progress-meta"><span>{t('rewards.earned')}</span><b>{t('rewards.ofMax', { n: number(max) })}</b></div>
            <div className="rw-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={balance}>
              <i style={{ width: `${fill}%` }} />
            </div>
            <div className="rw-balance-card__foot">
              <span>{t('rewards.period.current')}: {date(period.startsOn, lang)} – {date(period.endsOn, lang)}</span>
              <span>{t('rewards.period.left')}: <b>{number(period.daysLeft)} {t('rewards.days')}</b></span>
            </div>
          </article>
          <div className="rw-stat-stack">
            <article className="rw-stat-card rw-stat-card--earned"><span className="rw-stat-icon">↗</span><span>{t('rewards.earned')}</span><strong>{number(period.earned)}</strong></article>
            <article className="rw-stat-card rw-stat-card--spent"><span className="rw-stat-icon">↘</span><span>{t('rewards.spent')}</span><strong>{number(period.spent)}</strong></article>
            <button type="button" className="rw-shop-cta" onClick={() => onNav?.('prizes')}>
              <span className="rw-shop-cta__spark">✦</span><span><b>{t('rewards.shopCta')}</b><small>{t('rewards.prizes.title')}</small></span><span className="rw-shop-cta__arrow">→</span>
            </button>
          </div>
        </div>

        <section className="rw-panel">
          <div className="rw-panel__head"><div><span className="rw-eyebrow">ACTIVITY</span><h2>{t('rewards.history')}</h2></div></div>
          {sortedHistory.length ? <div className="rw-history">
            {sortedHistory.map((entry) => {
              const positive = Number(entry.points) > 0
              return <article className="rw-history-row" key={entry.id}>
                <span className={`rw-history-icon ${positive ? 'is-plus' : 'is-minus'}`}>{positive ? '+' : '−'}</span>
                <div className="rw-history-copy"><b>{entry.reason}</b><time>{date(entry.createdAt, lang)}</time></div>
                <strong className={positive ? 'rw-positive' : 'rw-negative'}>{positive ? '+' : '−'}{number(Math.abs(Number(entry.points)))}</strong>
              </article>
            })}
          </div> : <div className="rw-empty"><span>◈</span><p>{t('rewards.historyEmpty')}</p></div>}
        </section>
      </>}
    </Shell>
  )
}

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

export function PrizesPage({ userLevel, userName, token, onNav, onProfile }) {
  const { t, lang } = useI18n()
  const { data, loading, error, reload } = useRewards(token)
  const [selected, setSelected] = useState(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const activeRequest = useRef(null)
  const claims = data?.claims || []

  const openClaim = (item) => {
    activeRequest.current = { prizeId: item.id, key: requestId() }
    setMessage('')
    setSelected(item)
  }

  const submitClaim = async () => {
    if (!selected || sending) return
    const request = activeRequest.current?.prizeId === selected.id
      ? activeRequest.current
      : (activeRequest.current = { prizeId: selected.id, key: requestId() })
    setSending(true)
    setMessage('')
    try {
      await claimPrize(token, selected.id, request.key)
      activeRequest.current = null
      setSelected(null)
      setMessage(t('rewards.prizes.success'))
      await reload()
    } catch {
      // Keep the same idempotency key if the response was lost after the
      // server committed the claim; a retry will return that same request.
      setMessage(t('rewards.prizes.error'))
    } finally {
      setSending(false)
    }
  }

  const next = data?.nextPeriod
  return (
    <Shell active="prizes" userLevel={userLevel} userName={userName} token={token} onNav={onNav} onProfile={onProfile}>
      <header className="rw-header rw-header--prizes">
        <div><span className="rw-eyebrow">JUST TO STUDY · REWARDS</span><h1>{t('rewards.prizes.title')}</h1><p>{t('rewards.prizes.sub')}</p></div>
        <button type="button" className="rw-token-chip" onClick={() => onNav?.('tokens')}><Image src="/assets/world/coin.png" width={22} height={22} alt="" />{number(data?.period?.balance)}<span>→</span></button>
      </header>
      <LoadingOrError loading={loading} error={error} retry={reload} t={t} />
      {!loading && !error && data && <>
        {message && <div className="rw-toast" role="status">{message}</div>}
        <div className="rw-prize-period"><div><span className="rw-eyebrow">{t('rewards.period.current')}</span><b>{data.period?.label || '—'}</b></div><span>{date(data.period?.startsOn, lang)} – {date(data.period?.endsOn, lang)}</span></div>
        {data.prizes?.length ? <div className="rw-prize-grid">
          {data.prizes.map((item, index) => {
            const mine = item.myClaims || []
            const pending = mine.some((claim) => !claim.issued)
            const issued = mine.some((claim) => claim.issued)
            const soldOut = item.remainingPieces === 0
            const need = Math.max(0, Number(item.tokensToGo) || 0)
            const progress = Number(item.costTokens) > 0 ? Math.min(100, Math.round((Number(data.period?.balance || 0) / Number(item.costTokens)) * 100)) : 100
            const canClaim = !!item.available && !pending && !sending
            return <article className={`rw-prize-card ${index % 3 === 1 ? 'rw-prize-card--lilac' : ''}`} key={item.id}>
              <div className="rw-prize-art"><span className="rw-prize-art__orbit" /><span className="rw-prize-art__symbol">{item.kind === 'lesson' ? '◉' : item.kind === 'discount' ? '%' : item.kind === 'club' ? '✦' : '◆'}</span><span className="rw-prize-art__shine">✧</span></div>
              <div className="rw-prize-card__body">
                <div className="rw-prize-card__top"><span className="rw-kind">{item.kind || 'prize'}</span><div className="rw-prize-card__badges">{issued && <span className="rw-stock rw-stock--issued">{t('rewards.prizes.issued')}</span>}{item.pieceLimit > 0 && <span className="rw-stock">{soldOut ? t('rewards.prizes.soldOut') : t('rewards.prizes.stock', { n: item.remainingPieces })}</span>}</div></div>
                <h2>{prizeName(item, lang)}</h2>
                <div className="rw-cost"><Image src="/assets/world/coin.png" width={23} height={23} alt="" /><strong>{number(item.costTokens)}</strong><span>{t('nav.tokens')}</span></div>
                <div className="rw-prize-progress"><i style={{ width: `${progress}%` }} /></div>
                <div className="rw-prize-hint">{need > 0 ? t('rewards.prizes.locked', { n: number(need) }) : item.available ? t('rewards.prizes.available') : soldOut ? t('rewards.prizes.soldOut') : t('rewards.prizes.unavailable')}</div>
                <button type="button" className={`rw-claim-btn ${canClaim ? '' : 'is-disabled'}`} disabled={!canClaim} onClick={() => openClaim(item)}>
                  {pending ? t('rewards.prizes.pending') : soldOut ? t('rewards.prizes.soldOut') : !item.available ? t('rewards.prizes.unavailable') : t('rewards.prizes.claim')}
                </button>
              </div>
            </article>
          })}
        </div> : <div className="rw-empty rw-empty--large"><span>✦</span><p>{t('rewards.prizes.empty')}</p></div>}

        {next && <section className="rw-next-period">
          <div className="rw-next-period__icon">✧</div><div className="rw-next-period__copy"><span className="rw-eyebrow">{t('rewards.next.title')}</span><b>{next.label}</b><small>{t('rewards.next.starts', { date: date(next.startsOn, lang) })}</small></div>
          <div className="rw-next-period__items">{(next.items || []).slice(0, 3).map((item) => <span key={item.id}>{prizeName(item, lang)}</span>)}</div>
        </section>}

        {claims.length > 0 && <section className="rw-panel rw-claims-panel">
          <div className="rw-panel__head"><div><span className="rw-eyebrow">REQUESTS</span><h2>{t('rewards.prizes.pending')}</h2></div></div>
          <div className="rw-history">{claims.slice(0, 8).map((claim) => <article className="rw-history-row" key={claim.id}>
            <span className={`rw-history-icon ${claim.issued ? 'is-plus' : 'is-minus'}`}>{claim.issued ? '✓' : '…'}</span><div className="rw-history-copy"><b>{claim.prize}</b><time>{date(claim.createdAt, lang)}</time></div><span className={`rw-status ${claim.issued ? 'is-done' : ''}`}>{claim.issued ? t('rewards.prizes.issued') : t('rewards.prizes.pending')}</span>
          </article>)}</div>
        </section>}
      </>}

      {selected && <div className="rw-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) { setSelected(null); activeRequest.current = null } }}>
        <section className="rw-modal" role="dialog" aria-modal="true" aria-labelledby="rw-confirm-title">
          <button className="rw-modal__close" type="button" aria-label={t('common.close')} disabled={sending} onClick={() => { setSelected(null); activeRequest.current = null }}>×</button>
          <div className="rw-modal__icon">✦</div><span className="rw-eyebrow">{t('rewards.prizes.confirmTitle')}</span>
          <h2 id="rw-confirm-title">{prizeName(selected, lang)}</h2>
          <p>{t('rewards.prizes.confirmText', { name: prizeName(selected, lang), n: number(selected.costTokens) })}</p>
          <div className="rw-modal__actions"><button type="button" className="rw-secondary-btn" disabled={sending} onClick={() => { setSelected(null); activeRequest.current = null }}>{t('rewards.prizes.cancel')}</button><button type="button" className="rw-claim-btn" disabled={sending} onClick={submitClaim}>{sending ? '…' : t('rewards.prizes.confirm')}</button></div>
        </section>
      </div>}
    </Shell>
  )
}

export default TokensPage
