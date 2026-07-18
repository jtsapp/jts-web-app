// Единый реестр тьюторов. Экран выбора и все downstream-экраны берут имя/аватар
// отсюда, чтобы выбранный тьютор вёл обучение (а не хардкод «Спарк»).
// Имена — собственные (не переводятся). Тексты характеристик/описания/кнопок
// живут в словаре i18n по ключам tutor.<key>.* — см. src/i18n/dict.js.
export const TUTORS = [
  {
    key: 'luna',
    name: 'Луна',
    avatar: '/tutor/tutor-luna.png',
    traitColors: ['#ba29e2', '#21b398', '#c3c032'],
  },
  {
    key: 'dexter',
    name: 'Декстер',
    avatar: '/tutor/tutor-dexter.png',
    traitColors: ['#2cbf45', '#4a40c3', '#c39520'],
  },
  {
    key: 'spark',
    name: 'Спарк',
    avatar: '/tutor/tutor-spark.png',
    traitColors: ['#ffa200', '#f12929', '#51a41e'],
  },
]

// Короткое приветствие в характере тьютора — образец голоса на экране выбора
// («Послушать голос X»). Английский: тьютор говорит по-английски, а озвучка
// раскрывает тембр (Gemini для Луны/Декстера, Soniox для Спарка).
export const TUTOR_GREETING = {
  luna: "Hi, I'm Luna. Take a deep breath — we'll go gently, at your own pace. No pressure here.",
  dexter:
    "Hey, I'm Dexter! Learning English is going to be fun — let's explore it together, one step at a time.",
  spark: "Yo! I'm Spark! Let's go — you've got this! Ready to level up? Let's crush it!",
}

// Тьютор по умолчанию (если пользователь ещё не выбрал).
export const DEFAULT_TUTOR = TUTORS[0]

export function getTutor(key) {
  return TUTORS.find((t) => t.key === key) || DEFAULT_TUTOR
}
