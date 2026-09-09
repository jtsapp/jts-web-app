import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Имя в шапке и в профиле берётся из состояния App (`name`), а не из снимка в
// localStorage. Снимок пишут все обработчики входа, а состояние — писал только
// вход через Google: после входа по паролю или по коду сайдбар весь сеанс
// показывал «Профиль», профиль — «Без имени», и имя появлялось лишь после F5
// (там его ставит restoreSession). Жалоба владельца 08.09.2026.
//
// Тест читает исходник текстом: обработчики — методы внутри компонента на
// полторы тысячи строк, отрендерить их ради одной строки дороже, чем проверить
// её наличие. Предмет проверки — что ни один путь входа не забыл `setName`.

const src = dirname(fileURLToPath(import.meta.url))
// Комментарии выкидываем: они здесь же и объясняют, зачем строка нужна, —
// упоминание `setName` в объяснении не должно считаться за сам вызов.
const app = readFileSync(join(src, 'App.jsx'), 'utf8')
  // На Windows git отдаёт файл с CRLF, и \r оставался в хвосте каждой строки:
  // проверки, где перевод строки стоит в самой регулярке, переставали совпадать.
  // Нормализуем при чтении, а не по одной регулярке — иначе следующая такая
  // проверка сломается снова и опять только у половины команды.
  .replace(/\r\n/g, '\n')
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n')

/** Тело функции-обработчика: от её объявления до следующего объявления. */
function handler(name) {
  const start = app.indexOf(`async function ${name}(`)
  expect(start, `${name} не найден в App.jsx`).toBeGreaterThan(-1)
  const rest = app.slice(start + 1)
  const end = rest.search(/\n  (?:async )?function /)
  return end === -1 ? rest : rest.slice(0, end)
}

const HANDLERS = ['handleOtpSubmit', 'handlePasswordLogin', 'handleGoogleCredential']

describe('вход: имя доезжает до состояния, а не только до снимка', () => {
  for (const name of HANDLERS) {
    it(`${name} ставит имя из ответа бэкенда`, () => {
      const body = handler(name)
      // Тело не должно захватывать соседей — иначе чужой setName сойдёт за свой.
      for (const other of HANDLERS) {
        if (other !== name) expect(body).not.toContain(`function ${other}(`)
      }
      expect(body).toMatch(/setName\(\s*(?:data|chatName)/)
      // Снимок и состояние обязаны получать одно и то же значение — иначе F5
      // менял бы показанное имя.
      expect(body).toMatch(/saveUserSnapshot\(/)
    })
  }

  it('экран входа сбрасывает имя перед вводом — поэтому его и надо вернуть', () => {
    expect(app).toMatch(/setName\(''\)\n\s*setScreen\('login-password'\)/)
  })
})
