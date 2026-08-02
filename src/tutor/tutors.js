// Единый реестр тьюторов. Экран выбора и все downstream-экраны берут имя/аватар
// отсюда, чтобы выбранный тьютор вёл обучение (а не хардкод «Спарк»).
// Имена — собственные (не переводятся). Тексты характеристик/описания/кнопок
// живут в словаре i18n по ключам tutor.<key>.* — см. src/i18n/dict.js.
// mood — эмоция орба-аватара в покое (кнопка «поболтать» на дашборде). Ключ из
// EMOTIONS (avatarEmotions.js). Это ЛИЦО ПЕРСОНАЖА, а не реакция на реплику:
// внутри разговора эмоция всё так же приходит тегом от агента.
export const TUTORS = [
  {
    key: 'luna',
    name: 'Луна',
    avatar: '/tutor/tutor-luna.png',
    traitColors: ['#ba29e2', '#21b398', '#c3c032'],
    mood: 'idle', // спокойная
  },
  {
    key: 'dexter',
    name: 'Декстер',
    avatar: '/tutor/tutor-dexter.png',
    traitColors: ['#2cbf45', '#4a40c3', '#c39520'],
    mood: 'angry', // злой

    // Персона матерится (см. PERSONA_OVERRIDE['bro'] в agent/agent.py) — метка
    // 18+ у имени во всех местах, где карточка тьютора показывается. Это именно
    // ПОМЕТКА, а не возрастной гейт: проверки возраста в приложении нет.
    adult: true,
  },
  {
    key: 'spark',
    name: 'Спарк',
    avatar: '/tutor/tutor-spark.png',
    traitColors: ['#ffa200', '#f12929', '#51a41e'],
    mood: 'happy', // радостный
  },
]

// Короткое приветствие в характере тьютора — образец голоса на экране выбора
// («Послушать голос X»). Английский: тьютор говорит по-английски, а озвучка
// раскрывает тембр (Gemini для Луны/Декстера, Soniox для Спарка).
export const TUTOR_GREETING = {
  luna: "Hi, I'm Luna. Take a deep breath — we'll go gently, at your own pace. No pressure here.",
  dexter:
    "Yo, wassup! I'm Dexter. Chill, we're just gonna talk — no textbooks, no damn stress. Let's get it.",
  spark: "Yo! I'm Spark! Let's go — you've got this! Ready to level up? Let's crush it!",
}

// Тьютор по умолчанию (если пользователь ещё не выбрал). Спарк — им же
// инициализируется tutorKey в App.jsx и фолбэки всех экранов.
export const DEFAULT_TUTOR = TUTORS.find((t) => t.key === 'spark')

export function getTutor(key) {
  return TUTORS.find((t) => t.key === key) || DEFAULT_TUTOR
}
