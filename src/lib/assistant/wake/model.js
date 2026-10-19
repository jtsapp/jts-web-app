// Адреса моделей позывного на сайте. Файлы кладёт сборка (scripts/fetch-wake-model.js):
// в git их нет — 45 и 60 МБ. Имя — с версией модели: vosk-browser кэширует распакованную
// модель в IndexedDB по адресу, и новая версия модели обязана быть новым адресом.
//
// Русская — для Луны, казахская — для Айзере (помощник при казахском интерфейсе,
// matchWake.js): ученик качает одну, ту, чьё имя зовёт.
export const WAKE_MODELS = {
  ru: '/assistant/wake/vosk-model-small-ru-0.22.tar.gz',
  kk: '/assistant/wake/vosk-model-small-kz-0.42.tar.gz',
}

export const WAKE_MODEL_URL = WAKE_MODELS.ru
