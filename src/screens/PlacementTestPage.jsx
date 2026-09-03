'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Shell from '../components/Shell.jsx'
import { loadPlacementBank, createPlacementSession } from '../practice/placement/engine.js'
import { vocabDraw } from '../practice/placement/engine.generated.js'
import { T } from '../practice/placement/strings.js'
import { placementText } from '../practice/placement/uiOverrides.js'
import { IDK_DRAFT, isItemAnswered } from '../practice/placement/answers.js'
import {
  orderWordsOf,
  VocabQuestion,
  ListeningGroup,
  QuestionBody,
} from '../practice/placement/questions.jsx'
import { useI18n } from '../i18n.jsx'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { placementLevel, placementSummary } from '../lib/placement.js'

// Тест на определение уровня. Расчёты — перенесённый движок школы
// (practice/placement/engine.generated.js, сверен с бандлом в
// placementParity.test.js), здесь только экран в оформлении приложения.
//
// Ход теста повторяет бандл: самооценка задаёт стартовую θ, разделы идут по
// очереди с экраном-объяснением перед каждым, внутри раздела ответы можно
// менять до кнопки «Завершить раздел», таймера нет. Провал разминки уводит на
// A0-мост (два простых задания: ранний выход с A0 либо возврат со старта A1).
// Аудирование собирает все вопросы одной записи на одном экране; полный
// вариант заканчивается говорением с микрофоном.

const CANDO_KEYS = ['cando0', 'cando1', 'cando2', 'cando3', 'cando4']

// Ключ черновика: у заданий словаря нет собственных id, поэтому ключуем
// позицию; у остальных заданий id уникален в банке.
const draftKey = (screen) => (screen.kind === 'vocab' ? `vocab:${screen.idx}` : screen.item.id)

