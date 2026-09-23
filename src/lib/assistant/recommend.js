// Рекомендация дня для карточки «Главной» — что сделать и почему, с переходом
// в нужный раздел по клику.
//
// Чистая функция без единого сетевого вызова и без ИИ: все данные ей уже несёт
// HomePage (levelSummary, домашка, расписание — те же запросы, что рисуют
// остальные карточки экрана). Поэтому у карточки нет ни задержки, ни цены, ни
// риска упереться в лимит помощника (rateLimit.js) — она просто не вызывает
// модель. За развёрнутый план с объяснением — отдельно, в чате помощника
// (AssistantWidget), там уже есть свой лимит на вопрос.
//
// Правило одно: показывать только то, что подтверждено данными. Раньше карточка
// «Практика на сегодня» была нарочно без подборки (см. комментарий
// PracticeToday в HomePage.jsx) — «подборки на бэкенде нет … изобретать её на
// клиенте значило бы выдавать случайный выбор за рекомендацию». Теперь сигнал
// есть (навыки, домашка, расписание), но принцип тот же: без сигнала —
// рекомендации нет, а не выдумка.

// Домашка «горит», если сдавать нужно в ближайшие двое суток.
const DUE_SOON_MS = 48 * 60 * 60 * 1000
// Хуже 60% — уже повод потренировать навык (та же граница, что красит полосу
// оранжевым в HomePage.jsx, см. band()).
const WEAK_SKILL_MAX_PERCENT = 60
// Нет занятия дольше двух недель — повод предложить голосовую практику.
const NO_LESSON_GAP_MS = 14 * 24 * 60 * 60 * 1000

const OPEN_HOMEWORK_STATUSES_DONE = new Set(['SUBMITTED', 'CHECKED', 'COMPLETED', 'GRADED'])

// Куда ведёт тренировка каждого навыка — те же экраны, что и у остальных
// ссылок на «Главной» (PracticeToday, меню). 'speaking' ведёт в Speaking Buddy:
// там разговорная практика, а не в «Ситуации» — тот раздел один из нескольких.
const SKILL_NAV = {
  listening: { to: 'listening' },
  reading: { to: 'reading' },
  writing: { to: 'writing' },
  vocab: { to: 'vocab' },
  grammar: { to: 'practice', payload: { filter: 'grammar' } },
  speaking: { to: 'tutor' },
}

const dueTime = (h) => {
  const t = h?.dueDate ? new Date(h.dueDate).getTime() : NaN
  return Number.isNaN(t) ? Infinity : t
}

const isOpenHomework = (h) => !OPEN_HOMEWORK_STATUSES_DONE.has(String(h?.status || '').toUpperCase())

/**
 * Одна рекомендация по приоритету — или null, если сигнала недостаточно.
 *
 * @param {{ summary: { weakest: {skill: string, percent: number}|null },
 *           homework?: object[], occurrences?: object[], now?: number }} args
 * @returns {{ reasonKey: string, reasonVars?: object, ctaKey: string,
 *             nav: { to: string, payload?: object } } | null}
 */
export function pickRecommendation({ summary, homework = [], occurrences = [], now = Date.now() }) {
  // 1. Домашка горит — важнее тренировки: срыв срока стоит дороже, чем
  // упущенный день практики.
  const open = (homework || []).filter(isOpenHomework)
  const soonest = open.length
    ? open.reduce((a, b) => (dueTime(a) < dueTime(b) ? a : b))
    : null
  if (soonest && dueTime(soonest) - now <= DUE_SOON_MS) {
    const overdue = dueTime(soonest) < now
    return {
      reasonKey: overdue ? 'home.recommend.hwOverdue' : 'home.recommend.hwSoon',
      ctaKey: 'home.recommend.hwCta',
      nav: { to: 'homework' },
    }
  }

  // 2. Слабый навык — тренажёр этого навыка. Порог confidence уже встроен в
  // levelSummary.weakest (см. lib/levelProgress.js: ranked[weakest] считается
  // только если есть разброс), здесь добавляется только числовой порог.
  const weak = summary?.weakest
  if (weak && SKILL_NAV[weak.skill] && weak.percent < WEAK_SKILL_MAX_PERCENT) {
    return {
      reasonKey: 'home.recommend.weakSkill',
      reasonVars: { skill: weak.skill },
      ctaKey: 'home.recommend.weakSkillCta',
      nav: SKILL_NAV[weak.skill],
    }
  }

  // 3. Давно не было живого занятия — предложить голосовую практику вместо
  // молчания. Считаем по последнему занятию в прошлом, если такое было.
  const past = (occurrences || [])
    .map((o) => new Date(o?.scheduledAt).getTime())
    .filter((t) => Number.isFinite(t) && t <= now)
  if (past.length) {
    const lastLesson = Math.max(...past)
    if (now - lastLesson >= NO_LESSON_GAP_MS) {
      return {
        reasonKey: 'home.recommend.noLesson',
        ctaKey: 'home.recommend.noLessonCta',
        nav: { to: 'tutor' },
      }
    }
  }

  return null
}
