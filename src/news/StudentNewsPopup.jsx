'use client'

import { useEffect, useRef, useState } from 'react'
import { getStudentNewsPopup, reactToStudentNews } from '../api.js'
import { useDialogKeys } from '../lib/useDialogKeys.js'
import { studentPosts, useNewsCopy } from './copy.js'
import NewsCard from './NewsCard.jsx'

function hasOtherDialog() {
  return [...document.querySelectorAll('[role="dialog"][aria-modal="true"]:not([hidden]):not([aria-hidden="true"]), dialog[open]')]
    .some((element) => !element.closest('.student-news-popup'))
}

export default function StudentNewsPopup({ token, enabled = true, onNav }) {
  const { copy, language, setLanguage } = useNewsCopy()
  const [posts, setPosts] = useState([])
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [otherDialog, setOtherDialog] = useState(false)
  const pending = useRef(false)
  const session = useRef(null)
  const dialog = useRef(null)
  const closeButton = useRef(null)
  const current = enabled && !otherDialog ? posts[index] : null
  const currentId = current?.id

  useEffect(() => {
    const request = { active: true }
    session.current = request
    getStudentNewsPopup(token).then((rows) => {
      if (request.active) { setPosts(studentPosts(rows)); setIndex(0) }
    }).catch(() => {})
    return () => { request.active = false }
  }, [token])

  useEffect(() => {
    const check = () => setOtherDialog(hasOtherDialog())
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['role', 'aria-modal', 'aria-hidden', 'hidden', 'open'] })
    check()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (currentId == null) return undefined
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    return () => { document.body.style.overflow = overflow; previous?.focus?.() }
  }, [currentId])

  const act = async (post, kind, extra = {}, after) => {
    const request = session.current
    if (pending.current || !request?.active) return
    pending.current = true
    setBusy(true)
    setError(false)
    try {
      const updated = await reactToStudentNews(token, post.id, kind, extra)
      if (!request.active) return
      setPosts((rows) => rows.map((row) => row.id === post.id ? updated : row))
      after?.()
    } catch {
      if (request.active) setError(true)
    } finally {
      pending.current = false
      if (request.active) setBusy(false)
    }
  }
  const next = () => { if (current) act(current, 'seen', {}, () => setIndex((value) => value + 1)) }
  useDialogKeys(dialog, next)

  if (!current) return null
  return <div className="student-news-popup"><div className="news-overlay">
    <section ref={dialog} className="news-dialog" role="dialog" aria-modal="true" aria-labelledby="student-news-title">
      <div className="news-toolbar"><span className="news-counter">{index + 1} {copy.of} {posts.length}</span>
        <div className="news-languages" aria-label="Language">{['ru', 'kk', 'en'].map((value) => <button type="button" key={value}
          className={language === value ? 'on' : ''} aria-pressed={language === value} onClick={() => setLanguage(value)}>{value === 'kk' ? 'KZ' : value.toUpperCase()}</button>)}</div>
        <button ref={closeButton} type="button" className="news-close" aria-label={copy.close} disabled={busy} onClick={next}>×</button>
      </div>
      <NewsCard key={current.id} post={current} mode="hero" headingId="student-news-title" busy={busy} onAction={act} />
      {error && <p className="news-error" role="alert">{copy.actionError}</p>}
      <footer className="news-footer">
        <button type="button" className="news-all" disabled={busy} onClick={() => act(current, 'seen', {}, () => { setPosts([]); onNav('whats-new') })}>{copy.allNews}</button>
        <button type="button" className="news-next" disabled={busy} onClick={next}>{index + 1 < posts.length ? copy.next : copy.close}</button>
      </footer>
    </section>
  </div></div>
}
