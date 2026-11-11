import { reasonKey } from './labels.js'

// Что увидит ученик после «Опубликовать» — таблица §3.3 спеки 2026-11-11. Чистая функция: форма только рисует.
// tone — цвет плашки (ok | warn | bad); clear — очистить ли поле: отказ оставляет текст, его переписывают.
// Поля escalated в ответе ученику нет (ёмкость очереди — внутреннее дело модерации) — и не читаем его.

const TONE = { published: 'ok', hidden: 'ok', pending: 'warn', tomorrow: 'warn', feedback: 'warn', rejected: 'bad' }

const BASE = { vars: {}, message: null, removedMediaIds: [], post: null, reasons: [], risk: null, hits: [], feedback: false, feedbackId: null }

/** Сколько минут ждать после 429 (§3.7): вверх и не меньше одной; без retryAfterSec — минута. Общее у публикации и фото. */
export function retryMinutes(err) {
  return Math.max(1, Math.ceil((err?.retryAfterSec ?? 60) / 60))
}

/** Ответ POST /mobile/birge/posts (PublishResponse, §5.3) → что показать. Неизвестное решение — как сбой. */
export function publishOutcome(res) {
  const decision = res?.decision
  const tone = TONE[decision]
  if (!tone) return failureOutcome(null)
  const post = res.post ?? null
  switch (decision) {
    // hidden — переполнение лимита в режиме «скрыто»: автор видит пост как опубликованный (карточка приходит со
    // status: 'published'), и ответ ему тот же (§3.3)
    case 'published':
    case 'hidden':
      return { ...BASE, tone, clear: true, post, titleKey: 'birge.res.published.title', textKey: 'birge.res.published.text' }
    case 'pending':
      return { ...BASE, tone, clear: true, post, titleKey: 'birge.res.pending.title', textKey: 'birge.res.pending.text' }
    case 'tomorrow':
      return { ...BASE, tone, clear: true, post, titleKey: 'birge.res.tomorrow.title', textKey: 'birge.res.tomorrow.text' }
    // Обращение сервер уже создал: оставь мы текст в поле, повторная отправка задвоила бы его (§3.3)
    case 'feedback':
      return {
        ...BASE,
        tone,
        clear: true,
        feedback: true,
        feedbackId: res.feedbackId ?? null,
        titleKey: 'birge.res.feedback.title',
        textKey: 'birge.res.feedback.text',
      }
    default: {
      const codes = (Array.isArray(res.reasons) ? res.reasons : []).map((r) => r?.code)
      return {
        ...BASE,
        tone,
        clear: false,
        // Повтор с теми же mediaIds сервер примет — вложения своего автоотклонённого поста он переносит в новый;
        // удалённые проверкой (IMAGE_UNSAFE) он перечисляет, их форма и убирает (§4 «Медиа»).
        removedMediaIds: Array.isArray(res.removedMediaIds) ? res.removedMediaIds.filter((id) => Number.isFinite(id)) : [],
        titleKey: 'birge.res.rejected.title',
        textKey: 'birge.res.rejected.rewrite',
        reasons: [...new Set(codes.map(reasonKey))],
        risk: Number.isFinite(res.risk) ? res.risk : null,
        hits: Array.isArray(res.hits) ? res.hits.filter((h) => typeof h === 'string' && h) : [],
      }
    }
  }
}

/**
 * Ответа с решением нет: 429 — «Слишком часто — через N мин» (§3.7), 400 — текст сервера, остальное — общая ошибка.
 * Текст в поле остаётся.
 */
export function failureOutcome(err) {
  // failed — решения нет (сбой или неизвестный decision): форма снимает шаги проверки, «проверено» тут было бы враньём.
  const fail = { ...BASE, tone: 'bad', clear: false, failed: true, titleKey: 'birge.res.notPublished' }
  if (err?.status === 429) return { ...fail, textKey: 'birge.res.rateLimit', vars: { n: retryMinutes(err) } }
  // 400 — отказ проверки запроса (§5.1, например «Напишите хотя бы пару слов»): у сервера точный текст, показываем его.
  if (err?.status === 400 && err.serverMessage) return { ...fail, textKey: null, message: err.serverMessage }
  return { ...fail, textKey: 'birge.res.error' }
}
