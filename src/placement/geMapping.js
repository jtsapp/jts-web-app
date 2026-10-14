// Анкета теста v16 → профиль General English (PUT /mobile/ge/profile). С 14.10.2026 анкета теста заменила нашу
// анкету «Главной» (решение владельца), а маршрут, срок и план по дням бэкенд по-прежнему считает из профиля GE —
// поэтому ответы v16 переводятся в его наборы. Наборы обязаны совпадать с GeProfileRules бэкенда (src/ge/onboarding.js),
// иначе PUT ответит 400 на наше же значение.

import { PURPOSES, DAILY, DAILY_DEFAULT, recommendedTarget, targetTiles } from '../ge/onboarding.js'

// Категория цели v16 → «зачем» нашей анкеты. Разговор, развлечения и «для себя» — это self: у нашей анкеты нет
// отдельных плиток под них, а рекомендованная цель у self та же, что у поездок (B1).
const PURPOSE_BY_CATEGORY = {
  career: 'work',
  education: 'study',
  travel: 'travel',
  communication: 'self',
  entertainment: 'self',
  personal: 'self',
  custom: 'self',
}

// «Больше года», «пока не знаю» и «свой срок» (свободный текст) — без срока: угадывать дату из текста не берёмся.
const WINDOW_BY_DEADLINE = {
  '1_3_months': '1-3m',
  '3_6_months': '3-6m',
  '6_12_months': '6-12m',
}

// «Несколько раз в неделю» — в среднем меньше получаса в день; «другое» — значение по умолчанию.
const DAILY_BY_AVAILABILITY = {
  daily_10_15: 15,
  daily_20_30: 30,
  daily_45_60: 60,
  several_weekly: 15,
}

/** Категория главной цели: из выбранной цели, иначе первая выбранная категория. */
function primaryCategory(goals) {
  const subs = Array.isArray(goals?.selectedSubcategories) ? goals.selectedSubcategories : []
  const main = subs.find((s) => s?.id === goals?.primaryGoal) || subs[0]
  if (main?.categoryId) return main.categoryId
  return Array.isArray(goals?.selectedCategories) ? goals.selectedCategories[0] || null : null
}

export function purposeFromGoals(goals) {
  const p = PURPOSE_BY_CATEGORY[primaryCategory(goals)]
  return PURPOSES.some((x) => x.id === p) ? p : 'self'
}

/**
 * Тело PUT /mobile/ge/profile или null, если цель ставить некуда (уровень C1 и выше — плиток выше нет).
 * level — уровень аккаунта ПОСЛЕ теста: тарифный, если он был, иначе тот, что поставил тест.
 *
 * Цель — targetCEFR правил v16, если она выше уровня; v16 отдаёт и цель «уже достигнута» (ученик B1 с целью
 * поездок получает B1), а наша плитка обязана быть выше текущего уровня — тогда берём рекомендацию нашей анкеты.
 */
export function geProfileBody(envelope, level) {
  const goals = envelope?.goals || {}
  const purpose = purposeFromGoals(goals)
  const tiles = targetTiles(level)
  const proposed = envelope?.recommendations?.targetCEFR
  const target = tiles.some((t) => t.code === proposed && t.enabled) ? proposed : recommendedTarget(purpose, level)
  if (!target) return null
  const deadline = goals.targetDeadline?.optionId ?? goals.targetDeadline?.value ?? null
  const daily = DAILY_BY_AVAILABILITY[envelope?.preferences?.availableStudyTime]
  return {
    purpose,
    targetLevel: target,
    deadlineDate: null,
    deadlineWindow: WINDOW_BY_DEADLINE[deadline] || 'none',
    dailyMinutes: DAILY.includes(daily) ? daily : DAILY_DEFAULT,
    startMode: null,
  }
}
