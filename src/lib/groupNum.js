// 1253 → «1 253» (как в мобильном HUD). Общий у сайдбара и «Сервисов».
export function groupNum(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
