// Помощник по сайту ученика: вопрос + снимок экрана → потоковый ответ модели.
//
// Роут только пропускает и стримит: кто спрашивает (токен ученика), не
// превышен ли лимит, валиден ли запрос. ЧТО увидит модель — в
// lib/assistant/prompt.js, база знаний — в lib/assistant/knowledge.js.
//
// Ответ — обычный текст кусками (text/plain), а не SSE: у виджета один
// потребитель, и разбирать события ему незачем.
//
// Вопросы не по теме. Модель отвечает на них меткой OFFTOPIC_MARKER. Поэтому
// ответ клиенту начинается не сразу, а после первых токенов: как только ясно,
// метка это или нет. Метка → генерация обрывается, клиент получает короткий
// стандартный отказ с заголовком x-assistant-offtopic, основной лимит
// ученика возвращается, а вопрос идёт в отдельный счётчик (rateLimit.js).
// Задержки это не добавляет: первые токены клиент ждал бы и так.

import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { chatStreamRich, hasAnthropicKey } from '@/lib/anthropic.js'
import {
  AssistantRequestError,
  OFFTOPIC_REPLY,
  SCREEN_NAMES,
  buildSystemPrompt,
  buildTurns,
  classifyStart,
  createReportFilter,
  isOpeningTurn,
  parseChatRequest,
} from '@/lib/assistant/prompt.js'
import { createOfftopicGuard, createRateLimiter } from '@/lib/assistant/rateLimit.js'
import { loadStudentContext } from '@/lib/assistant/studentContext.js'
import {
  REPORTED_STREAM_MARKER,
  errorThreadFromMessages,
  fallbackBugSummary,
  shouldAutoReportBug,
} from '@/lib/assistant/report.js'
import { actionTail, createActionFilter } from '@/lib/assistant/actions.js'
import { saveAssistantErrorReport } from '@/lib/db/assistantErrorReports.js'
import { saveAdviceNote } from '@/lib/db/assistantTracker.js'
import { adviceText, inferAdviceOffer } from '@/lib/assistant/tracker.js'

export const runtime = 'nodejs'

// Haiku: ответ справки должен начаться за секунду, а разбор школьного
// задания ему по силам. Для эксперимента с моделью посильнее — ASSISTANT_MODEL.
const MODEL = process.env.ASSISTANT_MODEL || 'claude-haiku-5-5'
const MAX_OUTPUT_TOKENS = 800

const takeQuota = createRateLimiter()
const offtopic = createOfftopicGuard()

const json = (status, body, headers = {}) =>
  Response.json(body, { status, headers })

const TEXT_HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  // nginx перед приложением иначе копит весь ответ и отдаёт его разом —
  // та же грабля, что у голосового мозга (см. voice/brain/chat/completions).
  'x-accel-buffering': 'no',
}

