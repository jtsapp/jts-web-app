import { createContext, useContext, useState, useCallback } from 'react'
import { RuFlagIcon, GbFlagIcon, KzFlagIcon } from './components/icons.jsx'

export const LANGS = [
  { code: 'ru', label: 'Русский', Flag: RuFlagIcon },
  { code: 'en', label: 'English', Flag: GbFlagIcon },
  { code: 'kk', label: 'Қазақша', Flag: KzFlagIcon },
]

// Официальные строки взяты из mobile-app/lib/l10n/app_{ru,en,kk}.arb,
// чтобы веб совпадал с мобильным приложением. Лендинг-специфичные — свои.
const dict = {
  ru: {
    'welcome.title': 'Обучайся английскому\nс личным тьютором',
    'welcome.subtitle': 'Комфорт и лучшие методики обучения английского языка',
    'common.register': 'Регистрация',
    'common.login': 'Войти',
    'common.send': 'Отправить',
    'common.back': 'Назад',
    'footer.privacy': 'Политика конфиденциальности',
    'footer.rights': '© Все права защищены',
    'reg.title': 'Регистрация',
    'reg.subtitle': 'Декстер пишет вам, отвечайте ему чтобы пройти регистрацию',
    'dexter.name': 'Декстер',
    'dexter.role': 'Путеводитель и тьютор',
    'dexter.greet': 'Привет! Как тебя зовут?',
    'chat.placeholder': 'Меня зовут …',
    'dexter.nice': 'Приятно познакомиться, {name}',
    'dexter.motiv': 'Со мной ты действительно улучшишь свой английский — и получишь удовольствие от процесса. 🤝',
    'dexter.toReg': 'Давай перейдем к твоей регистрации',
    'auth.phone': 'Войти по номеру телефона',
    'auth.apple': 'Войти через Apple ID',
    'auth.google': 'Войти через Google',
    'phone.title': 'Войти по номеру\nтелефона',
    'phone.subtitle': 'Введите свой номер и мы отправим вам СМС с кодом для подтверждения',
    'phone.submit': 'Войти',
    'phone.sending': 'Отправляем…',
    'phone.note': 'Нажимая на кнопку «Войти» вы соглашаетесь с нашей ',
    'phone.privacy': 'политикой конфиденциальности',
    'otp.title': 'Мы отправили\nвам СМС-код',
    'otp.subtitle': 'Введите 4-х значный код ниже',
    'otp.submit': 'Подтвердить номер',
    'otp.checking': 'Проверяем…',
    'otp.resendIn': 'Отправим сообщение повторно через {sec} сек',
    'otp.resend': 'Отправить повторно',
    'success.title': 'Регистрация\nпройдена',
    'test.intro1': 'Давай определим твой уровень знаний',
    'test.intro2': 'Нужно пройти тестирование, чтобы мы смогли подобрать тебе обучение',
    'test.intro3': 'Я задам около 14 вопросов, которые подстраиваются под твои ответы — ответишь правильно, и следующий станет сложнее. Займёт примерно 5 минут.',
    'test.start': 'Начать тестирование сейчас',
    'test.later': 'Пройду позже',
    'test.header': 'Тестирование на знания языка (CEFR)',
    'test.question': 'Вопрос {n} из {total}',
    'test.check': 'Проверить',
    'test.readPassage': 'Прочитайте текст',
    'test.loading': 'Готовим тест…',
    'test.errLoad': 'Нет доступных вопросов',
    'result.great': 'Отлично!',
    'result.determined': 'Ваш уровень определен',
    'result.wrong': 'Неверных ответов',
    'result.correct': 'Верных ответов',
    'result.continue': 'Продолжить',
    'err.send': 'Не удалось отправить код. Попробуйте ещё раз.',
    'err.otp': 'Неверный код. Попробуйте ещё раз',
  },
  en: {
    'welcome.title': 'Learn English\nwith a personal tutor',
    'welcome.subtitle': 'Comfort and the best methods of learning English',
    'common.register': 'Sign up',
    'common.login': 'Sign in',
    'common.send': 'Send',
    'common.back': 'Back',
    'footer.privacy': 'Privacy Policy',
    'footer.rights': '© All rights reserved',
    'reg.title': 'Registration',
    'reg.subtitle': 'Dexter is texting you — reply to complete your registration',
    'dexter.name': 'Dexter',
    'dexter.role': 'Guide and tutor',
    'dexter.greet': "Hi! What's your name?",
    'chat.placeholder': 'My name is …',
    'dexter.nice': 'Nice to meet you, {name}',
    'dexter.motiv': "With me, you'll really improve your English — and enjoy the process. 🤝",
    'dexter.toReg': "Let's move on to your registration",
    'auth.phone': 'Sign in with phone number',
    'auth.apple': 'Sign in with Apple ID',
    'auth.google': 'Sign in with Google',
    'phone.title': 'Sign in with\nphone number',
    'phone.subtitle': "Enter your number and we'll send you an SMS with a confirmation code",
    'phone.submit': 'Sign in',
    'phone.sending': 'Sending…',
    'phone.note': 'By clicking «Sign in» you agree to our ',
    'phone.privacy': 'privacy policy',
    'otp.title': "We've sent you\nan SMS code",
    'otp.subtitle': 'Enter the 4-digit code below',
    'otp.submit': 'Confirm number',
    'otp.checking': 'Checking…',
    'otp.resendIn': "We'll resend the message in {sec} sec",
    'otp.resend': 'Resend',
    'success.title': 'Registration\ncomplete',
    'test.intro1': "Let's find out your level",
    'test.intro2': "You'll need to take a test so we can tailor your learning",
    'test.intro3': "I'll ask about 14 questions that adapt to your answers — get one right and the next gets harder. Takes about 5 minutes.",
    'test.start': 'Start the test now',
    'test.later': "I'll take it later",
    'test.header': 'Language level test (CEFR)',
    'test.question': 'Question {n} of {total}',
    'test.check': 'Check',
    'test.readPassage': 'Read the passage',
    'test.loading': 'Preparing the test…',
    'test.errLoad': 'No questions available',
    'result.great': 'Great!',
    'result.determined': 'Your level is determined',
    'result.wrong': 'Incorrect answers',
    'result.correct': 'Correct answers',
    'result.continue': 'Continue',
    'err.send': "Couldn't send the code. Please try again.",
    'err.otp': 'Wrong code. Please try again',
  },
  kk: {
    'welcome.title': 'Жеке ұстазбен\nағылшын тілін үйрен',
    'welcome.subtitle': 'Жайлылық және ағылшын тілін үйренудің үздік әдістемелері',
    'common.register': 'Тіркелу',
    'common.login': 'Кіру',
    'common.send': 'Жіберу',
    'common.back': 'Артқа',
    'footer.privacy': 'Құпиялылық саясаты',
    'footer.rights': '© Барлық құқықтар қорғалған',
    'reg.title': 'Тіркелу',
    'reg.subtitle': 'Декстер сізге жазып жатыр — тіркелуден өту үшін оған жауап беріңіз',
    'dexter.name': 'Декстер',
    'dexter.role': 'Бағыттаушы және тьютор',
    'dexter.greet': 'Сәлем! Атың кім?',
    'chat.placeholder': 'Менің атым …',
    'dexter.nice': 'Танысқаныма қуаныштымын, {name}',
    'dexter.motiv': 'Менімен сен ағылшын тіліңді шынымен жақсартасың — әрі бұл үдерістен ләззат аласың. 🤝',
    'dexter.toReg': 'Тіркелуіңе көшейік',
    'auth.phone': 'Телефон нөмірі арқылы кіру',
    'auth.apple': 'Apple ID арқылы кіру',
    'auth.google': 'Google арқылы кіру',
    'phone.title': 'Телефон нөмірі\nарқылы кіру',
    'phone.subtitle': 'Нөміріңізді енгізіңіз, біз сізге растау коды бар СМС жібереміз',
    'phone.submit': 'Кіру',
    'phone.sending': 'Жіберілуде…',
    'phone.note': '«Кіру» түймесін басу арқылы сіз біздің ',
    'phone.privacy': 'құпиялылық саясатымызбен келісесіз',
    'otp.title': 'Сізге СМС-код\nжібердік',
    'otp.subtitle': 'Төменде 4 таңбалы кодты енгізіңіз',
    'otp.submit': 'Нөмірді растау',
    'otp.checking': 'Тексерілуде…',
    'otp.resendIn': 'Хабарламаны {sec} сек кейін қайта жібереміз',
    'otp.resend': 'Қайта жіберу',
    'success.title': 'Тіркелу\nаяқталды',
    'test.intro1': 'Білім деңгейіңді анықтайық',
    'test.intro2': 'Саған сай оқуды таңдау үшін тестілеуден өту керек',
    'test.intro3': 'Мен жауаптарыңа бейімделетін шамамен 14 сұрақ қоямын — дұрыс жауап берсең, келесісі қиынырақ болады. Шамамен 5 минут алады.',
    'test.start': 'Тестілеуді қазір бастау',
    'test.later': 'Кейінірек өтемін',
    'test.header': 'Тіл деңгейін тестілеу (CEFR)',
    'test.question': '{n}-сұрақ, барлығы {total}',
    'test.check': 'Тексеру',
    'test.readPassage': 'Мәтінді оқыңыз',
    'test.loading': 'Тест дайындалуда…',
    'test.errLoad': 'Қолжетімді сұрақтар жоқ',
    'result.great': 'Тамаша!',
    'result.determined': 'Сіздің деңгейіңіз анықталды',
    'result.wrong': 'Қате жауаптар',
    'result.correct': 'Дұрыс жауаптар',
    'result.continue': 'Жалғастыру',
    'err.send': 'Кодты жіберу мүмкін болмады. Қайталап көріңіз.',
    'err.otp': 'Қате код. Қайталап көріңіз',
  },
}

const I18nCtx = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('lang')
      if (saved && dict[saved]) return saved
    } catch (e) {
      /* ignore */
    }
    return 'ru'
  })

  const setLang = useCallback((l) => {
    setLangState(l)
    try {
      localStorage.setItem('lang', l)
    } catch (e) {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key, vars) => {
      let s = (dict[lang] && dict[lang][key]) ?? dict.ru[key] ?? key
      if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k])
      return s
    },
    [lang],
  )

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  return useContext(I18nCtx)
}
