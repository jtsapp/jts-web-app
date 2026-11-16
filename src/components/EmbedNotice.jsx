import { useI18n } from '../i18n.jsx'

// Сообщение кабинета, открытого рамкой в уроке, когда раздел показать нельзя: нет входа (страница урока токен не дала)
// или раздел недоступен. Формы входа в рамке нет: вводить пароль внутри урока негде и незачем — вход даёт страница урока.
// Тексты здесь же, а не в словарях: рамку видит и ученик, и преподаватель, язык берётся тот, что выбран в кабинете.
const TEXTS = {
  signin: {
    ru: ['Раздел не открылся', 'Откройте раздел «Практика» в кабинете ученика в новой вкладке.', 'Открыть кабинет'],
    kk: ['Бөлім ашылмады', '«Практика» бөлімін оқушы кабинетінде жаңа қойындыда ашыңыз.', 'Кабинетті ашу'],
    en: ['The section did not open', 'Open the Practice section in the student cabinet in a new tab.', 'Open the cabinet'],
  },
  unavailable: {
    ru: ['Раздел недоступен', 'Этот раздел «Практики» сейчас нельзя открыть в уроке.', 'Открыть кабинет'],
    kk: ['Бөлім қолжетімсіз', '«Практиканың» бұл бөлімін қазір сабақта ашу мүмкін емес.', 'Кабинетті ашу'],
    en: ['The section is not available', 'This Practice section cannot be opened inside the lesson right now.', 'Open the cabinet'],
  },
}

export default function EmbedNotice({ kind = 'signin' }) {
  const { lang } = useI18n()
  const [title, text, action] = (TEXTS[kind] || TEXTS.signin)[lang] || (TEXTS[kind] || TEXTS.signin).ru
  return (
    <main className="learning-embed learning-embed--notice" role="alert">
      <h1>{title}</h1>
      <p>{text}</p>
      <a href="/?screen=practice" target="_blank" rel="noopener noreferrer">{action}</a>
    </main>
  )
}
