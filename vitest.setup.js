/**
 * Web Storage в jsdom-тестах — хранилище jsdom, а не рантайма.
 *
 * С Node 25 у самого Node есть глобальный `localStorage`: Web Storage включили
 * по умолчанию. Без `--localstorage-file` это объект без методов, и в тестах
 * побеждает он, а не хранилище jsdom. Итог — `localStorage.clear is not a
 * function` в 208 тестах из 23 файлов. Так упала стадия test в CI: раннер
 * гоняет тесты на Node 25, а локально стоит 24, где всё зелёное.
 *
 * Флаг `--no-experimental-webstorage` не годится: Node 20, на котором собран
 * прод-образ, не принимает его в NODE_OPTIONS и не запускается вовсе.
 *
 * vitest кладёт экземпляр JSDOM в глобал `jsdom` только в окружении jsdom —
 * в node-окружении окна нет, и подменять там нечего.
 */
import { beforeEach } from 'vitest'

// Память прогресса «Практики» (src/practice/progressStore.js) живёт в модуле и
// переживает localStorage.clear() между тестами. Сбросы она кладёт в глобал, а
// не экспортом: импорт хранилища отсюда загрузил бы настоящий practiceSync
// раньше моков тестового файла.
beforeEach(() => {
  globalThis.__jtsPracticeStores?.forEach((fn) => fn())
})

if (typeof globalThis.jsdom !== 'undefined') {
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, name, {
      value: globalThis.jsdom.window[name],
      configurable: true,
      writable: true,
    })
  }
}
