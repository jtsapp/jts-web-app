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
  isWakeTurn,
  openingFocus,
  stuckReason,
  parseChatRequest,
} from '@/lib/assistant/prompt.js'
import { createOfftopicGuard, createRateLimiter } from '@/lib/assistant/rateLimit.js'
import { loadStudentContext } from '@/lib/assistant/studentContext.js'
import { assistantPersona } from '@/lib/assistant/persona.js'
import {
  REPORTED_STREAM_MARKER,
  errorThreadFromMessages,
  fallbackBugSummary,
  shouldAutoReportBug,
} from '@/lib/assistant/report.js'
import { actionTail, createActionFilter } from '@/lib/assistant/actions.js'
import { clickAllowed } from '@/lib/assistant/clickPolicy.js'
import { saveAssistantErrorReport } from '@/lib/db/assistantErrorReports.js'
import { saveAdviceNote } from '@/lib/db/assistantTracker.js'
import { adviceText, inferAdviceOffer } from '@/lib/assistant/tracker.js'
import { isLiveAssistantCall } from '@/lib/assistant/callUsage.js'
import { itemIntent } from '@/lib/assistant/items/intent.js'
import { buildItemCatalog, resolveItem } from '@/lib/assistant/items/catalog.js'

export const runtime = 'nodejs'

// Haiku: ответ справки должен начаться за секунду, а разбор школьного
// задания ему по силам. Для эксперимента с моделью посильнее — ASSISTANT_MODEL.
const MODEL = process.env.ASSISTANT_MODEL || 'claude-haiku-5-5'
const MAX_OUTPUT_TOKENS = 800

const takeQuota = createRateLimiter()
// Звонок Луне: реплики идут каждые 10–30 с, и общий лимит (20 за 10 минут)
// оборвал бы разговор на середине. Потолок звонку ставит его дневной лимит
// минут (callUsage.js), здесь — лишь страховка от петли. С 16.10.2026 агент
// спрашивает и черновиком (упреждающая генерация, до трёх попыток на ход, см.
// agent/assistant_call.py) — отсюда запас ×2.5 к прежним 80/400.
const takeCallQuota = createRateLimiter({ windowLimit: 200, dayLimit: 1000 })
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

// Server-Timing ответа: сколько роут потратил на вход, проверку звонка, профиль
// ученика и первые слова модели. Браузер звонка Луне пересылает его агенту, и
// тот пишет в строку LATENCY luna — по логам LiveKit видно, где в звонке теряется
// время (16.10.2026: без этого задержку звонка можно было только угадывать).
function serverTiming(marks) {
  return Object.entries(marks)
    .filter(([, v]) => Number.isFinite(v))
    .map(([k, v]) => `${k};dur=${Math.round(v)}`)
    .join(', ')
}

