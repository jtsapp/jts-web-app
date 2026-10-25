'use client'

// Отклики шагов задания — тексты прототипа (setFb), собранные из снимка сессии.

import Icon from './ListenIcons.jsx'

function Fb({ kind, title, children }) {
  const icon = kind === 'ok' ? 'check' : kind === 'near' ? 'bang' : 'x'
  return (
    <div className={`jl-fb jl-fb--${kind}`} role="status">
      <span className="jl-fb__ic">
        <Icon name={icon} />
      </span>
      <div>
        <b>{title}</b>
        {children ? <span>{children}</span> : null}
      </div>
    </div>
  )
}

export function WordFeedback({ item, word, ru, t }) {
  const f = item.wordFeedback
  if (!f) return null
  if (f.kind === 'ok') {
    return <Fb kind="ok" title={t('listen.word.ok', { coins: f.coins })}>{`${word} — ${ru}`}</Fb>
  }
  if (f.kind === 'shown') {
    return (
      <Fb kind="bad" title={t('listen.word.shown', { word })}>
        {f.typed ? t('listen.word.typed', { typed: f.typed }) : t('listen.word.remember')}
      </Fb>
    )
  }
  return (
    <Fb kind={f.kind} title={f.kind === 'near' ? t('listen.word.near') : t('listen.word.bad')}>
      {t('listen.word.retry')}
    </Fb>
  )
}

export function SentenceFeedback({ item, word, t }) {
  const f = item.sentFeedback
  if (!f) return null
  if (f.kind === 'hint') {
    return (
      <Fb kind="near" title={t('listen.sent.hintTitle')}>
        <span className="jl-diff">{f.text} …</span>
      </Fb>
    )
  }
  if (f.kind === 'ownHint') {
    return <Fb kind="near" title={t('listen.sent.ownHintTitle')}>{t('listen.sent.ownHint', { word })}</Fb>
  }
  if (f.kind === 'ok') {
    const showRef = f.ref && !f.exact
    return (
      <Fb kind="ok" title={t(f.exact ? 'listen.sent.perfect' : 'listen.sent.ok', { coins: f.coins })}>
        {showRef ? t('listen.sent.sample', { ref: f.ref }) : null}
        {showRef && f.ru ? <br /> : null}
        {f.ru ? t('listen.sent.translation', { ru: f.ru }) : null}
      </Fb>
    )
  }
  if (f.kind === 'answer') {
    return (
      <Fb kind="bad" title={f.ref ? t('listen.sent.answer') : t('listen.sent.example')}>
        {f.ref || t('listen.sent.ownHint', { word })}
        {f.ru ? (
          <>
            <br />
            {t('listen.sent.translation', { ru: f.ru })}
          </>
        ) : null}
      </Fb>
    )
  }
  if (f.own) {
    return (
      <Fb kind="bad" title={t('listen.sent.fix')}>
        {f.reason === 'needWord' ? t('listen.sent.needWord', { word }) : t('listen.sent.minWords')}
      </Fb>
    )
  }
  const msg =
    f.reason === 'needWord'
      ? t('listen.sent.needWord', { word })
      : f.kind === 'near'
        ? t('listen.sent.nearHelp')
        : t('listen.sent.retry')
  return (
    <Fb kind={f.kind} title={f.kind === 'near' ? t('listen.sent.near') : t('listen.sent.bad')}>
      {msg}
      {f.reason !== 'needWord' && f.missing?.length > 0 && (
        <>
          {' '}
          {t('listen.sent.missing')}{' '}
          <span className="jl-diff">
            {f.missing.map((m) => (
              <span className="jl-miss" key={m}>{m}</span>
            ))}
          </span>
        </>
      )}
    </Fb>
  )
}
