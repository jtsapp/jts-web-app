import { loadToken } from './session.js'

// Заголовки STOMP CONNECT. Access-токен мог обновиться в localStorage
// (restoreSession / refresh), пока React ещё держит старый prop: без свежего
// Bearer брокер принимает CONNECT без пользователя, подписки молча отбрасывает,
// и в уроке все выглядят «вне сети».

export function stompConnectHeaders(token) {
  const latest = loadToken() || token
  return latest ? { Authorization: `Bearer ${latest}` } : {}
}
