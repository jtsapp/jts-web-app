// Мост «тест v16 в iframe ↔ приложение». Автор оставил хосту крючки (комментарии PHASE 2/3 в html):
//   JTSPlacementConfig.onComplete(payload)          — итог показан (один раз за попытку);
//   JTSPlacementConfig.openLearning(envelope, ctx)  — ученик нажал «продолжить» на итоге;
//   JTSPlacementConfig.openPracticeActivity(rec)    — нажал задание из рекомендаций;
//   JTSPlacementConfig.navigate(d)                  — кнопка раздела на итоге (d.section);
//   JTSSpeakingBuddy.start(args)                    — экран говорения просит провести разговор.
// Iframe с того же адреса (public/placement/v16/), поэтому крючки кладутся прямо в его window — postMessage не нужен.
//
// «Главной» нужен полный конверт (с анкетой и рекомендациями). openLearning получает его от теста сам; onComplete
// несёт урезанный payload прежнего формата, а задание и раздел — ничего, — для них конверт читаем из состояния теста
// (JTSPersonalizedResults.getPayload()).

/** Название главной цели на трёх языках из конфигурации анкеты — в конверте только её id. */
export function goalLabel(win, goalId) {
  if (!goalId) return null
  try {
    for (const c of win.JTSStudentGoals?.getConfiguration?.()?.categories || []) {
      const g = (c.goals || []).find((x) => x.id === goalId)
      if (g?.label) return { ru: g.label.ru || null, kk: g.label.kk || null, en: g.label.en || null }
    }
  } catch {
    /* конфигурации нет — отчёт обойдётся без названия цели */
  }
  return null
}

/** Конверт с пометкой хоста: название главной цели (в конверте только её id) и время сохранения. */
export function withHost(win, env, now = () => new Date()) {
  if (!env || typeof env !== 'object') return null
  return { ...env, host: { goalLabel: goalLabel(win, env.goals?.primaryGoal), savedAt: now().toISOString() } }
}

/** Полный конверт из состояния теста (для событий, которые несут урезанный payload или не несут его вовсе). */
export function readEnvelope(win, now) {
  let env = null
  try {
    env = win.JTSPersonalizedResults?.getPayload?.() || null
  } catch {
    env = null
  }
  return withHost(win, env, now)
}

/**
 * Ставит крючки в окно теста. handlers: { onResult(env), onContinue(env), onActivity(rec), onSection(section),
 * startSpeaking(args) → Promise }. Возвращает функцию снятия.
 */
export function installBridge(win, handlers) {
  if (!win) return () => {}
  const prev = win.JTSPlacementConfig || {}
  win.JTSPlacementConfig = {
    ...prev,
    // Итог отрисовывается следом за вызовом — конверт читаем на следующем тике, когда автор допишет метки итога.
    onComplete: () => {
      setTimeout(() => {
        const env = readEnvelope(win)
        if (env) handlers.onResult?.(env)
      }, 0)
    },
    openLearning: async (payload) => {
      const env = withHost(win, payload) || readEnvelope(win)
      await handlers.onContinue?.(env)
      // Подтверждаем только то, что сделали: сохранили и уводим со страницы теста.
      return { accepted: true, persisted: true, navigated: true }
    },
    openPracticeActivity: async (rec) => {
      const env = readEnvelope(win)
      await handlers.onActivity?.(rec, env)
      return { navigated: true }
    },
    navigate: (d) => {
      handlers.onSection?.(d?.section, readEnvelope(win))
    },
  }
  win.JTSSpeakingBuddy = { start: (args) => handlers.startSpeaking(args) }
  return () => {
    try {
      delete win.JTSSpeakingBuddy
      win.JTSPlacementConfig = prev
    } catch {
      /* окно уже выгружено */
    }
  }
}
