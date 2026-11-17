'use client'

import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getStudentNews, reactToStudentNews } from '../api.js'
import { NEWS_TYPES } from './presentation.js'
import { studentPosts, useNewsCopy } from './copy.js'
import NewsCard from './NewsCard.jsx'

export default function StudentNewsPage({ token, userName, userLevel, onNav, onProfile }) {
  const { copy } = useNewsCopy()
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const pending = useRef(false)
  const version = useRef(null)
  useEffect(() => {
    const request = { active: true }
    version.current = request
    getStudentNews(token).then((rows) => {
      if (request.active) setPosts(studentPosts(rows))
    }).catch(() => { if (request.active) setError('load') })
    return () => { request.active = false }
  }, [token, reload])
  const retry = () => { setPosts(null); setError(''); setReload((value) => value + 1) }

  const act = async (post, kind, extra = {}) => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    const request = version.current
    try {
      const updated = await reactToStudentNews(token, post.id, kind, extra)
      if (request?.active) setPosts((rows) => rows.map((row) => row.id === post.id ? updated : row))
    } catch {
      if (request?.active) setError('action')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const visible = filter ? posts?.filter((post) => post.type === filter) : posts

  return <LearningLayout active="whats-new" token={token} userName={userName} userLevel={userLevel} onNav={onNav} onProfile={onProfile}>
    <section className="student-news-page">
      <h1>What’s New</h1><p>{copy.sub}</p>
      <div className="student-news-filters" aria-label="What's New">
        <button type="button" aria-pressed={!filter} onClick={() => setFilter('')}>{copy.all}</button>
        {Object.keys(NEWS_TYPES).map((key, index) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{copy.types[index]}</button>)}
      </div>
      {error && <p role="alert">{error === 'load' ? copy.error : copy.actionError} {error === 'load' && <button type="button" onClick={retry}>{copy.retry}</button>}</p>}
      {!posts && !error && <p role="status">{copy.loading}</p>}
      {visible?.map((post) => <NewsCard key={post.id} post={post} busy={busy} onAction={act} />)}
      {visible?.length === 0 && <p>{copy.empty}</p>}
    </section>
  </LearningLayout>
}