export async function POST(request) {
  const startedAt = performance.now()
  const marks = {}
  const since = (t) => performance.now() - t
  const bearer = bearerFromRequest(request)
  const auth = await verifyTokenStatus(bearer)
  marks.auth = since(startedAt)
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
  // Позывной (opening.js): Луна здоровается и спрашивает, чем помочь, — без кнопки
  // раздела и без заметки трекера, даже если модель всё же поставила метку.
  const wake = isWakeTurn(parsed.messages[parsed.messages.length - 1].content)
  // «Подсказать?» (lib/assistant/stuck.js): ученик застрял и нажал облачко — Луна разбирает
  // задание, раздел не предлагает. Строка лога — сколько раз облачко нажимали, без текста.
  const stuck = stuckReason(parsed.messages[parsed.messages.length - 1].content)
  if (stuck) console.info('[assistant]', JSON.stringify({ kind: 'stuck', reason: stuck }))
  const studentTurns = parsed.messages.filter((m) => !(m.role === 'user' && isOpeningTurn(m.content)))
  const lastText = parsed.messages[parsed.messages.length - 1].content
  const pause = offtopic.blockedFor(key)
  if (pause > 0) {
    return json(429, { error: 'offtopic_cooldown', retryAfterSec: pause }, { 'retry-after': String(pause) })
  }
  // Профиль ученика — для плана и советов. Сам модуль отказоустойчив и
  // кэширует на несколько минут; если и он вдруг бросит исключение, чат не
  // должен из-за этого падать — план останется без персонализации. Собирается
  // параллельно с проверкой звонка и лимитом: это разные походы (бэкенд и
  // база), и ждать их по очереди — лишнее время до первого слова Луны.
  const ctxAt = performance.now()
  const contextReady = loadStudentContext(bearer, auth.user)
    .catch(() => null)
    .finally(() => {
      marks.ctx = since(ctxAt)
    })
  // «Открой урок 5 / тему Present Perfect» (lib/assistant/items/): каталог — только под
  // такую просьбу, видов и уровня, о которых речь, и тоже параллельно с остальным.
  const intent = opening ? null : itemIntent(lastText, { userLevel: auth.user.languageLevel })
  const itemsReady = intent
    ? buildItemCatalog({ ...intent, token: bearer, lang: parsed.lang }).catch(() => null)
    : Promise.resolve(null)
  const callAt = performance.now()
  const inCall = parsed.call ? await isLiveAssistantCall(parsed.call, auth.user.userId) : false
  marks.call = since(callAt)
  const limiter = inCall ? takeCallQuota : takeQuota
  const quota = limiter(key)
  if (!quota.ok) {
    return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, {
      'retry-after': String(quota.retryAfterSec),
    })
  }

  const [studentContext, itemCatalog] = await Promise.all([contextReady, itemsReady])

  const modelAt = performance.now()
  const gen = chatStreamRich({
    systemPrompt: buildSystemPrompt(assistantPersona(parsed.lang)),
    messages: buildTurns({
      ...parsed,
      user: auth.user,
      studentContext,
      items: itemCatalog?.text || null,
      today: new Date().toISOString().slice(0, 10),
    }),
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
    limiter.refund(key)
    return json(502, { error: 'model_failed' })
  }

  marks.model = since(modelAt)
  marks.total = since(startedAt)
  const timingHeaders = { 'server-timing': serverTiming(marks) }

  // Модель закончила на обрывке метки («[[OFF») — ответа по теме тут нет.
  if (finished && verdict === 'undecided' && head.trim()) verdict = 'offtopic'

  if (verdict === 'offtopic') {
    // return() закрывает стрим SDK — модель перестаёт генерировать и тарифицироваться.
    await gen.return?.().catch(() => {})
    limiter.refund(key)
    // Отказ вместо первой реплики — сбой модели, а не вопрос не по теме: ни
    // паузы ученику, ни стандартного «я помогаю только с английским» на экране —
    // виджет молча покажет обычное приветствие.
    if (opening) return json(502, { error: 'model_empty' })
    offtopic.record(key)
    return new Response(OFFTOPIC_REPLY[parsed.lang] || OFFTOPIC_REPLY.ru, {
      status: 200,
      headers: { ...TEXT_HEADERS, ...timingHeaders, 'x-assistant-offtopic': '1' },
    })
  }

  if (finished && !head.trim()) {
    limiter.refund(key)
    return json(502, { error: 'model_empty' })
  }

  // Две метки в конце ответа: поломка ([[REPORT_BUG]] и отчёт после неё — ученику
  // не показываем) и действие («открыть раздел», «нажать» — actions.js). Метка
  // действия стоит до отчёта, поэтому её ищем уже в видимой части.
  const filter = createReportFilter()
  // Снимок запроса — чтобы сверить номер кнопки метки нажатия ([[CLICK_NOW 7]]).
  // Каталог запроса — чтобы сверить адрес метки «открой урок 5» ([[OPEN_NOW course.B1.L5]]).
  const actions = createActionFilter({ screenText: parsed.screen.text, items: itemCatalog?.items || null })
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
  // Первая реплика на экране задания — без кнопки вовсе: ученик посреди урока, и
  // уводить его оттуда нельзя, даже если модель всё же позвала (openingFocus).
  const focusTask = opening && openingFocus(parsed.screen.text).task
  // Нажатие кнопки (clickPolicy.js): не в первой реплике — ученик ни о чём не просил, —
  // не опасное и не ответ за ученика на непроверенном задании. Метку модели сверяем с
  // его же репликой: RULES это просят, но держит их модель через раз.
  const finalAction = async () => {
    if (focusTask || wake || stuck) return null
    const action = actions.action()
    if (action?.kind === 'click') {
      return !opening && clickAllowed(action.label, { screenText: parsed.screen.text, userText: lastText }) ? action : null
    }
    // Адрес вещи без каталога в запросе — «да» на её «Открыть урок 5?»: сверяем по
    // каталогу своего вида. Не нашлась или закрыта — не действие (текст модели уже ушёл).
    if (action?.unresolved) {
      const it = await resolveItem(action.target, { token: bearer, lang: parsed.lang }).catch(() => null)
      return it && !it.locked ? { kind: 'open', target: action.target, now: action.now, item: true, label: it.label } : null
    }
    return action || (opening ? inferAdviceOffer(shown, studentContext) : null)
  }
  const serviceTail = async () => {
    const action = await finalAction()
    await saveNote(action)
    return actionTail(action) + ((await saveReport()) ? REPORTED_STREAM_MARKER : '')
  }
  // Заметка Луны-трекера (lib/db/assistantTracker.js): совет — это её предложение
  // открыть раздел, то есть метка [[OPEN id]] без _NOW. «Открой» по прямой просьбе
  // ученика — уже не совет, а исполнение; его не пишем. В
  // первой реплике переход всегда только предложение (виджет снимает _NOW), поэтому
  // там пишем и то, что модель ошибочно пометила _NOW. Переписка не сохраняется:
  // в строку идёт только сам совет (adviceText).
  const saveNote = async (action) => {
    // Конкретная вещь (урок, тема) — не совет раздела: трекер сверяет советы по разделам.
    if (action?.kind !== 'open' || action.item || (action.now && !opening)) return
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

  return new Response(stream, { status: 200, headers: { ...TEXT_HEADERS, ...timingHeaders } })
}
