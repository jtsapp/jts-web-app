import { useCallback, useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import Feed from '../birge/Feed.jsx'
import Thread from '../birge/Thread.jsx'
import RulesCard from '../birge/RulesCard.jsx'
import { writePostParam } from '../birge/postParam.js'

/**
 * Just to Study Birge — лента веток студентов (спека docs/superpowers/specs/2026-11-11-birge-community-design.md §7).
 * Оболочка — кабинетная (LearningLayout): меню и общий колокольчик уведомлений, своего у раздела нет. Лента или ветка
 * переключаются внутри экрана; открытая ветка держится в ?post=, чтобы её пережил F5 и открыла ссылка.
 *
 * target — цель перехода из App: { postId, at }. at различает два перехода к одной цели: уведомление, пришедшее,
 * пока экран открыт, App не пересоздаёт, а меняет target; postId: null — пункт меню, назад в ленту.
 */
export default function BirgePage({ token, userName, userLevel, onNav, onProfile, target = null }) {
  const { t } = useI18n()
  const [postId, setPostId] = useState(target?.postId ?? null)
  const [missing, setMissing] = useState(false)
  const [toast, setToast] = useState('')
  const lastTarget = useRef(target?.at ?? null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!target || target.at === lastTarget.current) return
    lastTarget.current = target.at
    setPostId(target.postId ?? null)
  }, [target])

  useEffect(() => {
    writePostParam(postId)
  }, [postId])
  // Уходя с экрана, ?post= снимаем: общая синхронизация адреса в App о нём не знает и оставила бы его чужому экрану.
  useEffect(() => () => writePostParam(null), [])

  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const open = useCallback((id) => {
    setPostId(id)
    rootRef.current?.scrollIntoView?.({ block: 'start' })
  }, [])
  const back = useCallback(() => setPostId(null), [])
  const markMissing = useCallback(() => setMissing(true), [])
  const openFeedback = useCallback((feedbackId) => onNav?.('feedback', feedbackId != null ? { feedbackId } : undefined), [onNav])
  const authorName = (userName || '').trim() || t('birge.compose.you')

  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} active="birge" onNav={onNav} onProfile={onProfile}>
      <div className="brg" ref={rootRef}>
        <header className="brg-top">
          <h1>{t('birge.title')}</h1>
          <p>{t('birge.subtitle')}</p>
        </header>
        {missing ? (
          <section className="brg-card brg-soon">
            <h2>{t('birge.soon.title')}</h2>
            <p>{t('birge.soon.text')}</p>
          </section>
        ) : (
          <div className="brg-grid">
            <div className="brg-main">
              {postId != null ? (
                <Thread
                  key={postId}
                  token={token}
                  postId={postId}
                  authorName={authorName}
                  onBack={back}
                  onToast={setToast}
                  onOpenFeedback={openFeedback}
                />
              ) : (
                <Feed token={token} authorName={authorName} onOpen={open} onMissing={markMissing} onToast={setToast} onOpenFeedback={openFeedback} />
              )}
            </div>
            <RulesCard />
          </div>
        )}
        {toast && (
          <div className="brg-toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </LearningLayout>
  )
}
