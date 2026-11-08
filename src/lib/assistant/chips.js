// Готовые вопросы под полем Луны — по экрану и формату ученика (ТЗ v2.0, 7.3 и кейс 44).
//
// До 07.11.2026 у всех было шесть одинаковых: «Почему мой ответ неверный?» висел и на
// Главной, а ученик Self Study видел вопросы про уроки, которых у него нет. Правило ТЗ:
// никогда не показывать вопрос про то, чего у ученика нет, — поэтому «Как перенести урок?»
// и «Где мои домашки?» только формату с преподавателем, «Как работают токены?» — только
// где токены включены (areRewardsEnabled), «Подсказать?» — только на задании и не на тесте.
//
// Модуль чистый: какой экран (kind) и формат, решает окно (AssistantWidget.jsx) по снимку
// экрана и learnerFormat (format.js), а здесь — только набор ключей i18n.

/** Онбординг General English: «зачем этот вопрос» (ТЗ 7.2в). */
const ONBOARDING_SCREENS = new Set(['ge-onboarding', 'ge-route'])

/**
 * Вид экрана для набора вопросов.
 * @param {{ screen?: string|null, test?: boolean, task?: boolean }} args
 *   test — на экране тест или экзамен (data-assistant-test), task — задание (openingFocus)
 * @returns {'test'|'task'|'home'|'onboarding'|'other'}
 */
export function chipScreenKind({ screen = null, test = false, task = false } = {}) {
  if (test) return 'test'
  if (task) return 'task'
  if (screen === 'home') return 'home'
  if (ONBOARDING_SCREENS.has(screen)) return 'onboarding'
  return 'other'
}

/**
 * Ключи готовых вопросов. `ask` — что уйдёт Луне, если отличается от подписи кнопки
 * («Подсказать?» — вопрос Луны ученику, а ученик просит подсказку).
 * @param {{ kind: string, format?: 'with_teacher'|'self_study'|'demo'|null, rewards?: boolean }} args
 * @returns {{ key: string, ask?: string, bug?: boolean }[]}
 */
export function assistantChips({ kind, format = null, rewards = false }) {
  const bug = { key: 'assistant.suggest.bug', bug: true }
  if (kind === 'test') return [{ key: 'assistant.suggest.page' }, bug]
  if (kind === 'task') {
    return [
      // hint — не текст модели, а ступень подсказки по счёту задания (hintSteps.js, ТЗ 7.2б): решает окно.
      { key: 'assistant.suggest.hint', ask: 'assistant.suggest.hintAsk', hint: true },
      { key: 'assistant.suggest.ruleShort' },
      { key: 'assistant.suggest.whyWrongShort' },
      bug,
    ]
  }
  if (kind === 'onboarding') return [{ key: 'assistant.suggest.whyQuestion' }, { key: 'assistant.suggest.changeLater' }, bug]
  if (kind === 'home') {
    if (format === 'with_teacher') {
      return [{ key: 'assistant.suggest.today' }, { key: 'assistant.suggest.move' }, { key: 'assistant.suggest.homework' }, bug]
    }
    if (format === 'demo') {
      return [{ key: 'assistant.suggest.today' }, { key: 'assistant.suggest.tryDemo' }, { key: 'assistant.suggest.trial' }, bug]
    }
    // Self Study и неизвестный формат: про уроки и домашку от преподавателя не спрашиваем.
    return [
      { key: 'assistant.suggest.today' },
      rewards ? { key: 'assistant.suggest.tokens' } : { key: 'assistant.suggest.plan' },
      { key: 'assistant.suggest.where' },
      bug,
    ]
  }
  return [{ key: 'assistant.suggest.page' }, { key: 'assistant.suggest.today' }, { key: 'assistant.suggest.where' }, bug]
}
