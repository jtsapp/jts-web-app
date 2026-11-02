import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import AssetImage from './AssetImage.jsx'
import { getTrialRequestState, requestTrialLesson } from '../api.js'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import { isDemoExpiredNow } from '../lib/demoAccess.js'
import { loadToken } from '../lib/session.js'

// Плашка «Данная функция доступна по подписке» — то, что видит ДЕМО-ученик,
// упёршийся в свой демо-лимит: на тропе «Обучение» (KingdomInteriorPage,
// состояние restricted) и в разделах Практики (PracticeLimitScreen, source
// DEMO). Только демо: ученику, у которого кончился лимит абонемента или
// подписки, предлагать купить подписку бессмысленно — он уже платит, и причина
// отказа у него другая. Их тексты остались прежними.
//
// Модалка, а не подмена страницы: экран, до которого человек дошёл, остаётся за
// ней — момент отказа должен читаться как «дальше по подписке», а не как
// «приложение сломалось и увело меня на другой экран».
//
// Диалог сделан по образцу LessonExitConfirm (роль, aria-modal, подпись
// заголовком, Esc, клик по подложке), плюс замок фокуса: без него Tab уходит на
// экран под модалкой, где по требованию ничего нажимать нельзя.
//
// Срок демо вышел — окно другое: говорит об этом прямо и зовёт на бесплатный
// пробный урок, а не к покупке. Решение 02.11.2026: пакеты за 40–100 тысяч пугают
// того, кто ещё не видел урока, а цену менеджер назовёт уже после него. Заявка —
// /mobile/trial-request: бэкенд заводит сделку в amoCRM с тегом «Заявка на пробный
// урок», только на первую заявку. WhatsApp сам не открываем: заявка и есть
// обращение к менеджеру, он перезвонит (написать самому можно после заявки).
//
// overPage — окно открыто поверх всего приложения (App), а не внутри экрана: у
// обычного .ds-over опора — контейнер экрана, и здесь он уезжал бы с прокруткой.
export default function DemoSubscriptionModal({ onClose, onBuy, onTrialBooked, overPage = false }) {
  const { t } = useI18n()
  const expired = isDemoExpiredNow()
  const cardRef = useRef(null)
  const backRef = useRef(null)
  const [trial, setTrial] = useState(null)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const booked = expired && !!trial?.requested

  // Заявку могли оставить раньше (карточка на «Главной», другое устройство) —
  // тогда звать ещё раз незачем. Не ответил сервер — покажем кнопку: повторная
  // заявка на бэкенде безопасна.
  useEffect(() => {
    const token = expired ? loadToken() : null
    if (!token) return
    let alive = true
    getTrialRequestState(token).then((s) => { if (alive) setTrial(s) }).catch(() => {})
    return () => { alive = false }
  }, [expired])

  const bookTrial = async () => {
    if (sending) return
    setSending(true)
    setFailed(false)
    try {
      setTrial(await requestTrialLesson(loadToken()))
      onTrialBooked?.()
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  // Фокус при открытии — на «Вернуться», как в LessonExitConfirm на «Отменить»:
  // вторая кнопка уводит на WhatsApp в новой вкладке, и Enter по инерции
  // выдёргивал бы человека из приложения. После заявки — туда же: кнопка, на
  // которой стоял фокус, исчезла.
  useEffect(() => {
    backRef.current?.focus()
  }, [booked])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      // Замок фокуса. Своих disabled-кнопок и полей у окна нет, поэтому весь
      // список — это две кнопки и ссылка покупки.
      const nodes = [...(cardRef.current?.querySelectorAll('a[href], button') || [])]
      if (!nodes.length) return
      const i = nodes.indexOf(document.activeElement)
      const last = nodes.length - 1
      // i === -1 — фокус вообще вне окна (клик по подложке, фокус со страницы
      // под ней): возвращаем на край, с которого пришли.
      if (i === -1) {
        e.preventDefault()
        nodes[e.shiftKey ? last : 0].focus()
      } else if (e.shiftKey && i === 0) {
        e.preventDefault()
        nodes[last].focus()
      } else if (!e.shiftKey && i === last) {
        e.preventDefault()
        nodes[0].focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={`ds-over${overPage ? ' ds-over--page' : ''}`} onClick={onClose}>
      <div
        className="ds-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-title"
        aria-describedby="ds-body"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Иллюстрация — Декстер, маскот-путеводитель приложения (он же ведёт
            регистрацию). Своей картинки «подписка» в public/ нет, а тянуть
            внешнюю в вёрстку нельзя, поэтому берём то, что уже есть и по смыслу
            принадлежит этому голосу. Декоративная: текст рядом полный. */}
        <AssetImage className="ds-art" src="/assets/demo/modal-london.webp" alt="" />
        <h2 className="ds-title" id="ds-title">
          {t(booked ? 'trial.doneTitle' : expired ? 'demo.expired.title' : 'demo.paywall.title')}
        </h2>
        <p className="ds-body" id="ds-body" aria-live="polite">
          {t(booked
            ? (trial.managerAssigned ? 'trial.doneManager' : 'trial.doneText')
            : expired ? 'demo.expired.body' : 'demo.paywall.body')}
        </p>
        {/* Тот же абзац ошибки, что у карточки пробного урока на «Главной». */}
        {failed && <p className="hm-trial__error" role="alert">{t('trial.failed')}</p>}
        <div className="ds-acts">
          <button type="button" className="ds-back" ref={backRef} onClick={onClose}>
            {t('demo.paywall.back')}
          </button>
          {/* Теперь у покупки есть свой экран — витрина тарифов (PricingPage),
              и «Приобрести подписку» ведёт туда: это тот же шаг, что и «Открыть
              полный доступ» в плашке демо, и разводить их по разным маршрутам
              было бы странно. Договорить с менеджером человек всё равно сможет
              — это следующий шаг витрины («Способ оплаты»).

              onBuy не передали (окно открыто с экрана, который не умеет
              навигировать) — остаётся прежний путь в WhatsApp поддержки: кнопка,
              которая молча ничего не делает, читается как сломанная оплата. */}
          {booked ? (
            <a className="ds-buy" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              {t('demo.expired.manager')}
            </a>
          ) : expired ? (
            <button type="button" className="ds-buy" disabled={sending} onClick={bookTrial}>
              {t(sending ? 'trial.sending' : 'demo.expired.trial')}
            </button>
          ) : onBuy ? (
            <button type="button" className="ds-buy" onClick={onBuy}>
              {t('demo.paywall.buy')}
            </button>
          ) : (
            <a
              className="ds-buy"
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('demo.paywall.buy')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
