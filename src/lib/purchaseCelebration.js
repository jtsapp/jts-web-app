// Когда показывать «Поздравляем с покупкой!».
//
// Своей оплаты у приложения нет: человек договаривается с менеджером, тот
// заводит абонемент и снимает демо-флаг в админке (AdminUserService.setDemoAccount).
// Единственное наблюдаемое событие «покупка состоялась» — то, что аккаунт,
// который был демо, перестал им быть. Его и ловим: помним прошлое состояние и
// сравниваем с текущим.
//
// Придумывать событие честнее нечем: показывать окно по возвращению с витрины
// значило бы поздравлять с покупкой того, кто ничего не оплатил.

const KEY = 'jts_was_demo'

function safeStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // приватный режим / политика браузера
  }
}

/**
 * Запоминает демо-статус и говорит, случился ли переход «демо → полный доступ».
 *
 * @param {boolean} isDemo   текущий статус
 * @param {Storage|null} store хранилище (в тестах — свой объект)
 * @returns {boolean} true ровно один раз — в момент перехода
 */
export function trackDemoState(isDemo, store = safeStorage()) {
  if (!store) return false
  try {
    const was = store.getItem(KEY) === '1'
    if (isDemo) {
      store.setItem(KEY, '1')
      return false
    }
    // Отметку снимаем сразу: поздравить надо один раз, а не на каждом рендере.
    if (was) store.removeItem(KEY)
    return was
  } catch {
    return false
  }
}

/** Выход из аккаунта: следующий вход не должен ловить чужой переход. */
export function forgetDemoState(store = safeStorage()) {
  try {
    store?.removeItem(KEY)
  } catch {
    /* нечего чистить */
  }
}
