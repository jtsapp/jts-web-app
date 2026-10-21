// Адрес JTS-бэкенда для браузера. Отдельным модулем, а не экспортом из api.js:
// экраны в тестах мокают api.js целиком, и загрузчик Практики, импортирующий
// адрес оттуда, падал бы на «нет такого экспорта». BOM и хвостовой слэш
// вырезаем — та же грабля, что у BACKEND_URL на сервере (auth-server.js).
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz')
  .replace(/^﻿/, '')
  .trim()
  .replace(/\/+$/, '')
