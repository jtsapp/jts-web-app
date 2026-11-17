import { loadToken, reportUnauthorized } from './session.js'

// Заголовки STOMP CONNECT. Access-токен мог обновиться в localStorage
// (restoreSession / refresh), пока React ещё держит старый prop: без свежего
// Bearer брокер принимает CONNECT без пользователя, подписки молча отбрасывает,
// и в уроке все выглядят «вне сети».

/** Токен для сокета: свежий из хранилища, иначе тот, что пришёл пропом. */
function currentToken(token) {
  return loadToken() || token || null
}

export function stompConnectHeaders(token) {
  const latest = currentToken(token)
  return latest ? { Authorization: `Bearer ${latest}` } : {}
}

// ─── Отказ в токене ─────────────────────────────────────────────────────────
//
// С 16.11 бэкенд не пускает CONNECT с негодным токеном (просрочен, ученическая сессия
// закрыта входом с другого устройства, пользователь выключен): шлёт ERROR-кадр с этим
// текстом и закрывает сокет (StompAuthChannelInterceptor.REJECTED_MESSAGE). stompjs после
// закрытия переподключается через reconnectDelay — и приходил с тем же мёртвым токеном
// снова, бесконечно: 17.11 на проде одна вкладка открывала по два сокета каждые 1–3 с.
//
// Теперь после отказа подключение ждёт: 5 с, на каждый следующий отказ подряд вдвое
// дольше, не больше 5 минут. Ждёт, только пока в хранилище лежит тот же токен: как только
// сессия его обновит, сокет подключается с новым в пределах секунды. Сам отказ уходит в
// reportUnauthorized — та же точка, куда api.js сообщает о 401: сессия проверит токен,
// обновит его по refresh или закончит вход. Без этого вкладка, где REST молчит (только
// колокольчик и пульс), сидела бы с отвергнутым токеном, пока её не перезагрузят.

export const STOMP_TOKEN_REJECTED = 'Invalid or expired token'
const REJECTED_FIRST_PAUSE_MS = 5_000
const REJECTED_MAX_PAUSE_MS = 5 * 60_000
const TOKEN_CHECK_MS = 1_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Настройки для конструктора Client из @stomp/stompjs: свежий Bearer на каждом CONNECT и пауза
 * после отказа в токене. Свои beforeConnect / onConnect / onStompError вызывающего
 * сохраняются и зовутся после здешних.
 */
export function withStompAuth(token, options) {
  let sentToken = null
  let rejectedToken = null
  let rejectionsInRow = 0

  async function waitAfterRejection(client) {
    if (!rejectedToken) return
    const pause = Math.min(REJECTED_FIRST_PAUSE_MS * 2 ** (rejectionsInRow - 1), REJECTED_MAX_PAUSE_MS)
    const until = Date.now() + pause
    while (client.active && currentToken(token) === rejectedToken && Date.now() < until) {
      await sleep(Math.min(TOKEN_CHECK_MS, until - Date.now()))
    }
  }

  return {
    ...options,
    connectHeaders: stompConnectHeaders(token),
    // stompjs ждёт промис beforeConnect и после него сам не подключается, если клиент уже выключен.
    beforeConnect: async (client) => {
      await waitAfterRejection(client)
      client.connectHeaders = stompConnectHeaders(token)
      sentToken = currentToken(token)
      await options.beforeConnect?.(client)
    },
    onConnect: (frame) => {
      rejectedToken = null
      rejectionsInRow = 0
      options.onConnect?.(frame)
    },
    onStompError: (frame) => {
      if (frame?.headers?.message === STOMP_TOKEN_REJECTED && sentToken) {
        rejectedToken = sentToken
        rejectionsInRow += 1
        reportUnauthorized(sentToken)
      }
      options.onStompError?.(frame)
    },
  }
}
