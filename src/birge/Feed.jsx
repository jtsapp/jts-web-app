import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { isSectionMissing, listBirgePosts } from './birgeApi.js'
import { TOPICS } from './labels.js'
import Composer from './Composer.jsx'
import PostCard from './PostCard.jsx'
import { usePostActions } from './usePostActions.js'

/**
 * Лента (спека 2026-11-11 §7): форма «Новая ветка» сверху, фильтр тем (Все + пять), карточки, подгрузка по курсору.
 * 404 первой страницы — бэкенд без раздела: отдаём экрану onMissing, он пишет «Раздел скоро откроется».
 */
export default function Feed({ token, authorName, onOpen, onMissing, onToast, onOpenFeedback }) {
  const { t } = useI18n()
  const [topic, setTopic] = useState(null)
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [state, setState] = useState('loading')
  // Форма появляется после первой удачной загрузки и дальше не пропадает: смена темы не должна стирать черновик,
  // а при 404 формы не было вовсе.
  const [opened, setOpened] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const generation = useRef(0)
  const sentinel = useRef(null)
  const moreRef = useRef(null)
  // onMissing в ref: экран может передать новую функцию на каждом рендере, и перезапрашивать ленту из-за этого незачем.
  const missingRef = useRef(onMissing)
  useEffect(() => {
    missingRef.current = onMissing
  })

  const update = useCallback((id, patch) => setItems((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p))), [])
  const remove = useCallback((id) => setItems((list) => list.filter((p) => p.id !== id)), [])
  const { like, report } = usePostActions({ token, update, remove, onToast })

  // Поколение запроса: ответ старой темы, пришедший после новой, ленту не перезаписывает.
  const loadFirst = useCallback(
    async (nextTopic) => {
      generation.current += 1
      const mine = generation.current
      setState('loading')
      setItems([])
      setCursor(null)
      // Подгрузка старой темы, оборванная сменой поколения, свой finally уже не выполнит — без сброса «Показать ещё»
      // и прокрутка остались бы заперты до ухода с экрана.
      setLoadingMore(false)
      try {
        const page = await listBirgePosts(token, { topic: nextTopic })
        if (mine !== generation.current) return
        setItems(page.items)
        setCursor(page.nextCursor)
        setState('ready')
        setOpened(true)
      } catch (err) {
        if (mine !== generation.current) return
        if (isSectionMissing(err)) missingRef.current?.()
        else setState('error')
      }
    },
    [token],
  )

  useEffect(() => {
    loadFirst(topic)
  }, [loadFirst, topic])

  async function loadMore() {
    if (!cursor || loadingMore) return
    const mine = generation.current
    setLoadingMore(true)
    try {
      const page = await listBirgePosts(token, { topic, cursor })
      if (mine !== generation.current) return
      // Новый пост за это время сдвинул ленту — карточка могла прийти второй раз.
      setItems((list) => [...list, ...page.items.filter((p) => !list.some((x) => x.id === p.id))])
      setCursor(page.nextCursor)
    } catch {
      if (mine === generation.current) onToast?.(t('birge.loadError'))
    } finally {
      if (mine === generation.current) setLoadingMore(false)
    }
  }

  useEffect(() => {
    moreRef.current = loadMore
  })

  // Подгрузка при прокрутке; кнопка под лентой остаётся — для клавиатуры и браузеров без наблюдателя.
  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) moreRef.current?.()
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [cursor, state])

  // Свой новый пост — сверху, если подходит под выбранную тему: сервер вернул карточку целиком (§5.3).
  const addPost = useCallback(
    (post) => {
      if (topic && post.topic !== topic) return
      setItems((list) => [post, ...list.filter((p) => p.id !== post.id)])
    },
    [topic],
  )

  return (
    <>
      {opened && <Composer kind="thread" token={token} authorName={authorName} onPublished={addPost} onOpenFeedback={onOpenFeedback} />}
      <section className="brg-card brg-feed">
        <div className="brg-filters" role="group" aria-label={t('birge.filter.label')}>
          <button type="button" className={`brg-chip${topic ? '' : ' is-on'}`} aria-pressed={!topic} onClick={() => setTopic(null)}>
            {t('birge.filter.all')}
          </button>
          {TOPICS.map((key) => (
            <button key={key} type="button" className={`brg-chip${topic === key ? ' is-on' : ''}`} aria-pressed={topic === key} onClick={() => setTopic(key)}>
              {t(`birge.topic.${key}`)}
            </button>
          ))}
        </div>
        {state === 'loading' && (
          <p className="brg-empty" role="status">
            {t('birge.loading')}
          </p>
        )}
        {state === 'error' && (
          <p className="brg-empty" role="alert">
            {t('birge.loadError')}{' '}
            <button type="button" className="brg-link" onClick={() => loadFirst(topic)}>
              {t('birge.retry')}
            </button>
          </p>
        )}
        {state === 'ready' && items.length === 0 && <p className="brg-empty">{t('birge.empty')}</p>}
        {state === 'ready' && items.map((post) => <PostCard key={post.id} post={post} onOpen={(p) => onOpen(p.id)} onLike={like} onReport={report} />)}
        {state === 'ready' && cursor && (
          <div className="brg-morerow" ref={sentinel}>
            <button type="button" className="brg-btn brg-btn--ghost" disabled={loadingMore} onClick={loadMore}>
              {t(loadingMore ? 'birge.loading' : 'birge.more')}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