export default function PlacementTestPage({
  lang = 'ru', token = null, onLevel, onDone, saveState = 'idle', onRetrySave,
}) {
  const t = useCallback((k) => placementText(lang, k), [lang])
  // Строки самого теста сняты из бандла (strings.js), а сообщения приложения —
  // из его словаря.
  const { t: appT } = useI18n()
  const [phase, setPhase] = useState('loading') // loading | error | blocked | variant | cando | intro | items | speaking | result
  // Уровень определяется один раз: если профиль уже проходил тест, показываем
  // его результат вместо нового прогона.
  const [doneLevel, setDoneLevel] = useState(null)
  const [data, setData] = useState(null)
  const [plan, setPlan] = useState([])
  const [secIdx, setSecIdx] = useState(0)
  // Экраны раздела: {kind:'item'|'vocab', item, text?, media?, idx?} или {kind:'group', src, items}
  const [screens, setScreens] = useState([])
  const [pos, setPos] = useState(0)
  const [drafts, setDrafts] = useState({})
  // A0-мост: после провала разминки идут два задания-«моста» вне плана секций.
  const [bridgeMode, setBridgeMode] = useState(false)
  const [result, setResult] = useState(null)
  const [grading, setGrading] = useState(false)
  const [sectionError, setSectionError] = useState('')
  const sess = useRef(null)
  // Токен серверного прогона: к нему привязана проверка ответов и по его
  // записи считается итоговый уровень. null — база не настроена (dev), тогда
  // проверка работает без привязки.
  const runToken = useRef(null)
  const startedAt = useRef(0)

  useEffect(() => {
    let alive = true
    // Проверяем без побочных эффектов, определял ли профиль уровень раньше:
    // прогон при этом не заводится.
    // Прогон принадлежит профилю: залогиненному — по токену, анониму — по
    // deviceId. Без этого «один раз» не работало бы: каждый прогон был бы ничей.
    const alreadyDone = fetch(
      `/api/placement/session?deviceId=${encodeURIComponent(getDeviceId())}`,
      { headers: authHeaders(token) },
    )
      .then((r) => r.json())
      .catch(() => null)

    Promise.all([loadPlacementBank(), alreadyDone]).then(([d, done]) => {
      if (!alive) return
      if (!d) return setPhase('error')
      setData(d)
      if (done?.completed) {
        setDoneLevel(done.level || null)
        return setPhase('blocked')
      }
      setPhase('variant')
    })
    return () => {
      alive = false
    }
  }, [])

  // Отсчёт времени на задание — в эффекте: Date.now() во время рендера сделал
  // бы его нечистым, а число уходит в лог для калибровки банка.
  useEffect(() => {
    if (phase === 'items') startedAt.current = Date.now()
  }, [phase, pos])

  const buildPlan = (s) => {
    const out = [
      { key: 'routing', title: t('blockRouting'), hint: t('introRouting') },
      { key: 'minpair', title: t('blockMinpair'), hint: t('introMinpair') },
      { key: 'listening', title: t('blockListening'), hint: t('introListening') },
    ]
    if (s.cfg.clips) out.push({ key: 'clip', title: t('skillClips'), hint: t('introClips') })
    out.push(
      { key: 'vocab', title: t('blockVocab'), hint: t('introVocab') },
      { key: 'reading', title: t('blockReading'), hint: t('introReading') },
      { key: 'uoe', title: t('blockUoe'), hint: t('introUoe') },
      { key: 'writing', title: t('blockWriting'), hint: t('introWriting') },
    )
    // Говорение — последний раздел полного варианта, как в бандле.
    if (s.cfg.speaking) out.push({ key: 'speaking', title: t('blockSpeaking'), hint: t('introSpeaking') })
    return out
  }

  const openRun = async (variant) => {
    try {
      const res = await fetch('/api/placement/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ variant, deviceId: getDeviceId() }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 409 && data?.error === 'already_completed') {
        // Гонка: прогон закончили в другой вкладке, пока выбирали вариант.
        setDoneLevel(data.level || null)
        setPhase('blocked')
        return
      }
      runToken.current = data?.token || null
    } catch {
      runToken.current = null // без прогона тест всё равно проходится
    }
  }

  const startVariant = (v) => {
    const s = createPlacementSession(data, v)
    sess.current = s
    setPlan(buildPlan(s))
    setPhase('cando')
    // Прогон открываем фоном: пока студент оценивает свой английский, токен
    // успевает приехать, а если не приедет — проверка пойдёт без привязки.
    openRun(v)
  }

  const pickCando = (idx) => {
    sess.current.setCanDo(idx)
    setSecIdx(0)
    setPhase('intro')
  }

  const openSection = (i) => {
    const sec = plan[i]
    if (!sec) return finish()
    const s = sess.current
    // Раздела нет в этом варианте или банк пуст: числимся уже на следующем,
    // иначе finishSection вернул бы студента в тот же раздел второй раз.
    const skipTo = (n) => {
      setSecIdx(n)
      return openSection(n)
    }
    let next = []

    if (sec.key === 'vocab') {
      s.lex = { items: vocabDraw(data.vocab, s.theta0, s.rnd) }
      if (!s.lex.items.length) return skipTo(i + 1)
      next = s.lex.items.map((item, idx) => ({ kind: 'vocab', item, idx }))
    } else if (sec.key === 'writing') {
      // Уровень задания письма следует за текущей θ — как в бандле.
      const item = s.pickAtLevel('writing', 1)[0]
      if (!item) return skipTo(i + 1)
      next = [{ kind: 'item', item }]
    } else if (sec.key === 'speaking') {
      const items = s.pickAtLevel('speaking', s.cfg.speaking)
      if (!items.length) return finish()
      setScreens(items.map((item) => ({ kind: 'item', item })))
      return setPhase('speaking')
    } else if (sec.key === 'listening') {
      // Все вопросы одной записи — на одном экране, как в бандле.
      const L = s.buildListening()
      next = L.sources
        .map((id) => ({
          kind: 'group',
          src: (data.manifest.sources || []).find((m) => m.id === id) || { id },
          items: L.items.filter((it) => it.source === id),
        }))
        .filter((g) => g.items.length)
    } else if (sec.key === 'reading') {
      // К каждому вопросу прикладывается его текст (сворачиваемый).
      const R = s.buildReading()
      next = R.items.map((item) => ({
        kind: 'item',
        item,
        text: R.texts.find((x) => x.id === item.source) || null,
      }))
    } else if (sec.key === 'routing') next = s.buildRouting().map((item) => ({ kind: 'item', item }))
    else if (sec.key === 'minpair') next = s.buildMinpairs().map((item) => ({ kind: 'item', item }))
    else if (sec.key === 'clip') {
      // Файл клипа лежит в манифесте (video: true), сам item несёт только source.
      next = s.buildClips().map((item) => ({
        kind: 'item',
        item,
        media: (data.manifest.sources || []).find((m) => m.id === item.source) || null,
      }))
    } else if (sec.key === 'uoe')
      next = [...s.buildUoeBatch(s.cfg.uoe), ...s.buildInteractive()].map((item) => ({ kind: 'item', item }))

    if (!next.length) return skipTo(i + 1)
    setScreens(next)
    setPos(0)
    setDrafts({})
    setPhase('items')
  }

  const openBridge = () => {
    const bi = sess.current.bridgeItems()
    setScreens(bi.map((item) => ({ kind: 'item', item })))
    setPos(0)
    setDrafts({})
    setPhase('items')
  }

  // Ответил ли студент на задание (для блокировки «Далее»).
  const isAnswered = (screen, item) =>
    isItemAnswered(
      item,
      drafts[screen.kind === 'vocab' ? draftKey(screen) : item.id],
      screen.kind === 'vocab' ? 'vocab' : 'item',
      item.type === 'order' && !item.steps ? orderWordsOf(item) : [],
    )
  const screenAnswered = (sc) =>
    sc.kind === 'group' ? sc.items.every((it) => isAnswered(sc, it)) : isAnswered(sc, sc.item)

  // Ответ студента в том виде, в каком его проверяет сервер. Он же уходит в
  // журнал: по нему уровень пересчитывается заново на /api/placement/complete.
  const answerPayload = (item) => {
    const d = drafts[item.id] || {}
    const payload = { id: item.id, tMs: d.tMs || 0 }
    if (d.optIndex != null) payload.optIndex = d.optIndex
    if (d.text) payload.text = d.text
    if (d.word != null) payload.word = d.word
    if (d.answers) payload.answers = d.answers
    if (d.seq) payload.seq = d.seq
    if (d.arr) payload.built = d.arr.join(' ')
    if (d.gaps) payload.gaps = d.gaps.slice()
    if (d.map) payload.map = d.map.slice()
    if (d.shownOrder) payload.shownOrder = d.shownOrder
    if (d.plays) payload.playsUsed = d.plays
    if (d.idk) payload.idk = true
    return payload
  }

  // Проверка ответов — на сервере: ключей в публичном банке больше нет.
  const gradeItems = async (items) => {
    const res = await fetch('/api/placement/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: runToken.current, answers: items.map(answerPayload) }),
    })
    if (!res.ok) throw new Error(`grade ${res.status}`)
    const data = await res.json()
    return new Map((data.scores || []).map((x) => [x.id, x.correct]))
  }

  /** Кладёт проверенные ответы в движок: доля от сервера + сырой ответ в журнал. */
  const submitGraded = (s, items, scores) => {
    for (const item of items) {
      const payload = answerPayload(item)
      s.answerGraded(item, scores.get(item.id) ?? 0, payload)
    }
  }

  const advance = () => {
    const next = secIdx + 1
    setSecIdx(next)
    if (next >= plan.length) return finish()
    setPhase('intro')
  }

  const finishSection = async () => {
    const s = sess.current
    const sec = plan[secIdx]

    // Словарь и письмо считаются на клиенте: у LexTALE «ключ» — сам словарь
    // (он публичный по природе), а письмо оценивается эвристикой без ключа.
    if (!bridgeMode && sec?.key === 'vocab') {
      s.finishVocab(screens.map((sc) => drafts[draftKey(sc)]?.optIndex ?? null))
      return advance()
    }
    if (!bridgeMode && sec?.key === 'writing') {
      const item = screens[0]?.item
      if (item) s.answerWriting(item, drafts[item.id]?.text || '')
      return advance()
    }

    const items = screens.flatMap((sc) => (sc.kind === 'group' ? sc.items : [sc.item]))
    setGrading(true)
    setSectionError('')
    try {
      const scores = await gradeItems(items)
      submitGraded(s, items, scores)
    } catch (e) {
      // Ответы остаются на экране: раздел не засчитан, можно повторить.
      setSectionError(appT('placement.gradeFailed'))
      return
    } finally {
      setGrading(false)
    }

    if (bridgeMode) {
      setBridgeMode(false)
      // Мост не пройден — ранний выход с A0; пройден — движок сам сбросил
      // приор на A1, и тест продолжается со следующего раздела.
      if (!s.bridgeVerdict()) return finish()
      return advance()
    }

    // Провал разминки (4+ ошибок из 6) уводит на A0-мост, как в бандле.
    if (sec?.key === 'routing' && s.routingVerdict() && s.bridgeItems().length) {
      setBridgeMode(true)
      return setPhase('intro')
    }
    return advance()
  }

  const finish = () => {
    const r = sess.current.result()
    setResult(r)
    setPhase('result')
    // Сводка и полный лог сессии (время на задание, флаги качества) — то, ради
    // чего движок пишет tMs каждого ответа: без этого пилотная калибровка
    // банка невозможна. Бэкенд-приёмника пока нет, храним последнюю сессию
    // локально — преподаватель может снять её с устройства студента.
    try {
      localStorage.setItem(
        'jts_placement_last',
        JSON.stringify({ summary: placementSummary(r), session: sess.current.exportJson() }),
      )
    } catch {
      /* приватный режим / квота — тест завершается без сохранения лога */
    }
    // Уровень проверяем перед тем, как отдать наружу: это единственное поле,
    // которое уезжает в профиль студента и определяет весь его контент.
    // Вместе с ним отдаём журнал прохождения — по нему сервер пересчитает
    // уровень сам, не полагаясь на клиентский подсчёт.
    const level = placementLevel(r)
    if (level) onLevel?.(level, r, sess.current.exportJson(), runToken.current)
  }

  // ─── служебные экраны ───────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'error') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card plc-card--center">
            {phase === 'loading' ? (
              <>
                <div className="spinner" />
                <p className="plc-hint">Загружаем тест…</p>
              </>
            ) : (
              <p className="form-error">Не удалось загрузить тест. Обновите страницу.</p>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'variant') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card">
            <h1 className="plc-h1">{t('variantChoose')}</h1>
            <div className="plc-list">
              {['express', 'full'].map((v) => (
                <button key={v} type="button" className="plc-opt plc-opt--wide" onClick={() => startVariant(v)}>
                  <span className="plc-opt__main">
                    <b>{t(v === 'express' ? 'variantExpress' : 'variantFull')}</b>
                    <span className="plc-opt__sub">{t(v === 'express' ? 'variantExpressD' : 'variantFullD')}</span>
                  </span>
                  <span className="plc-opt__time">{t(v === 'express' ? 'variantExpressT' : 'variantFullT')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'cando') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card">
            <h1 className="plc-h1">{t('cando')}</h1>
            <p className="plc-hint">{t('candoHint')}</p>
            <div className="plc-list">
              {CANDO_KEYS.map((k, i) => (
                <button key={k} type="button" className="plc-opt" onClick={() => pickCando(i)}>
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'intro') {
    const sec = bridgeMode ? { title: t('a0Title'), hint: t('a0Note') } : plan[secIdx]
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card plc-card--center">
            {!bridgeMode && <div className="plc-step">{secIdx + 1} / {plan.length}</div>}
            <h1 className="plc-h1">{sec.title}</h1>
            {sec.hint && <p className="plc-hint">{sec.hint}</p>}
            <button className="plc-primary" onClick={() => (bridgeMode ? openBridge() : openSection(secIdx))}>
              {t('startSection')}
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'speaking') {
    return (
      <SpeakingSection
        session={sess.current}
        items={screens.map((sc) => sc.item)}
        lang={lang}
        onDone={finish}
      />
    )
  }

  if (phase === 'blocked') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card plc-card--center">
            <h1 className="plc-h1">{appT('placement.alreadyTitle')}</h1>
            {doneLevel && <div className="plc-level">{doneLevel}</div>}
            <p className="plc-hint">{appT('placement.alreadyHint')}</p>
            <button className="plc-primary" onClick={() => onDone?.(doneLevel)}>
              {appT('placement.alreadyContinue')}
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'result' && result) {
    return (
      <PlacementResult
        result={result}
        lang={lang}
        saveState={saveState}
        onRetrySave={onRetrySave}
        onDone={() => onDone?.(placementLevel(result), result)}
      />
    )
  }

  // ─── экраны раздела ─────────────────────────────────────────────────────
  const screen = screens[pos]
  const sec = bridgeMode ? { title: t('a0Title') } : plan[secIdx]
  const draftFor = (key) => drafts[key] || {}
  const setDraftFor = (key) => (patch) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch, tMs: Date.now() - startedAt.current } }))
  const answered = screen ? screenAnswered(screen) : false
  // «Не знаю»: помечаем задание (в группе аудирования — все её вопросы) и
  // разблокируем переход. Ответ уедет в движок пустым, то есть неверным, —
  // как и должно быть, но ученик больше не заперт на задании, которого не
  // знает, и не обязан гадать (догадка на 4 вариантах завышает оценку).
  const idkItems = screen ? (screen.kind === 'group' ? screen.items : [screen.item]) : []
  const idkChosen = idkItems.length > 0 && idkItems.every((it) => drafts[it.id]?.idk)
  const markIdk = () => {
    idkItems.forEach((it) => setDraftFor(it.id)({ ...IDK_DRAFT }))
    if (pos < screens.length - 1) setPos((p) => p + 1)
  }

  return (
    <Shell>
      <div className="plc">
        <div className="plc-card">
          <div className="plc-top">
            <span className="plc-step">{sec?.title}</span>
            <span className="plc-count">{pos + 1} / {screens.length}</span>
          </div>
          <div className="plc-bar"><div className="plc-bar__fill" style={{ width: `${((pos + 1) / screens.length) * 100}%` }} /></div>

          {screen?.kind === 'group' ? (
            <ListeningGroup key={screen.src.id} group={screen} draftFor={draftFor} setDraftFor={setDraftFor} lang={lang} />
          ) : screen?.kind === 'vocab' ? (
            <VocabQuestion
              key={draftKey(screen)}
              item={screen.item}
              vocab={data.vocab}
              draft={draftFor(draftKey(screen))}
              setDraft={setDraftFor(draftKey(screen))}
              lang={lang}
            />
          ) : (
            <>
              {screen?.text && (
                <details className="plc-rtext" open>
                  <summary>{t('readText')}</summary>
                  <div className="plc-rtext__body">{screen.text.text}</div>
                </details>
              )}
              {screen && (
                <QuestionBody
                  key={screen.item.id}
                  item={screen.item}
                  media={screen.media}
                  draft={draftFor(screen.item.id)}
                  setDraft={setDraftFor(screen.item.id)}
                  lang={lang}
                />
              )}
            </>
          )}

          <div className="plc-foot">
            <button className="plc-ghost" disabled={pos === 0} onClick={() => setPos((p) => p - 1)}>
              {t('back')}
            </button>
            {/* «Не знаю» — честный отказ вместо вынужденной догадки. В словарном
                блоке такой вариант есть прямо в списке, второй раз не нужен. */}
            {screen && screen.kind !== 'vocab' && (
              <button
                type="button"
                className={`plc-ghost plc-idk ${idkChosen ? 'on' : ''}`}
                onClick={markIdk}
              >
                {t('idk')}
              </button>
            )}
            {pos < screens.length - 1 ? (
              <button className="plc-primary" disabled={!answered} onClick={() => setPos((p) => p + 1)}>
                {t('next')}
              </button>
            ) : (
              <button className="plc-primary" disabled={!answered || grading} onClick={finishSection}>
                {t('finishSection')}
              </button>
            )}
          </div>
          {sectionError && <p className="form-error plc-note">{sectionError}</p>}
        </div>
      </div>
    </Shell>
  )
}

