'use client'

import {serverActionError} from '../lib/serverActionError.js'

import { useCallback, useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import {
  getNotificationChannels, listNotifications, markAllNotificationsRead, markNotificationRead, saveNotificationChannels,
} from '../api.js'
import { notificationTarget } from '../lib/studentDeepLink.js'
import { channelMarks, normalizeChannels } from '../notifications/channelMarks.js'
import { useNoticeT } from '../notifications/texts.js'
import { useBusy, useToast } from '../matching/ui.jsx'

const LIMIT = 100

// «Уведомления» ученика (ТЗ кабинетов, 14): лента с отметкой каналов, по которым событие реально ушло (Email, Push), и
// настройка этих каналов. Кабинет работает всегда. Колокольчик в шапке показывает те же уведомления коротко.
export default function NotificationsPage({ token, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useNoticeT()
  const [items, setItems] = useState(null)
  const [channels, setChannels] = useState(null)
  const [busy, run] = useBusy()
  const [toastNode, toast] = useToast()

  const load = useCallback(async () => {
    try {
      const [list, current] = await Promise.all([
        listNotifications(token, LIMIT),
        getNotificationChannels(token).catch(() => null),
      ])
      setItems(Array.isArray(list) ? list : [])
      setChannels(current ? normalizeChannels(current) : null)
    } catch {
      setItems([])
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const open = async (item) => {
    if (!item.isRead) {
      try {
        await markNotificationRead(token, item.id)
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
      } catch {
        /* всё равно идём по ссылке */
      }
    }
    const target = notificationTarget(item.deepLink)
    if (target.screen) onNav(target.screen, target.payload)
  }

  const markAll = () =>
    run(async () => {
      try {
        await markAllNotificationsRead(token)
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      } catch (e) {
        toast(serverActionError(e, t))
      }
    })

  // Переключатель срабатывает сразу; не получилось сохранить — возвращаем прежнее значение и говорим об этом.
  const toggle = (key) =>
    run(async () => {
      const next = { ...channels, [key]: !channels[key] }
      setChannels(next)
      try {
        setChannels(normalizeChannels(await saveNotificationChannels(token, next)))
        toast(t('channels.saved'))
      } catch (e) {
        setChannels(channels)
        toast(serverActionError(e, t))
      }
    })

  const unread = (items || []).filter((n) => !n.isRead).length

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="notifications" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="mt gp">
        <div className="mt-wrap">
          <h1 className="mt-h1">{t('title')}</h1>
          <p className="gp-lead">{t('lead')}</p>

          {channels && (
            <section className="mt-card mt-stack" data-testid="channels">
              <h2 className="mt-h2">{t('channels.title')}</h2>
              <p className="gp-field__hint">{t('channels.note')}</p>
              {['email', 'push'].map((key) => (
                <label key={key} className="mt-row mt-between" style={{ gap: 12 }}>
                  <span className="gp-item__main">
                    <b>{t('channels.' + key)}</b>
                    <span className="gp-item__meta">{t(`channels.${key}.d`)}</span>
                  </span>
                  <input type="checkbox" role="switch" aria-label={t('channels.' + key)} checked={channels[key]} disabled={busy} onChange={() => toggle(key)} />
                </label>
              ))}
            </section>
          )}

          <section className="mt-stack" data-testid="feed">
            <div className="mt-row mt-between">
              <h2 className="mt-h2">{t('title')}{unread > 0 ? ` (${unread})` : ''}</h2>
              <button type="button" className="mt-btn mt-btn--sm mt-btn--line" disabled={busy || unread === 0} onClick={markAll}>{t('markAll')}</button>
            </div>
            {items === null && <p className="mt-muted">{t('loading')}</p>}
            {items && items.length === 0 && <p className="mt-muted">{t('empty')}</p>}
            <div className="gp-list">
              {(items || []).map((item) => {
                const marks = channelMarks(item.channels)
                return (
                  <button key={item.id} type="button" className={`mt-card gp-item${item.isRead ? '' : ' gp-item--best'}`} onClick={() => open(item)} data-testid={`n-${item.id}`} style={{ textAlign: 'left' }}>
                    <span className="gp-item__main">
                      <span className="gp-item__title">{item.title}</span>
                      <span className="gp-item__meta">{item.message}</span>
                      <span className="gp-item__meta">{formatWhen(item.createdAt, lang)}</span>
                    </span>
                    <span className="gp-chips">
                      {!item.isRead && <span className="mt-pill mt-pill--ok">{t('unread')}</span>}
                      {marks.length === 0 && <span className="mt-pill mt-pill--gray">{t('chip.cabinet')}</span>}
                      {marks.map((mark) => <span key={mark} className="mt-pill mt-pill--gray">{t('chip.' + mark)}</span>)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
      {toastNode}
    </LearningLayout>
  )
}

function formatWhen(iso, lang) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const locale = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  return date.toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
