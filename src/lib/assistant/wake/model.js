// Адрес модели позывного на сайте. Файл кладёт сборка (scripts/fetch-wake-model.js):
// в git его нет — 45 МБ. Имя — с версией модели: vosk-browser кэширует распакованную
// модель в IndexedDB по адресу, и новая версия модели обязана быть новым адресом.
export const WAKE_MODEL_URL = '/assistant/wake/vosk-model-small-ru-0.22.tar.gz'
