// Можно ли Луне написать первой прямо сейчас — по тому, что на экране (ТЗ v2.0, 7.4): не во время теста и экзамена, не
// поверх окна (тур, анкета, окно подбора), не во время видео и аудио, не пока ученик печатает в задании и — кроме прихода
// ученика (7.1) — не посреди задания. Про запись голоса, звук самой Луны и звонок знает окно (AssistantWidget): это его
// состояние, а не разметка экрана.

import { ARRIVAL_EVENTS } from './events.js'
import { openingFocus } from './opening.js'
import { snapshotScreen } from './screenSnapshot.js'

const SCREEN_ROOT = '.scr-in'

// Окно поверх экрана: тур («?»), анкета, окно пробного урока… У всех — aria-modal. Своё окно Луны не в счёт.
function overlayOpen(doc) {
  return [...doc.querySelectorAll('[aria-modal="true"]')].some((el) => !el.closest('[data-assistant-ignore]'))
}

function mediaPlaying(doc) {
  for (const m of doc.querySelectorAll('audio, video')) if (!m.paused && !m.ended) return true
  return false
}

// Ученик печатает ответ — окно, открывшееся само, отвлекло бы, даже не забирая курсор.
function typing(doc, root) {
  const el = doc.activeElement
  if (!el || !root.contains(el)) return false
  return el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'submit'].includes(el.type))
}

/**
 * Причина, по которой событие сейчас не к месту, или null.
 * @param {{type: string}} ev событие (events.js)
 * @param {Document} [doc]
 * @returns {null | 'no-screen' | 'test' | 'overlay' | 'media' | 'typing' | 'task'}
 */
export function screenBlocks(ev, doc = globalThis.document) {
  const root = doc?.querySelector(SCREEN_ROOT)
  if (!root) return 'no-screen'
  if (root.closest('[data-assistant-test]') || root.querySelector('[data-assistant-test]')) return 'test'
  if (overlayOpen(doc)) return 'overlay'
  if (mediaPlaying(doc)) return 'media'
  if (typing(doc, root)) return 'typing'
  // Посреди задания — только приход (вернулся на вкладку: «ты остановилась на упражнении 3») и пробный урок после урока.
  if (!ARRIVAL_EVENTS.has(ev?.type) && ev?.type !== 'demo_trial' && openingFocus(snapshotScreen(root)).task) return 'task'
  return null
}
