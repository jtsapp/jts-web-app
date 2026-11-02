/**
 * Пройден ли старт SAT и пора ли показывать вкладки. Ученику нужны главы об экзамене и диагностика (просьба владельца
 * 13.10.2026); клоузер (`showcase` от сервера) показывает SAT на пробном и идёт к вкладкам сразу. Без доступа — никому.
 */
export function satStarted(me) {
  if (!me || !me.access) return false
  return !!me.showcase || (!!me.onboarded && !!me.diagnosticDone)
}
