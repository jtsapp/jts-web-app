// Единый источник правды для адреса JTS-бэкенда (регистрация/вход, /user/me,
// монеты и сердца за уроки). Раньше адрес читался в трёх местах независимо
// (src/api.js, src/lib/auth-server.js, мост в src/app/api/hl) — расходились.
//
// Дефолт по умолчанию — dev-server (тот же, что читает dev-админка), чтобы
// локальная разработка работала без настройки env. В ПРОДЕ обязательно задать
// NEXT_PUBLIC_API_URL (и при нужде BACKEND_URL) в env Vercel — иначе живые
// регистрации молча уходят в dev-базу.
//
// NEXT_PUBLIC_API_URL вшивается в клиентский бандл на этапе сборки; то же
// значение переиспользуется на сервере, если BACKEND_URL не задан отдельно.

// BOM/пробелы/хвостовые слэши из env вырезаем: значение, вставленное через
// Windows-пайп, приходит с U+FEFF (BOM) в начале — fetch падает «Invalid URL»,
// и каждый Bearer превращался в 401 «сессия истекла» на всём проде
// (поймано 17.07.2026). Теперь чистка общая для всех трёх точек.
function clean(url) {
  return String(url)
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\/+$/, '')
}

const DEV_DEFAULT = 'https://dev-server.justtostudy.kz'

// Клиент видит только NEXT_PUBLIC_* — server-only BACKEND_URL в браузере
// становится undefined, поэтому клиент всегда падает на NEXT_PUBLIC_API_URL.
export const API_URL = clean(process.env.NEXT_PUBLIC_API_URL || DEV_DEFAULT)

// Сервер может переопределить адрес через BACKEND_URL (например, внутренний
// хост), иначе берёт тот же публичный NEXT_PUBLIC_API_URL.
export const SERVER_API_URL = clean(
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || DEV_DEFAULT,
)
