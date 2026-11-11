import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getBirgeThread } from './birgeApi.js'
import Composer from './Composer.jsx'
import PostCard from './PostCard.jsx'
import { usePostActions } from './usePostActions.js'

/**
 * Ветка (спека 2026-11-11 §7): «← Все ветки», пост, комментарии с отступом, форма ответа — тот же редактор без темы
 * и продолжений. Ответить можно только на опубликованную ветку: на остальные сервер ответит 409 (§5.1).
 */
export default function Thread({ token, postId, authorName, onBack, onToast, onOpenFeedback }) {
  const { t } = useI18n()
  const [thread, setThread] = useState(null)
  const [comments, setComments] = useState([])
  const [state, setState] = useState('loading')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    setState('loading')
    getBirgeThread(token, postId).then(
      (data) => {
        if (!alive) return
        if (!data.thread) {
          setState('missing')
          return
        }
        setThread(data.thread)
        setComments(data.comments)
        setState('ready')
      },
      (err) => {
        if (alive) setState(err?.status === 404 ? 'missing' : 'error')
      },
    )
    return () => {
      alive = false
    }
  }, [token, postId, version])

  const update = useCallback((id, patch) => {
    setThread((p) => (p && p.id === id ? { ...p, ...patch } : p))
    setComments((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  // Жалобы скрыли саму ветку — читать дальше нечего, назад в ленту; скрытый комментарий просто уходит.
  const remove = useCallback(
    (id) => {
      if (id === postId) onBack?.()
      else setComments((list) => list.filter((c) => c.id !== id))
    },
    [postId, onBack],
  )

  const { like, report } = usePostActions({ token, update, remove, onToast })

  // Свой ответ — в конец; счётчик ветки считает только опубликованные (§4), поэтому «на проверке» его не двигает.
  const addComment = useCallback((post) => {
    setComments((list) => [...list, post])
    if (post.status === 'published') setThread((p) => (p ? { ...p, comments: (p.comments ?? 0) + 1 } : p))
  }, [])

  return (
    <>
      <button type="button" className="brg-back" onClick={onBack}>
        {t('birge.thread.back')}
      </button>
      {state === 'loading' && (
        <p className="brg-card brg-empty" role="status">
          {t('birge.loading')}
        </p>
      )}
      {state === 'missing' && (
        <p className="brg-card brg-empty" role="alert">
          {t('birge.thread.missing')}
        </p>
      )}
      {state === 'error' && (
        <p className="brg-card brg-empty" role="alert">
          {t('birge.thread.loadError')}{' '}
          <button type="button" className="brg-link" onClick={() => setVersion((v) => v + 1)}>
            {t('birge.retry')}
          </button>
        </p>
      )}
      {state === 'ready' && thread && (
        <>
          <section className="brg-card brg-thread">
            <PostCard post={thread} onLike={like} onReport={report} />
            {comments.length > 0 ? (
              comments.map((c) => <PostCard key={c.id} post={c} comment onLike={like} onReport={report} />)
            ) : (
              <p className="brg-empty">{t('birge.thread.noComments')}</p>
            )}
          </section>
          {thread.status === 'published' ? (
            <Composer kind="comment" token={token} authorName={authorName} parentId={thread.id} onPublished={addComment} onOpenFeedback={onOpenFeedback} />
          ) : (
            <p className="brg-hint brg-closed">{t('birge.thread.closed')}</p>
          )}
        </>
      )}
    </>
  )
}