function createRecorderRig(stream, { onElapsed, onHardStop }) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const srcNode = ctx.createMediaStreamSource(stream)
  const an = ctx.createAnalyser()
  an.fftSize = 2048
  srcNode.connect(an)
  const buf = new Float32Array(an.fftSize)
  const rig = { t0: Date.now(), voicedMs: 0, transcript: null, rec: null }
  let lastT = rig.t0
  rig.meter = setInterval(() => {
    an.getFloatTimeDomainData(buf)
    let rms = 0
    for (let k = 0; k < buf.length; k++) rms += buf[k] * buf[k]
    rms = Math.sqrt(rms / buf.length)
    const now = Date.now()
    if (rms > 0.015) rig.voicedMs += now - lastT
    lastT = now
  }, 100)
  rig.tInt = setInterval(() => onElapsed(Math.floor((Date.now() - rig.t0) / 1000)), 250)
  rig.mr = new MediaRecorder(stream)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SR) {
    try {
      rig.rec = new SR()
      rig.rec.lang = 'en-US'
      rig.rec.continuous = true
      rig.rec.interimResults = false
      rig.transcript = ''
      rig.rec.onresult = (e) => {
        for (const res of e.results) rig.transcript += ' ' + res[0].transcript
      }
      rig.rec.onerror = () => {}
      rig.rec.start()
    } catch {
      rig.rec = null
      rig.transcript = null
    }
  }
  rig.hardStop = setTimeout(onHardStop, 35000)
  rig.mr.start()
  rig.stop = () => {
    clearInterval(rig.meter)
    clearInterval(rig.tInt)
    clearTimeout(rig.hardStop)
    try { rig.mr.stop() } catch { /* уже остановлен */ }
    if (rig.rec) try { rig.rec.stop() } catch { /* распознавание уже стоит */ }
    try { srcNode.disconnect() } catch { /* контекст уже закрыт */ }
    ctx.close().catch(() => {})
    return {
      durationSec: (Date.now() - rig.t0) / 1000,
      voicedSec: rig.voicedMs / 1000,
      transcript: rig.transcript && rig.transcript.trim() ? rig.transcript.trim() : null,
    }
  }
  return rig
}

