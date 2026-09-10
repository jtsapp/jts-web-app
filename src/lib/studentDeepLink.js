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

/**
 * Юнит «Практики» из адресной строки: `?screen=practice&level=a2&unit=3`.
 *
 * Ссылку строит АДМИНКА: преподаватель выдал юнит на дом и должен уметь
 * открыть ровно его, чтобы увидеть, что задал. Раньше попасть в конкретный
 * юнит можно было только из домашней работы ученика (HomeworkPracticeList),
 * то есть только из ученического аккаунта.
 *
 * `unit` возвращаем СТРОКОЙ, как он пришёл: каталог сверяет номера через
 * `String(...)`, а `Number('')` дал бы 0 — существующий номер юнита.
 */
export function practiceUnitTarget(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  if (!params || typeof params.get !== 'function') return null
  const level = (params.get('level') || '').trim().toLowerCase()
  const unit = (params.get('unit') || '').trim()
  // Оба нужны: уровень входит в адрес юнита, а не только в его показ —
  // «Unit 3» уровня A2 и «Unit 3» уровня B1 разные задания.
  if (!level || !unit) return null
  return { level, unitId: unit }
}
