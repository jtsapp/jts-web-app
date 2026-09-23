import { useI18n } from '../i18n.jsx'
import { openAssistant, useAssistantAvailable } from '../lib/assistant/assistantBus.js'

// Кнопка под плашкой «Неверный ответ»: открывает помощника с готовым вопросом
// «почему неверно». Снимок снимется с того же экрана — с заданием, ответом
// ученика и разбором.
//
// Рисуется, только пока на странице есть виджет помощника: на экзаменах его
// нет, и в тестах плееров его тоже нет — кнопка им не мешает.
export default function AskAssistantButton({ className = '' }) {
  const { t } = useI18n()
  const available = useAssistantAvailable()
  if (!available) return null
  return (
    <button
      type="button"
      className={`asst-ask ${className}`.trim()}
      onClick={() => openAssistant({ prompt: t('assistant.ask.whyWrongPrompt') })}
    >
      {t('assistant.ask.whyWrong')}
    </button>
  )
}
