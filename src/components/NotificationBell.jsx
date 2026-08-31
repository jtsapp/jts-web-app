import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { BellIcon, CloseIcon } from './icons.jsx'
import { useI18n } from '../i18n.jsx'
import { loadToken } from '../lib/session.js'
import { userIdFromToken } from '../lib/jwt.js'
import { wsBase } from '../lib/wsUrl.js'
import { notificationTarget } from '../lib/studentDeepLink.js'
import { playCue, isSoundEnabled, setSoundEnabled } from '../lib/notifySound.js'
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api.js'

const NotificationCtx = createContext(null)

function formatWhen(iso, locale) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale === 'kk' ? 'kk-KZ' : locale === 'en' ? 'en-GB' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationProvider({ token, onNavigate, children }) {
  const auth = token || loadToken()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)

  const refreshUnread = useCallback(() => {
    if (!auth) return
    getUnreadNotificationCount(auth)
      .then((res) => setUnread(Number(res?.count) || 0))
      .catch(() => {})
  }, [auth])

  const refreshList = useCallback(() => {
    if (!auth) return
    listNotifications(auth, 20)
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [auth])

  useEffect(() => {
    refreshUnread()
    const id = setInterval(refreshUnread, 30000)
    return () => clearInterval(id)
  }, [refreshUnread])

  useEffect(() => {
    if (!auth) return undefined
    const userId = userIdFromToken(auth)
    if (!userId) return undefined
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: { Authorization: `Bearer ${auth}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/notifications/${userId}`, () => {
          // Звук здесь покрывает всё, о чём сервер шлёт уведомление, — в том
          // числе выданную домашнюю работу: заводить под неё отдельный канал
          // значило бы дублировать то, что уже приходит.
          playCue('notification')
          refreshUnread()
          refreshList()
        })
      },
    })
    client.activate()
    return () => {
      client.deactivate()
    }
  }, [auth, refreshUnread, refreshList])

  const openPanel = () => {
    setOpen(true)
    refreshList()
    refreshUnread()
  }

  const closePanel = () => setOpen(false)

  const openItem = async (item) => {
    if (!item) return
    if (!item.isRead && auth) {
      try {
        await markNotificationRead(auth, item.id)
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
        setUnread((n) => Math.max(0, n - 1))
      } catch {
        /* still navigate */
      }
    }
    setOpen(false)
    const target = notificationTarget(item.deepLink)
    if (target.screen && onNavigate) onNavigate(target.screen, target.payload)
  }

  const markAll = async () => {
    if (!auth) return
    try {
      await markAllNotificationsRead(auth)
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnread(0)
    } catch {
      /* keep current */
    }
  }

  const value = { open, unread, items, openPanel, closePanel, openItem, markAll, auth }
  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>
}

export function NotificationBell({ className = '' }) {
  const ctx = useContext(NotificationCtx)
  const { t, lang } = useI18n()
  const rootRef = useRef(null)
  // Звук у сообщений, домашних заданий и таймера выключается здесь: сигнал,
  // который нельзя погасить, раздражает сильнее, чем помогает. Читаем один раз
  // при монтировании — localStorage в рендере опрашивать незачем.
  const [soundOn, setSoundOn] = useState(true)
  useEffect(() => setSoundOn(isSoundEnabled()), [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    // Проигрываем сразу после включения — иначе непонятно, что именно включили.
    if (next) playCue('notification')
  }

  useEffect(() => {
    if (!ctx?.open) return undefined
    const onDoc = (e) => {
      // Два колокольчика (мобильная шапка и десктоп) делят open. Клик по
      // панели второго экземпляра не должен считаться «снаружи».
      if (e.target.closest('.nbell')) return
      ctx.closePanel()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [ctx])

  if (!ctx || !ctx.auth) return null

  const { open, unread, items, openPanel, closePanel, openItem, markAll } = ctx
  const badge = unread > 99 ? '99+' : String(unread)

  return (
    <div className={`nbell ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="nbell__btn"
        aria-label={t('notif.title')}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        <BellIcon size={22} />
        {unread > 0 && <span className="nbell__badge">{badge}</span>}
      </button>
      {open && (
        <div className="nbell__panel" role="dialog" aria-label={t('notif.title')}>
          <div className="nbell__head">
            <b>{t('notif.title')}</b>
            <div className="nbell__head-actions">
              <button
                type="button"
                className="nbell__textbtn"
                onClick={toggleSound}
                aria-pressed={soundOn}
              >
                {soundOn ? t('notif.soundOn') : t('notif.soundOff')}
              </button>
              <button type="button" className="nbell__textbtn" disabled={unread === 0} onClick={markAll}>
                {t('notif.markAll')}
              </button>
              <button type="button" className="nbell__iconbtn" aria-label={t('common.close')} onClick={closePanel}>
                <CloseIcon size={18} />
              </button>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="nbell__empty">{t('notif.empty')}</div>
          ) : (
            <ul className="nbell__list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`nbell__item ${n.isRead ? '' : 'nbell__item--unread'}`}
                    onClick={() => openItem(n)}
                  >
                    <span className="nbell__item-title">{n.title}</span>
                    <span className="nbell__item-msg">{n.message}</span>
                    <span className="nbell__item-date">{formatWhen(n.createdAt, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