function SpeakingSection({ session, items, lang, onDone }) {
  const [step, setStep] = useState('gate') // gate | rec | done
  const [idx, setIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const rig = useRef(null)
  const streamRef = useRef(null)

  // Уход с экрана посреди записи: глушим всё, ответ не сдаём.
  useEffect(
    () => () => {
      rig.current?.stop()
      rig.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const skip = () => {
    session.addFlag('speaking_skipped')
    items.forEach((it) => session.answerSpeaking(it, null))
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onDone()
  }

  const finishRec = () => {
    const r = rig.current
    if (!r) return
    rig.current = null
    session.answerSpeaking(items[idxRef.current], r.stop())
    setStep('done')
  }
  // finishRec зовётся и из setTimeout жёсткого стопа — индекс держим в ref,
  // чтобы замыкание таймера не утащило устаревший.
  const idxRef = useRef(0)

  const startRec = (i) => {
    idxRef.current = i
    setIdx(i)
    setElapsed(0)
    rig.current = createRecorderRig(streamRef.current, { onElapsed: setElapsed, onHardStop: () => finishRec() })
    setStep('rec')
  }

  const nextItem = () => {
    const n = idx + 1
    if (n >= items.length) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      return onDone()
    }
    startRec(n)
  }

  const allow = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return skip() // доступа нет — как в бандле, раздел пропускается
    }
    startRec(0)
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const item = items[idx]

  return (
    <Shell>
      <div className="plc">
        <div className="plc-card plc-card--center">
          {step === 'gate' && (
            <>
              <h1 className="plc-h1">{T(lang, 'blockSpeaking')}</h1>
              <p className="plc-hint">{T(lang, 'introSpeaking')}</p>
              <div className="plc-foot plc-foot--center">
                <button className="plc-ghost" onClick={skip}>{T(lang, 'skip')}</button>
                <button className="plc-primary" onClick={allow}>{T(lang, 'micAllow')}</button>
              </div>
            </>
          )}
          {step === 'rec' && (
            <>
              <p className="plc-stem">«{item.stem}»</p>
              <p className="plc-hint">{T(lang, 'recHint')}</p>
              <p className="plc-rec"><span className="plc-rec__light">{T(lang, 'rec')}</span> <b>{fmt(elapsed)}</b></p>
              <button className="plc-primary" onClick={finishRec}>{T(lang, 'recStop')}</button>
            </>
          )}
          {step === 'done' && (
            <>
              <p className="plc-stem">«{item.stem}»</p>
              <p className="plc-rec__ok">{T(lang, 'recDone')}</p>
              <button className="plc-primary" onClick={nextItem}>{T(lang, 'next')}</button>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}

// ─── результат ────────────────────────────────────────────────────────────
// Экспортируется ради теста на баннер «уровень не сохранился»: дойти до этого
// экрана через полный прогон теста в тесте — 30 заданий и сеть.
export function PlacementResult({ result, lang, saveState = 'idle', onRetrySave, onDone }) {
  const t = (k) => T(lang, k)
  // Строки самого теста сняты из бандла школы (strings.js правится только
  // прогоном скрипта), поэтому сообщение о сохранении берём из словаря
  // приложения.
  const { t: appT } = useI18n()
  const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const pos = (x) => Math.max(0, Math.min(100, ((x + 3.5) / 6) * 100))
  const lo = pos(result.theta - result.se)
  const hi = pos(result.theta + result.se)
  const rows = [
    ['blockRouting', result.skills.routing],
    ['blockMinpair', result.skills.minpair],
    ['blockListening', result.skills.listening],
    ['skillClips', result.skills.clip],
    ['blockReading', result.skills.reading],
    ['blockUoe', result.skills.uoe],
    ['skillUoe2', result.skills.uoe2],
  ].filter(([, v]) => v)

  return (
    <Shell>
      <div className="plc">
        <div className="plc-card plc-card--center">
          <h1 className="plc-h1">{t('congratsTitle')}</h1>
          <p className="plc-hint">{t('congratsLevel')}</p>
          <div className="plc-level">{result.level}</div>

          <div className="plc-band">
            <div className="plc-band__fill" style={{ left: `${lo}%`, width: `${Math.max(3, hi - lo)}%` }} />
            <div className="plc-band__ticks">{LEVELS.map((l) => <span key={l}>{l}</span>)}</div>
          </div>

          {/* Движок сам сообщает, чего стоит его оценка: шкала уровней ещё не
              откалибрована (у заданий банка нет IRT-параметров), а `unresolved`
              means SE > 0.6 — уровень не определился уверенно. Молчать об этом
              на экране, где ученику называют его уровень, нечестно. */}
          {(result.cutsProvisional || result.pilotMode) && (
            <p className="plc-note">{appT('placement.provisional')}</p>
          )}
          {result.flags?.includes('unresolved') && (
            <p className="plc-note plc-note--warn">{appT('placement.unresolved')}</p>
          )}
          {/* A0 — измеренная полоса, но в профиль уезжает A1: в приложениях A0
              значит «тест не пройден» и запирает карту. */}
          {result.level === 'A0' && <p className="plc-note">{appT('placement.startsAtA1')}</p>}

          {rows.length > 0 && (
            <div className="plc-rows">
              {rows.map(([key, v]) => (
                <div key={key} className="plc-row">
                  <span>{t(key)}</span>
                  <b>{v.score != null && v.score !== v.correct ? v.score : v.correct} / {v.n}</b>
                </div>
              ))}
              {result.lex && (
                <div className="plc-row"><span>{t('blockVocab')}</span><b>{result.lex.score100}/100</b></div>
              )}
              {result.writing && (
                <div className="plc-row"><span>{t('blockWriting')}</span><b>{result.writing.score.total}/9</b></div>
              )}
              {result.speaking?.length > 0 && result.speaking[0]?.score && (
                <div className="plc-row">
                  <span>{t('blockSpeaking')}</span>
                  <b>{result.speaking.reduce((a, x) => a + (x.score?.got || 0), 0)} / {result.speaking.reduce((a, x) => a + (x.score?.max || 0), 0)}</b>
                </div>
              )}
            </div>
          )}

          {saveState === 'error' && (
            <div className="plc-save-error">
              <p className="form-error">{appT('level.saveFailed')}</p>
              <button className="plc-ghost" type="button" onClick={onRetrySave}>
                {appT('level.saveRetry')}
              </button>
            </div>
          )}
          {saveState === 'saving' && <p className="plc-hint">{appT('level.saving')}</p>}

          <button className="plc-primary" onClick={onDone}>Let&apos;s go 🚀</button>
        </div>
      </div>
    </Shell>
  )
}
