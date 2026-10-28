// Кто помощник по сайту: Луна, а при казахском интерфейсе — Айзере (19.10.2026,
// решение владельца). Айзере — казахскоязычный тьютор Speaking Buddy: её голос
// (клон ElevenLabs «zere», tutorVoice.js) по-казахски звучит естественно, а Луна
// говорит казахский чужим синтезом (у Gemini казахского нет — фраза уходила в
// Soniox «Grace»). Персона идёт за языком интерфейса, а не за языком вопроса:
// ученик в казахском интерфейсе, спросивший по-русски, говорит всё с той же Айзере.
//
// Модуль общий для браузера и сервера: виджет берёт отсюда аватар и запасной
// голос, роуты — голос синтеза, звонок — тьютора агента, промпт — имя и тон.
// Строки окна (имя, приветствие, подписи) живут в i18n: казахский словарь и есть
// словарь Айзере.

export const PERSONAS = {
  luna: {
    id: 'luna',
    name: 'Луна',
    // Дательный для базы знаний промпта («напишите помощнику Луне»).
    nameDat: 'Луне',
    // Пример позывного для модели (prompt.js, пометка WAKE_MARK).
    wakeExample: 'Привет, Луна',
    avatar: '/assets/luna-assistant.webp',
    // Запасной потоковый голос (/api/tts, Soniox) — откатный голос Луны у агента.
    fallbackVoice: 'Grace',
    // Свой голос Луны (Gemini «Aoede») казахского не знает: казахская фраза
    // сразу идёт запасным потоком (voiceQueue.js).
    speaksKazakh: false,
    // Тьютор агента в звонке помощнику (agent.py, run_assistant_call).
    callTutor: 'gentle',
  },
  aizere: {
    id: 'aizere',
    name: 'Айзере',
    // По-русски имя не склоняется.
    nameDat: 'Айзере',
    wakeExample: 'Сәлем, Айзере',
    avatar: '/assets/aizere-assistant.webp',
    // Откатный голос Айзере у агента (SONIOX_TTS_VOICE): женский, не Owen-Спарк.
    fallbackVoice: 'Maya',
    // Её клон ElevenLabs (eleven_v4_turbo) говорит по-казахски сам.
    speaksKazakh: true,
    callTutor: 'aizere',
  },
}

/** Персона помощника для языка интерфейса ('ru' | 'en' | 'kk'). */
export function assistantPersona(lang) {
  return lang === 'kk' ? PERSONAS.aizere : PERSONAS.luna
}

/** Персона по id из запроса; чужое — Луна (белый список, как у голосов /api/tts). */
export function personaById(id) {
  return PERSONAS[id] || PERSONAS.luna
}
