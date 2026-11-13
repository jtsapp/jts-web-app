import { useI18n } from '../i18n.jsx'
import { topicKey } from './labels.js'
import { authorInitial, canReport, isLive, postBadge, postTime } from './postView.js'
import { CommentIcon, FlagIcon, HeartIcon } from './icons.jsx'

/**
 * Карточка ветки или комментария (прототип: postHTML). Лайк — только у опубликованного, жалоба — не на свой;
 * у комментария нет темы и счётчика ответов. Текст ученика — текстом React, без разметки.
 */
export default function PostCard({ post, comment = false, onOpen, onLike, onReport }) {
  const { t, lang } = useI18n()
  const badge = postBadge(post)
  const topic = comment ? null : topicKey(post.topic)
  // url: null — файл уже удалён (фото отклонённого поста чистятся через 30 дней, §4): битую картинку не рисуем.
  const media = Array.isArray(post.media) ? post.media.filter((m) => m?.url) : []
  const parts = Array.isArray(post.continuations) ? post.continuations : []
  const author = post.author || {}

  return (
    <article className={`brg-post${comment ? ' brg-post--cm' : ''}`} data-post-id={post.id}>
      <header className="brg-ph">
        {author.avatarUrl ? (
          <img className="brg-av brg-av--sm" src={author.avatarUrl} alt="" />
        ) : (
          <span className="brg-av brg-av--sm" aria-hidden="true">
            {authorInitial(author)}
          </span>
        )}
        <div className="brg-ph__who">
          <b>{author.name || '—'}</b>
          {author.level && <span className="brg-lvl">{author.level}</span>}
          <small>{postTime(post.createdAt, { lang, yesterday: t('birge.card.yesterday') })}</small>
        </div>
        {(badge || topic) && (
          <span className="brg-ph__tags">
            {badge && <span className={`brg-badge brg-badge--${badge.tone}`}>{t(badge.key)}</span>}
            {topic && <span className="brg-topic">{t(topic)}</span>}
          </span>
        )}
      </header>
      {post.text ? <p className="brg-pt">{post.text}</p> : <div className="brg-pt-gap" />}
      {media.length > 0 && (
        <div className="brg-media">
          {media.map((m, i) => (
            <img
              key={m.id ?? i}
              src={m.url}
              width={m.width || undefined}
              height={m.height || undefined}
              alt={t('birge.card.photo', { n: i + 1 })}
              loading="lazy"
            />
          ))}
        </div>
      )}
      {parts.map((part, i) => (
        <p key={i} className="brg-more">
          {part}
        </p>
      ))}
      <footer className="brg-pa">
        <button
          type="button"
          className={post.liked ? 'brg-pa__btn is-liked' : 'brg-pa__btn'}
          aria-pressed={Boolean(post.liked)}
          aria-label={t('birge.card.like')}
          disabled={!onLike || !isLive(post)}
          onClick={() => onLike(post)}
        >
          <HeartIcon filled={Boolean(post.liked)} />
          <span>{post.likes ?? 0}</span>
        </button>
        {!comment && (
          <button type="button" className="brg-pa__btn" aria-label={t('birge.card.comments')} disabled={!onOpen} onClick={() => onOpen(post)}>
            <CommentIcon />
            <span>{post.comments ?? 0}</span>
          </button>
        )}
        {onReport && canReport(post) && (
          <button type="button" className="brg-pa__report" title={t('birge.card.report')} aria-label={t('birge.card.report')} onClick={() => onReport(post)}>
            <FlagIcon />
          </button>
        )}
      </footer>
    </article>
  )
}
