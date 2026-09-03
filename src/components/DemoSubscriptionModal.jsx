import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n.jsx'
import AssetImage from './AssetImage.jsx'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'

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
export default function DemoSubscriptionModal({ onClose }) {
  const { t } = useI18n()
  const cardRef = useRef(null)
  const backRef = useRef(null)

  // Фокус при открытии — на «Вернуться», как в LessonExitConfirm на «Отменить»:
  // вторая кнопка уводит на WhatsApp в новой вкладке, и Enter по инерции
  // выдёргивал бы человека из приложения.
  useEffect(() => {
    backRef.current?.focus()
  }, [])

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
    <div className="ds-over" onClick={onClose}>
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
        <AssetImage className="ds-art" src="/assets/dexter.png" alt="" />
        <h2 className="ds-title" id="ds-title">{t('demo.paywall.title')}</h2>
        <p className="ds-body" id="ds-body">{t('demo.paywall.body')}</p>
        <div className="ds-acts">
          <button type="button" className="ds-back" ref={backRef} onClick={onClose}>
            {t('demo.paywall.back')}
          </button>
          {/* Покупки подписки в приложении нет: экрана оплаты нет в state-машине
              App.jsx, платёжного роута нет в src/app/api. Кнопка, которая никуда
              не ведёт или открывает несуществующий экран, читается как сломанная
              оплата, поэтому ведём туда, где подписку правда оформляют — в
              WhatsApp поддержки (src/lib/support.js), тот же адрес, что у всех
              остальных демо-призывов. Ссылка, а не button с обработчиком:
              человек должен видеть, куда его отправляют, и уметь открыть это
              своим способом. */}
          <a
            className="ds-buy"
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('demo.paywall.buy')}
          </a>
        </div>
      </div>
    </div>
  )
}
