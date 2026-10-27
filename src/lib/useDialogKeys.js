import { useEffect } from 'react'

/**
 * Клавиатура модального окна: Esc закрывает, Tab не выпускает фокус наружу.
 *
 * Замок фокуса обязателен: под окном лежит экран, на котором по условию задачи
 * нажимать нечего (лимит исчерпан, идёт покупка) — без замка Tab уводит туда, и
 * человек «нажимает» невидимые кнопки. Логика повторяла себя в каждом окне
 * (DemoSubscriptionModal, PaymentMethodModal, дальше — модалка лимита), поэтому
 * вынесена сюда одним куском.
 *
 * @param {{current: HTMLElement|null}} ref  корень окна
 * @param {() => void} onClose              что делать по Esc
 */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useDialogKeys(ref, onClose) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      // Все элементы, куда встаёт Tab, кроме выключенных: поле ввода тоже в окне, а выключенная кнопка фокус не
      // берёт и не может быть краем замка.
      const nodes = [...(ref.current?.querySelectorAll(FOCUSABLE) || [])].filter((n) => !n.disabled)
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
  }, [ref, onClose])
}
