'use client'

import { useState } from 'react'
import { NEWS_TYPES, NEWS_MASCOTS, TYPE_MASCOT, newsSurface } from './presentation.js'
import { localized, useNewsCopy } from './copy.js'
import { parseEventStart, buildIcs, downloadIcs } from './calendar.js'
import './news.css'

const TYPE_ICONS = {
  important: 'flag', update: 'auto_awesome', event: 'event', promo: 'campaign', congrats: 'auto_awesome',
  poll: 'quiz', material: 'auto_stories', deadline: 'timer', vacancy: 'person', hero: 'insights',
}

export function studentNewsLink(value) {
  const url = typeof value === 'string' ? value.trim() : ''
  return /^https:\/\//i.test(url) || /^\/\?screen=[a-z][a-z0-9-]*(?:&[^\s]*)?$/.test(url) ? url : null
}

export default function NewsCard({ post, mode = 'feed', busy = false, onAction, headingId }) {
  const { copy, language } = useNewsCopy()
  const [failedBanner, setFailedBanner] = useState('')
  const kind = NEWS_TYPES[post.type] || NEWS_TYPES.update
  const label = copy.types[Object.keys(NEWS_TYPES).indexOf(post.type)] || copy.types[1]
  const surface = newsSurface(post)
  const requestedMascot = post.mascot || TYPE_MASCOT[post.type] || 'cheer'
  const mascot = NEWS_MASCOTS.some(([key]) => key === requestedMascot) ? requestedMascot : 'cheer'
  const banner = (post.bannerUrl || '').trim()
  const showBanner = banner !== failedBanner && (/^https:\/\//i.test(banner) || /^\/assets\//.test(banner))
  const buttonUrl = studentNewsLink(post.buttonUrl)
  const calendar = post.type === 'event' ? parseEventStart(post.eventWhen) : null
  const attachments = (post.attachments || []).filter((item) => /^https?:\/\//i.test(item.url || ''))
  const images = attachments.filter((item) => item.kind === 'IMAGE')
  const files = attachments.filter((item) => item.kind === 'PDF' || item.kind === 'LINK')
  const votes = (post.votes || []).reduce((sum, count) => sum + Number(count || 0), 0)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const days = Math.ceil((Date.parse(post.showTo) - Date.parse(today)) / 86400000)
  const deadline = post.type === 'deadline' && Number.isFinite(days) && days >= 0
    ? days === 0 ? copy.lastDay : `${copy.remaining} ${days} ${copy.days}` : ''
  const act = (event, kind, extra = {}) => {
    event.stopPropagation()
    if (busy) { event.preventDefault(); return }
    onAction(post, kind, extra)
  }

  return (
    <div className="student-news-card">
      <article className={`news-view ${mode === 'feed' ? 'feed' : ''} ${mode === 'hero' && surface.dark ? 'dark' : ''} ${mode === 'hero' && post.theme === 'white' ? 'white' : ''} ${mode === 'hero' && mascot !== 'none' ? 'with-mascot' : ''} ${mode === 'feed' && post.seen !== true ? 'unread' : ''}`}
        style={{ background: mode === 'hero' ? surface.bg : undefined, '--news-color': kind[2] }}
        onClick={() => { if (mode === 'feed' && !busy && post.seen !== true) onAction(post, 'seen') }}>
        {mode === 'hero' && mascot !== 'none' && <div className="news-art">
          {post.bubble && <div className="news-bubble">{post.bubble}</div>}
          <img className={`news-mascot ${mascot === 'call' ? 'call' : ''}`} src={`/assets/whats-new/${mascot}.webp`} alt="" draggable={false} />
        </div>}
        <div className="news-copy">
          <div className="news-meta">
            <span className="news-tag"><i className="news-type-icon" aria-hidden="true"
              style={{ '--news-icon': `url(/assets/home-v2/ico/${TYPE_ICONS[post.type] || 'auto_awesome'}.svg)` }} />{label}</span>
            {post.pinned && <span className="news-pin">{copy.pinned}</span>}
            {mode === 'feed' && <span className="news-author">{post.authorName}</span>}
          </div>
          <h2 id={headingId}>{localized(post, 'title', language)}</h2>
          <p className="news-body">{localized(post, 'body', language)}</p>
          {showBanner && <figure className="news-banner"><img src={banner} alt="" referrerPolicy="no-referrer" onError={() => setFailedBanner(banner)} /></figure>}
          {images.map((item, index) => <figure className="news-banner" key={index}><img src={item.url} alt={item.title || ''} referrerPolicy="no-referrer" /></figure>)}
          {post.type === 'event' && post.eventWhen && <p className="news-detail">{post.eventWhen}</p>}
          {deadline && <p className="news-detail">{deadline}</p>}
          {post.type === 'poll' && post.options?.length > 0 && <div className="news-poll" role="group" aria-label={copy.options}>
            {post.options.map((option, index) => {
              const percentage = votes ? Math.round(Number(post.votes?.[index] || 0) * 100 / votes) : 0
              return <button key={index} type="button" className={`news-option ${post.myVote === index ? 'selected' : ''}`} aria-pressed={post.myVote === index}
                disabled={busy || post.myVote === index} onClick={(event) => act(event, 'vote', { vote: index })}>
                <span className="news-option-fill" style={{ width: `${percentage}%` }} /><span>{option}</span><b>{percentage}%</b>
              </button>
            })}
            <small>{copy.votes}: {votes}</small>
          </div>}
          <div className="news-actions">
            {files.map((item, index) => <a key={index} className={`news-button ${item.kind === 'PDF' ? 'secondary' : ''}`}
              href={item.url} target="_blank" rel="noopener noreferrer" aria-disabled={busy} onClick={(event) => act(event, 'click')}>
              {item.kind === 'PDF' ? '📄 ' : ''}{item.title || (item.kind === 'PDF' ? 'PDF' : item.url)}
            </a>)}
            {post.buttonText && buttonUrl && <a className="news-button" href={buttonUrl} aria-disabled={busy} onClick={(event) => act(event, 'click')}>{post.buttonText}</a>}
            {post.ackRequired && !post.acked && <button type="button" className="news-button secondary" disabled={busy} onClick={(event) => act(event, 'ack')}>{copy.ack}</button>}
            {post.ackRequired && post.acked && <span className="news-acked">{copy.acked}</span>}
            {calendar && <button type="button" className="news-button calendar" onClick={(event) => {
              event.stopPropagation()
              downloadIcs(`event-${post.id}.ics`, buildIcs(`news-${post.id}`, localized(post, 'title', language), localized(post, 'body', language), calendar))
            }}>{copy.calendar}</button>}
          </div>
          {mode === 'feed' && <div className="news-reactions">{['👍', '❤️', '🎉'].map((reaction) => <button key={reaction} type="button"
            className={post.myReaction === reaction ? 'selected' : ''} aria-pressed={post.myReaction === reaction} disabled={busy}
            onClick={(event) => act(event, 'react', { reaction })}>{reaction} {post.reactions?.[reaction] || 0}</button>)}</div>}
        </div>
      </article>
    </div>
  )
}
