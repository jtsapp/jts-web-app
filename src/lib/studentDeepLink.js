// In-app notification deep links are stored as a single string. Teachers get
// admin routes (`/system/...`); students get screen keys (`homework`). This
// mapper accepts both so a student can open a bell item written for either app.

export function notificationTarget(deepLink) {
  if (!deepLink || typeof deepLink !== 'string') return { screen: null, payload: null }
  const trimmed = deepLink.trim()
  const live = trimmed.match(/\/system\/schedule\/(\d+)\/workspace/)
  if (live) return { screen: 'lessons', payload: { lessonId: Number(live[1]) } }
  if (trimmed === 'homework' || trimmed.includes('homework')) return { screen: 'homework', payload: null }
  if (trimmed === 'learning' || trimmed.includes('learning')) return { screen: 'learning', payload: null }
  if (
    trimmed === 'lessons'
    || trimmed.includes('schedule')
    || trimmed.includes('lesson')
  ) {
    return { screen: 'lessons', payload: null }
  }
  return { screen: null, payload: null }
}
