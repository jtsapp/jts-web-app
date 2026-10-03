// Строки SpeakSpin, которых нет в прототипе: в нём разбор был выключен, и
// ответов нашего сервера (лимит, вход, короткая запись) он не знал. Остальные
// строки — strings.json из прототипа. Казахский писал не носитель, нужна
// вычитка.
export const EXTRA_STRINGS = {
  loginToAnalyze: {
    en: 'Sign in to get AI feedback. You can still listen to your recording, download it or try again.',
    ru: 'Войди в аккаунт, чтобы получить ИИ-разбор. Запись можно прослушать, скачать или перезаписать.',
    kk: 'ЖИ талдауын алу үшін аккаунтқа кір. Жазбаны тыңдауға, жүктеуге немесе қайта жазуға болады.',
  },
  dailyLimit: {
    en: 'You have used today’s AI feedback limit. It resets tomorrow; your recording is still here.',
    ru: 'Лимит ИИ-разборов на сегодня исчерпан. Он обновится завтра, запись осталась здесь.',
    kk: 'Бүгінгі ЖИ талдау лимиті таусылды. Ол ертең жаңарады, жазба осында қалды.',
  },
  tooShort: {
    en: 'The recording is too short to assess. Record a longer answer.',
    ru: 'Запись слишком короткая для разбора. Запиши ответ подлиннее.',
    kk: 'Жазба талдау үшін тым қысқа. Ұзағырақ жауап жаз.',
  },
  notConfigured: {
    en: 'AI feedback is temporarily unavailable. Your recording is still here.',
    ru: 'ИИ-разбор временно недоступен. Запись осталась здесь.',
    kk: 'ЖИ талдауы уақытша қолжетімсіз. Жазба осында қалды.',
  },
}
