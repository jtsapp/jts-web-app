import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Сторож клиентского бандла.
//
// Всё, что лежит в src/ вне серверных роутов, уезжает в браузер: исходники
// вкладки открываются любым, кто нажмёт «просмотр кода». Пароль общего
// демо-аккаунта жил там ровно так — значением по умолчанию рядом с
// NEXT_PUBLIC_DEMO_PASSWORD, — и префикс NEXT_PUBLIC_ этого не менял, а
// закреплял: он и значит «вшить в бандл».
//
// Токен и пароль тут не равнозначны. Токен протухает и годится только этому
// приложению; паролем входят в аккаунт откуда угодно — мобилкой, формой
// входа — и меняют его. Поэтому пара живёт на сервере
// (src/app/api/practice/demo-token/route.js), а наружу уходит токен.
//
// Тест смотрит на ИСХОДНИКИ, а не на собранный бандл: сборка занимает минуты,
// а промах видно и так — переменная с префиксом NEXT_PUBLIC_ по определению
// публична, где бы её ни прочитали.

const src = dirname(fileURLToPath(import.meta.url))

/** Серверные роуты Next: их код в браузер не уезжает. */
const СЕРВЕРНЫЕ = [join('app', 'api') + sep, join('lib', 'auth-server.js'), join('lib', 'db') + sep]

function клиентскиеФайлы(dir = src, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) клиентскиеФайлы(path, acc)
    else if (/\.jsx?$/.test(entry.name) && !entry.name.includes('.test.')) acc.push(path)
  }
  return acc
}

const файлы = клиентскиеФайлы()
  .filter((path) => !СЕРВЕРНЫЕ.some((s) => path.slice(src.length + 1).startsWith(s)))
  .map((path) => [path.slice(src.length + 1), readFileSync(path, 'utf8')])

/** Строки кода без комментариев: объяснение «как было» — не секрет. */
function кодБезКомментариев(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n')
}

describe('клиентский код не носит учётных данных', () => {
  it('переменных NEXT_PUBLIC_DEMO_* больше нет ни в одном файле', () => {
    const виновные = файлы
      .filter(([, text]) => кодСодержит(text, 'NEXT_PUBLIC_DEMO'))
      .map(([path]) => path)
    expect(виновные).toEqual([])
  })

  it('пароля демо-аккаунта в клиентском коде нет', () => {
    const виновные = файлы
      .filter(([, text]) => кодСодержит(text, 'password123'))
      .map(([path]) => path)
    expect(виновные).toEqual([])
  })

  // Обратная сторона: витрина обязана продолжать работать. Токен гость берёт у
  // сервера, и если ручку переименуют, а клиент забудут — гость молча
  // останется без серверной части раздела.
  it('гостевой токен запрашивается у серверной ручки', () => {
    const api = файлы.find(([path]) => path === 'api.js')
    expect(api).toBeTruthy()
    expect(api[1]).toContain('/api/practice/demo-token')
  })
})

function кодСодержит(text, needle) {
  return кодБезКомментариев(text).includes(needle)
}
