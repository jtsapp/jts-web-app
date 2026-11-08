// Какая модель отвечает Луне (ТЗ v2.0, 8.3а и 8.5: «для свободного чата и объяснений — сильная модель»).
//
// Справка по сайту, первая реплика, события «Луна пишет первой», ступени подсказки, позывной, «Подсказать?» —
// Haiku 5.5 (ASSISTANT_MODEL): ответ должен начаться за секунду, а правила сайта ей по силам. Вопрос учителю
// английского (правило, перевод, проверка текста, справка по слову) — Sonnet 5.5 (ASSISTANT_TEACHER_MODEL, решение
// владельца 08.11.2026): на эталоне учителя Haiku без мышления упёрлась в 85 % при цели 95 %, и больше половины
// провалов — неверный факт в объяснении, который указаниями у вопроса не лечится (docs/assistant-eval,
// teacher-quality-2026-11-08-round2.md). Sonnet на том же наборе — 92 % эталона, казахский 62 → 85 %, первые слова
// на 0,16 с позже, ответ в 15–20 раз дороже (teacher-model-2026-11-08.md там же).
//
// Что вопрос учителю, решает тот же признак, что включает шаблоны учителя (turnHints.isTeacherQuestion): указания и
// сильная модель — на одних и тех же вопросах. Откатить без правки кода: ASSISTANT_TEACHER_MODEL=claude-haiku-5-5.
//
// Чистый модуль: env читается при каждом вызове — так его подменяют тесты и прогон качества (scripts/assistant-eval).

import { isTeacherQuestion } from './turnHints.js'

const DEFAULT_MODEL = 'claude-haiku-5-5'
const DEFAULT_TEACHER_MODEL = 'claude-sonnet-5-5'

// BOM из Windows-пайпа вырезаем, как у остальных env: с ним имя модели не совпало бы ни с одним
// известным, и каждый ответ уходил бы в 404 модели.
const envModel = (name, fallback) => String(process.env[name] || '').replace(/^﻿/, '').trim() || fallback

/** Модель справки по сайту и служебных ходов. */
export function baseModel() {
  return envModel('ASSISTANT_MODEL', DEFAULT_MODEL)
}

/** Модель ответов учителя английского. */
export function teacherModel() {
  return envModel('ASSISTANT_TEACHER_MODEL', DEFAULT_TEACHER_MODEL)
}

// Мышление у модели учителя выключено (between_tools, anthropic.js), effort — только low | medium | high: выше с
// выключенным мышлением Sonnet 5.5 отвечает 400. low и medium замерены одинаковыми (качество в шуме, задержка, длина
// ответа и цена — те же), поэтому low.
const DEFAULT_TEACHER_EFFORT = 'low'
const EFFORTS = new Set(['low', 'medium', 'high'])

/** Effort модели учителя: ASSISTANT_TEACHER_EFFORT, иначе замеренный по умолчанию. */
export function teacherEffort() {
  const e = envModel('ASSISTANT_TEACHER_EFFORT', DEFAULT_TEACHER_EFFORT).toLowerCase()
  return EFFORTS.has(e) ? e : DEFAULT_TEACHER_EFFORT
}

/**
 * Модель для хода Луны.
 * @param {{ question: string, unchecked?: boolean, service?: boolean, call?: boolean }} turn
 *   question — последняя реплика ученика; unchecked — на экране непроверенное задание (prompt.openingFocus);
 *   service — служебный ход (открытие окна, позывной, «Подсказать?», ступень подсказки, событие) — не вопрос ученика;
 *   call — реплика из живого звонка Луне
 * @returns {{ model: string, teacher: boolean, effort?: string }} teacher — вопрос учителю отдан модели учителя;
 *   effort — её effort (у модели справки — свой по умолчанию в anthropic.js)
 */
export function pickAssistantModel({ question, unchecked = false, service = false, call = false }) {
  const base = baseModel()
  // Звонок — на Haiku: в нём первую фразу ждут вживую, а у Sonnet она на 0,25–0,33 с позже (p50–p90, замер
  // 08.11.2026), и агент спрашивает черновиками — до трёх платных ответов Sonnet на одну реплику.
  // Непроверенное задание на экране — тоже Haiku: там Луна не оценивает и не называет ответ, а лишь подсказывает, и
  // эту дисциплину мерили на ней (как и ступени подсказки). Сам признак учителя на таком экране ещё ловит вопрос со
  // справкой школы («Проверь: I like to read»), поэтому проверка — здесь, а не в нём: указания вопроса не меняем.
  if (service || call || unchecked) return { model: base, teacher: false }
  const model = isTeacherQuestion(question) ? teacherModel() : base
  return model === base ? { model, teacher: false } : { model, teacher: true, effort: teacherEffort() }
}
