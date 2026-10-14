// Куда увести ученика с аккаунтом IELTS / SAT с открытого экрана (App.jsx). null — экран остаётся.
//
// До 13.10.2026 тропа «Повторения» (kingdom*) у такого ученика уводила в IELTS: курса General English у него не было.
// Владелец вернул пункт «Повторение» (Review) в меню учеников IELTS и SAT (SAT-SYNC-PLAN E3), и редирект делал
// пункт мёртвым — нажатие открывало IELTS. Поэтому kingdom* больше не уводим. Остаётся только письменный тест уровня
// General English на входе без CEFR: ученику экзамена он не нужен, его старт — «Главная».
export function ieltsAccountRedirect(ieltsAccount, screen) {
  if (!ieltsAccount) return null
  if (screen === 'test-intro') return 'home'
  return null
}