export async function POST(request) {
  const bearer = bearerFromRequest(request)
  const auth = await verifyTokenStatus(bearer)
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })
  if (!hasAnthropicKey()) return json(503, { error: 'assistant_unavailable' })

  let parsed
  try {
    parsed = parseChatRequest(await request.json())
  } catch (err) {
    if (err instanceof AssistantRequestError || err instanceof SyntaxError) {
      return json(400, { error: 'bad_request' })
    }
    throw err
  }

  const key = `user-${auth.user.userId}`
  // Ученик открыл окно, и Луна заговаривает первой (OPENING_MARK). Такой ход —
  // не слова ученика: ни отказ «не по теме», ни поломка по нему не записываются,
  // а в разбор поломки и в её «слова ученика» он не попадает.
  const opening = isOpeningTurn(parsed.messages[parsed.messages.length - 1].content)
  const studentTurns = parsed.messages.filter((m) => !(m.role === 'user' && isOpeningTurn(m.content)))
  const pause = offtopic.blockedFor(key)
  if (pause > 0) {
    return json(429, { error: 'offtopic_cooldown', retryAfterSec: pause }, { 'retry-after': String(pause) })
  }
  const quota = takeQuota(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  // Профиль ученика — для плана и советов. Сам модуль отказоустойчив и
  // кэширует на несколько минут; если и он вдруг бросит исключение, чат не
  // должен из-за этого падать — план останется без персонализации.
  const studentContext = await loadStudentContext(bearer, auth.user).catch(() => null)

  const gen = chatStreamRich({
    systemPrompt: buildSystemPrompt(),
    messages: buildTurns({ ...parsed, user: auth.user, studentContext, today: new Date().toISOString().slice(0, 10) }),
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    task: 'site_assistant',
  })

  // Читаем, пока не станет ясно, метка это или ответ.
  let head = ''
  let verdict = 'undecided'
  let finished = false
  try {
    while (verdict === 'undecided') {
      const { value, done } = await gen.next()
      if (done) {
        finished = true
        break
      }
      if (value.type === 'text' && value.text) {
        head += value.text
        verdict = classifyStart(head)
      }
    }
  } catch (err) {
    console.error('[assistant] model failed:', err?.message || err)
    // Ответа не было — и вопрос не должен съесть лимит ученика.
    takeQuota.refund(key)
    return json(502, { error: 'model_failed' })
  }

  // Модель закончила на обрывке метки («[[OFF») — ответа по теме тут нет.
  if (finished && verdict === 'undecided' && head.trim()) verdict = 'offtopic'

  if (verdict === 'offtopic') {
    // return() закрывает стрим SDK — модель перестаёт генерировать и тарифицироваться.
    await gen.return?.().catch(() => {})
    takeQuota.refund(key)
    // Отказ вместо первой реплики — сбой модели, а не вопрос не по теме: ни
    // паузы ученику, ни стандартного «я помогаю только с английским» на экране —
    // виджет молча покажет обычное приветствие.
    if (opening) return json(502, { error: 'model_empty' })
    offtopic.record(key)
    return new Response(OFFTOPIC_REPLY[parsed.lang] || OFFTOPIC_REPLY.ru, {
      status: 200,
      headers: { ...TEXT_HEADERS, 'x-assistant-offtopic': '1' },
    })
  }

  if (finished && !head.trim()) {
    takeQuota.refund(key)
    return json(502, { error: 'model_empty' })
  }

  // Две метки в конце ответа: поломка ([[REPORT_BUG]] и отчёт после неё — ученику
  // не показываем) и действие («открыть раздел», «тур» — actions.js). Метка
  // действия стоит до отчёта, поэтому её ищем уже в видимой части.
  const filter = createReportFilter()
  const actions = createActionFilter()
  // Видимый ответ целиком — из него трекер берёт совет одной строкой (saveNote).
  let shown = ''
  const keep = (out) => {
    shown += out
    return out
  }
  const visible = (text) => keep(actions.push(filter.push(text)))
  const visibleTail = () => keep(actions.push(filter.flush()) + actions.flush())
  // Служебный хвост: действие, затем «отчёт записан». Клиент режет всё от
  // первого [[ASST_ (actions.js), поэтому оба идут после всего видимого текста.
  // Действие ответа: метка модели, а в первой реплике без метки — кнопка «Совета
  // сайта», если Луна предложила открыть именно его раздел (inferAdviceOffer).
  const finalAction = () => actions.action() || (opening ? inferAdviceOffer(shown, studentContext) : null)
  const serviceTail = async () => {
    const action = finalAction()
    await saveNote(action)
    return actionTail(action) + ((await saveReport()) ? REPORTED_STREAM_MARKER : '')
  }
  // Заметка Луны-трекера (lib/db/assistantTracker.js): совет — это её предложение
  // открыть раздел, то есть метка [[OPEN id]] без _NOW. «Открой» по прямой просьбе
  // ученика — уже не совет, а исполнение, тур — объяснение экрана; их не пишем. В
  // первой реплике переход всегда только предложение (виджет снимает _NOW), поэтому
  // там пишем и то, что модель ошибочно пометила _NOW. Переписка не сохраняется:
  // в строку идёт только сам совет (adviceText).
  const saveNote = async (action) => {
    if (action?.kind !== 'open' || (action.now && !opening)) return
    await saveAdviceNote(key, { target: action.target, advice: adviceText(shown) }).catch(() => false)
  }
  const first = visible(head) + (finished ? visibleTail() : '')
  const saveReport = async () => {
    // Первая реплика сама поломок не передаёт: ученик ещё ничего не сказал, а сбои
    // из консоли без его слов — шум в разборе. Спросит — тогда и передадим.
    if (opening) return false
    const modelReport = filter.report()
    const auto = shouldAutoReportBug(studentTurns)
    if (modelReport == null && !auto) return false
    const lastUser = [...studentTurns].reverse().find((m) => m.role === 'user')
    const thread = errorThreadFromMessages(studentTurns)
    const screenName = parsed.screen.id ? (SCREEN_NAMES[parsed.screen.id] || parsed.screen.id) : ''
    try {
      const saved = await saveAssistantErrorReport({
        profileId: key,
        userId: auth.user.userId,
        lang: parsed.lang,
        screenId: parsed.screen.id,
        pageUrl: parsed.pageUrl,
        userAgent: parsed.userAgent,
        userMessage: thread || lastUser?.content || '',
        assistantSummary:
          modelReport
          || fallbackBugSummary({
            screenName,
            pageUrl: parsed.pageUrl,
            lastUserText: lastUser?.content || '',
          }),
        screenText: parsed.screen.text,
        clientErrors: parsed.errors,
        updateLatest: parsed.bugReported,
      })
      // Повтор в том же чате дописывает карточку, ученику «ошибку записали» не дублируем.
      return saved && !parsed.bugReported
    } catch {
      return false
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      if (first) controller.enqueue(encoder.encode(first))
      if (finished) {
        const service = await serviceTail()
        if (service) controller.enqueue(encoder.encode(service))
        controller.close()
        return
      }
      try {
        for await (const ev of gen) {
          if (ev.type === 'text' && ev.text) {
            const out = visible(ev.text)
            if (out) controller.enqueue(encoder.encode(out))
          }
        }
        const tail = visibleTail()
        if (tail) controller.enqueue(encoder.encode(tail))
        const service = await serviceTail()
        if (service) controller.enqueue(encoder.encode(service))
        controller.close()
      } catch (err) {
        console.error('[assistant] stream failed:', err?.message || err)
        // Обрыв посреди ответа клиент видит как ошибку чтения и показывает
        // «не удалось ответить», а не полуфразу как готовый ответ.
        controller.error(err)
      }
    },
    cancel() {
      // Ученик закрыл окно или начал новый чат — дальше генерировать незачем.
      gen.return?.().catch(() => {})
    },
  })

  return new Response(stream, { status: 200, headers: TEXT_HEADERS })
}
