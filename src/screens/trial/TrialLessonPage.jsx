'use client'

import { useState, useEffect, useRef } from 'react'
import { loadPlacementBank, createPlacementSession, audioUrl } from '../../practice/placement/engine.js'
import { QuestionBody, ListeningGroup, Bankfill } from '../../practice/placement/questions.jsx'
import { isItemAnswered, submitAnswer } from '../../practice/placement/answers.js'
import * as sections from '../../trial/sections.js'
import { LEVEL_DESC, START_LEVELS } from '../../trial/content.generated.js'
import { trialResultPayload, sendResultWithRetry } from '../../trial/report.js'
import { openTrialLink, startTrialLesson, saveTrialResult } from '../../api.js'
import TrialSlide from './TrialSlide.jsx'
import TrialResultScreen from './TrialResultScreen.jsx'
import TrialPlanScreen from './TrialPlanScreen.jsx'

// Пробный урок: слайды преподавателя + диагностика на движке теста
// (practice/placement) + результат, презентация платформы и заявка.
//
// Ссылку заводит преподаватель (POST /trial/sessions), ученик открывает
// /trial/<token> — аккаунта у него ещё нет, поэтому весь обмен с бэкендом идёт
// по токену из адреса. Порядок блоков и их наполнение — в trial/sections.js,
// разбор результата — в trial/report.js; здесь только экран и переходы.
//
// Режим преподавателя (?teacher=1) добавляет ключи к заданиям и карточку урока
// со скриптом — тот же приём, что `#teacher` в бандле школы.

const PHASES = {
  LOADING: 'loading',
  ERROR: 'error',
  WELCOME: 'welcome',
  INTRO: 'intro',
  DIAG: 'diag',
  SOUND: 'sound',
  READING_CHOICE: 'reading-choice',
  SECTION: 'section',
  SPEAKING: 'speaking',
  TEASE: 'tease',
  RESULT: 'result',
  PLATFORM: 'platform',
  PLAN: 'plan',
}

export default function TrialLessonPage({ token, teacherMode = false }) {
  const [phase, setPhase] = useState(PHASES.LOADING)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [startCando, setStartCando] = useState(sections.ELEMENTARY)
  const [plan, setPlan] = useState([])
  const [planIdx, setPlanIdx] = useState(0)
  const [section, setSection] = useState(null)
  const [screens, setScreens] = useState([])
  const [pos, setPos] = useState(0)
  const [drafts, setDrafts] = useState({})
  const [readingQueue, setReadingQueue] = useState([])
  const [readingPick, setReadingPick] = useState(null)
  const [result, setResult] = useState(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const sess = useRef(null)
  const startedAt = useRef(0)
  const answeredAt = useRef(0)

  // Ссылка и банк заданий грузятся параллельно: и то и другое нужно до первого
  // экрана, а последовательно это лишняя секунда на глазах у преподавателя.
  useEffect(() => {
    let alive = true
    Promise.all([openTrialLink(token), loadPlacementBank()])
      .then(([, bank]) => {
        if (!alive) return
        if (!bank) {
          setError('Не удалось загрузить материалы урока. Обновите страницу.')
          return setPhase(PHASES.ERROR)
        }
        setData(bank)
        setPhase(PHASES.WELCOME)
      })
      .catch((e) => {
        if (!alive) return
        setError(e?.message || 'Не удалось открыть пробный урок.')
        setPhase(PHASES.ERROR)
      })
    return () => {
      alive = false
    }
  }, [token])

  // Отметки времени ставим в эффекте: в теле компонента Date.now() делает
  // рендер нечистым, а числа отсюда уезжают в лог сессии и в длительность
  // урока, и «примерно» здесь не годится.
  useEffect(() => {
    if (phase === PHASES.SECTION) answeredAt.current = Date.now()
    if (phase === PHASES.SOUND && !startedAt.current) startedAt.current = Date.now()
  }, [phase, pos])

  const beginDiagnostics = () => {
    const s = createPlacementSession(data, 'express')
    s.setCanDo(startCando)
    sess.current = s
    setPlan(sections.trialPlan(startCando))
    setPlanIdx(0)
    // Отметка о начале — телеметрия для преподавателя, урок от неё не зависит.
    startTrialLesson(token).catch(() => {})
    setPhase(PHASES.SOUND)
  }

  /** Экраны раздела по его описанию из trial/sections.js. */
  function screensOf(built) {
    if (built.key === 'listening') return built.groups.map((g) => ({ kind: 'group', ...g }))
    if (built.key === 'reading') return [{ kind: 'reading', ...built }]
    if (built.key === 'clip') return built.items.map((item) => ({ kind: 'clip', item }))
    return built.items.map((item) => ({ kind: 'item', item }))
  }

  function openBuilt(built, meta) {
    const list = screensOf(built)
    if (!list.length) return false
    setSection({ ...meta, ...built })
    setScreens(list)
    setPos(0)
    setDrafts({})
    setPhase(PHASES.SECTION)
    return true
  }

  // Обычная функция, а не useCallback: она рекурсивно зовёт саму себя, когда
  // раздел нечем наполнить (нет заданий, нет звука), и её ссылку никто не
  // запоминает — вызывают только обработчики кнопок.
  function openPlanStep(idx, queue = readingQueue) {
      const s = sess.current
      const key = plan[idx]
      // Блоки кончились — дальше устная часть с преподавателем, и только
      // после неё результат: finishLesson() отсюда пропустил бы оба слайда.
      if (!key) return setPhase(PHASES.SPEAKING)
      setPlanIdx(idx)

      if (key === 'routing') {
        return openBuilt(sections.buildRouting(s, startCando), { title: 'Разминка', hint: 'Несколько коротких вопросов — просто выберите вариант.' })
      }
      if (key === 'vocab_match') {
        return openBuilt(sections.buildVocabMatch(s, startCando), {})
      }
      if (key === 'tobe') {
        return openBuilt(sections.buildTobe(), { title: "Let's practice: TO BE", hint: 'Выберите верную форму — am, is или are.', rule: true })
      }
      if (key === 'uoe2') {
        const built = sections.buildGrammar2(s)
        if (!built.items.length) return openPlanStep(idx + 1, queue)
        return openBuilt(built, { title: 'Грамматика', hint: 'Соберите предложения и заполните пропуски — просто нажимайте на слова.' })
      }
      if (key === 'reading') {
        if (startCando === sections.ELEMENTARY && !readingPick) return setPhase(PHASES.READING_CHOICE)
        if (startCando >= sections.INTERMEDIATE && !queue.length) {
          // Int–Upper: сначала слова текста, потом сам текст.
          setReadingQueue(['B2'])
          return openBuilt(sections.buildPreRead(), { title: 'Слова перед чтением', hint: 'Эти слова встретятся в тексте. Соедините слово с переводом.' })
        }
        const levels = queue.length ? queue : sections.readingLevels(s, startCando, readingPick)
        if (!levels.length) return openPlanStep(idx + 1, [])
        setReadingQueue(levels.slice(1))
        return openBuilt(sections.buildReading(levels[0]), { title: 'Чтение', hint: 'Прочитайте текст и ответьте на вопросы.' })
      }
      if (key === 'listening') {
        if (!s.audioAvailable) {
          s.addFlag('audio_unavailable')
          return openPlanStep(idx + 1, queue)
        }
        const built = sections.buildListening(s, data.manifest, startCando)
        if (!built.groups.length) return openPlanStep(idx + 1, queue)
        return openBuilt(built, { title: 'Аудирование', hint: 'Послушайте запись и ответьте на вопросы.' })
      }
      if (key === 'clip') {
        if (!s.videoAvailable) return openPlanStep(idx + 1, queue)
        return openBuilt(sections.buildClips(startCando), { title: 'Видео', hint: 'Посмотрите видео (до 3 просмотров) и заполните пропуски словами из набора.' })
      }
      return openPlanStep(idx + 1, queue)
  }

  const draftFor = (key) => drafts[key] || {}
  const setDraftFor = (key) => (patch) =>
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch, tMs: Date.now() - answeredAt.current } }))

  const itemsOfScreen = (sc) => {
    if (!sc) return []
    if (sc.kind === 'group') return sc.items
    if (sc.kind === 'reading') return sc.items
    return [sc.item]
  }

  const screenAnswered = (sc) =>
    itemsOfScreen(sc).every((item) =>
      sc.kind === 'a0' ? !!(drafts[item.id]?.text || '').trim() : isItemAnswered(item, drafts[item.id]),
    )

  // Варианты A0-моста знает только сервер: ключи в браузер не уезжают
  // (bankSplit.js). Сеть или роут отказали — возвращаем пусто, и мост покажет
  // обычное поле ввода вместо кнопок (см. buildA0Bridge).
  const fetchA0Options = async (ids) => {
    try {
      const res = await fetch('/api/placement/a0-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) return {}
      return (await res.json()).options || {}
    } catch {
      return {}
    }
  }

  const finishSection = async () => {
    const s = sess.current
    for (const sc of screens) {
      for (const item of itemsOfScreen(sc)) submitAnswer(s, item, drafts[item.id])
    }

    // Провал разминки уводит на A0-мост — тот же вердикт движка, что в тесте.
    if (section?.key === 'routing' && s.routingVerdict() && s.bridgeItems().length) {
      const a0options = await fetchA0Options(s.bridgeItems().map((it) => it.id))
      return openBuilt(sections.buildA0Bridge(s, a0options), { title: 'Начнём с самого простого', hint: 'Выберите слово для пропуска.' })
    }
    if (section?.key === 'a0_bridge') {
      // Урок продолжается даже при нулевом уровне: словарь, чтение и
      // аудирование остаются, а итог покажет бережный A0-сценарий.
      s.bridgeVerdict()
      return openPlanStep(planIdx + 1)
    }
    // Дочитываем очередь текстов, не сдвигая шаг плана.
    if (section?.key === 'reading' && readingQueue.length) return openPlanStep(planIdx)
    return openPlanStep(planIdx + 1)
  }

  function finishLesson(endedAt) {
    const s = sess.current
    const r = s.result()
    setResult(r)
    setPhase(PHASES.RESULT)

    const payload = trialResultPayload({
      result: r,
      session: s,
      startCando,
      lang: 'ru',
      startedAt: startedAt.current,
      now: endedAt,
    })
    if (!payload) return
    sendResultWithRetry((body) => saveTrialResult(token, body), payload).catch(() => setSaveFailed(true))
  }

  // ─── экраны ──────────────────────────────────────────────────────────────

  if (phase === PHASES.LOADING) {
    return (
      <div className="trial">
        <div className="trial-card trial-card--center">
          <div className="spinner" />
          <p className="trial-hint">Загружаем урок…</p>
        </div>
      </div>
    )
  }

  if (phase === PHASES.ERROR) {
    return (
      <div className="trial">
        <div className="trial-card trial-card--center">
          <h1 className="trial-h2">Урок недоступен</h1>
          <p className="trial-hint">{error}</p>
          <p className="trial-hint">Попросите преподавателя прислать новую ссылку.</p>
        </div>
      </div>
    )
  }

  if (phase === PHASES.WELCOME) {
    return (
      <TrialSlide
        emoji="👋"
        title={<>Welcome to<br /><span className="trial-yl">Just to Study!</span></>}
        subtitle="Пробный урок английского · ≈ 15 минут"
        note="Сегодня: знакомство, мини-диагностика — грамматика и аудирование, — затем ваш уровень и личный план обучения."
        onNext={() => setPhase(PHASES.INTRO)}
        nextLabel="Начать урок 🚀"
      >
        <h3 className="trial-h3">С чего начнём? (выбирает преподаватель)</h3>
        <div className="trial-opts">
          {START_LEVELS.map((o) => (
            <button
              key={o.cando}
              type="button"
              className={`trial-opt ${startCando === o.cando ? 'on' : ''}`}
              onClick={() => setStartCando(o.cando)}
            >
              {o.label} · {o.sub}
            </button>
          ))}
        </div>
      </TrialSlide>
    )
  }

  if (phase === PHASES.INTRO) {
    return (
      <TrialSlide
        title="Introduction"
        note="Расскажите о себе устно — преподаватель поможет с фразами."
        items={[
          'My name is …',
          "I'm … years old.",
          "I'm … (student / doctor).",
          'I live in … (country / city).',
          'My hobby … (interests).',
          'Why would you like to learn English?',
          'What is your goal?',
        ]}
        onBack={() => setPhase(PHASES.WELCOME)}
        onNext={() => setPhase(PHASES.DIAG)}
      />
    )
  }

  if (phase === PHASES.DIAG) {
    return (
      <TrialSlide
        emoji="🔍"
        title="Начнём диагностику вашего английского"
        items={['Не волнуйтесь — это не экзамен.', 'Отвечайте так, как умеете.', 'Просто нажимайте на варианты ответов.']}
        onBack={() => setPhase(PHASES.INTRO)}
        onNext={beginDiagnostics}
        nextLabel="Поехали →"
      />
    )
  }

  if (phase === PHASES.SOUND) {
    return (
      <SoundCheck
        onDone={(video, audio) => {
          const s = sess.current
          s.videoAvailable = video
          s.audioAvailable = audio
          if (!video) s.addFlag('video_unavailable')
          if (!audio) s.addFlag('audio_unavailable')
          openPlanStep(0)
        }}
      />
    )
  }

  if (phase === PHASES.READING_CHOICE) {
    return (
      <ReadingChoice
        suggested={sections.suggestedReadingLevel(sess.current)}
        onPick={(levels) => {
          setReadingPick(levels)
          if (!levels.length) return openPlanStep(planIdx + 1, [])
          setReadingQueue(levels.slice(1))
          openBuilt(sections.buildReading(levels[0]), { title: 'Чтение', hint: 'Прочитайте текст и ответьте на вопросы.' })
        }}
      />
    )
  }

  if (phase === PHASES.SPEAKING) {
    const picked = sess.current.pickAtLevel('speaking', 2).map((it) => it.stem)
    return (
      <TrialSlide
        emoji="🎤"
        title={<>Let&apos;s have <span className="trial-yl">speaking time</span></>}
        note="Отвечайте устно — как получается. Произношение на уровень не влияет."
        items={[...picked, 'What do you like doing in your free time?', 'What is your goal for this year?'].slice(0, 4)}
        onNext={() => setPhase(PHASES.TEASE)}
      />
    )
  }

  if (phase === PHASES.TEASE) {
    return (
      <TrialSlide
        emoji="📄"
        title={<>Интересен <span className="trial-yl">результат?</span></>}
        subtitle="Мы посчитали ваш уровень по ответам — грамматика, аудирование и не только."
        onBack={() => setPhase(PHASES.SPEAKING)}
        onNext={() => finishLesson(Date.now())}
        nextLabel="Показать результат 🎉"
      />
    )
  }

  if (phase === PHASES.RESULT && result) {
    return (
      <TrialResultScreen
        result={result}
        log={sess.current.log}
        levelDesc={LEVEL_DESC}
        startCando={startCando}
        teacherMode={teacherMode}
        saveFailed={saveFailed}
        onNext={() => setPhase(PHASES.PLATFORM)}
      />
    )
  }

  if (phase === PHASES.PLATFORM) {
    return (
      <TrialSlide
        emoji="💜"
        title={<>Наша <span className="trial-yl">платформа</span></>}
        subtitle="Учиться будете здесь — на платформе Just to Study"
        onBack={() => setPhase(PHASES.RESULT)}
        onNext={() => setPhase(PHASES.PLAN)}
        nextLabel="Смотреть форматы и тарифы →"
      >
        <div className="trial-plat">
          {[
            ['🗺️', 'Карта уровней A0 → C1', 'проходите английский как игру — уровень за уровнем'],
            ['🧩', 'Практика по вашему уровню', 'грамматика юнитами: am/is/are, вопросы, Present Continuous…'],
            ['🎬', 'Шэдоуинг', 'говорите вслед за носителями — видео с субтитрами'],
            ['😂', 'Мемы и рилсы', 'учите язык на живом контенте'],
            ['🤖', 'AI-тьютор', 'разговорная практика голосом в любой момент'],
            ['📝', 'Домашняя работа', 'к каждому уроку, с автопроверкой'],
            ['📖', 'Личный словарь', 'сохраняйте слова из любого урока'],
            ['🏆', 'Геймификация', 'персонаж, монеты и статусы за прогресс · есть раздел IELTS'],
          ].map(([icon, title, sub]) => (
            <div key={title} className="trial-plat__item">
              <span className="trial-plat__ico">{icon}</span>
              <b>{title}</b>
              {sub}
            </div>
          ))}
        </div>
      </TrialSlide>
    )
  }

  if (phase === PHASES.PLAN && result) {
    return <TrialPlanScreen result={result} token={token} onBack={() => setPhase(PHASES.RESULT)} />
  }

  // ─── экран раздела ───────────────────────────────────────────────────────
  const screen = screens[pos]
  const last = pos >= screens.length - 1
  const answered = screen ? screenAnswered(screen) : false
  return (
    <div className="trial">
      <div className="trial-card">
        <div className="trial-top">
          <span className="trial-step">{section?.title}</span>
          <span className="trial-count">{pos + 1} / {screens.length}</span>
        </div>
        <div className="trial-bar"><div className="trial-bar__fill" style={{ width: `${((pos + 1) / screens.length) * 100}%` }} /></div>
        {section?.hint && pos === 0 && <p className="trial-hint">{section.hint}</p>}

        {screen?.kind === 'group' && (
          <ListeningGroup key={screen.src.id} group={screen} draftFor={draftFor} setDraftFor={setDraftFor} lang="ru" />
        )}

        {screen?.kind === 'reading' && (
          <>
            <details className="trial-rtext" open>
              <summary>{screen.title}</summary>
              <div className="trial-rtext__body">{screen.text}</div>
            </details>
            {screen.items.map((item, k) => (
              <div key={item.id} className="trial-q">
                <QuestionBody item={item} n={k + 1} draft={draftFor(item.id)} setDraft={setDraftFor(item.id)} lang="ru" />
                {teacherMode && <TeacherKey item={item} />}
              </div>
            ))}
          </>
        )}

        {screen?.kind === 'clip' && (
          <ClipFill item={screen.item} draft={draftFor(screen.item.id)} setDraft={setDraftFor(screen.item.id)} teacherMode={teacherMode} />
        )}

        {screen?.kind === 'item' && (
          <>
            {screen.item.a0options ? (
              <A0Choice item={screen.item} draft={draftFor(screen.item.id)} setDraft={setDraftFor(screen.item.id)} />
            ) : (
              <QuestionBody item={screen.item} draft={draftFor(screen.item.id)} setDraft={setDraftFor(screen.item.id)} lang="ru" />
            )}
            {teacherMode && <TeacherKey item={screen.item} />}
          </>
        )}

        <div className="trial-foot">
          <button className="trial-ghost" disabled={pos === 0} onClick={() => setPos((p) => p - 1)}>
            Назад
          </button>
          {!last ? (
            <button className="trial-primary" disabled={!answered} onClick={() => setPos((p) => p + 1)}>
              Далее
            </button>
          ) : (
            <button className="trial-primary" disabled={!answered} onClick={finishSection}>
              Готово
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** A0-мост кликами: слово выбирается кнопкой, но в движок уходит текстом —
 *  проверяет его тот же checkOpenAnswer, что и в тесте. */
function A0Choice({ item, draft, setDraft }) {
  return (
    <>
      <p className="trial-stem">{item.stem}</p>
      <div className="trial-opts">
        {item.a0options.map((w) => (
          <button
            key={w}
            type="button"
            className={`trial-opt ${draft.text === w ? 'on' : ''}`}
            onClick={() => setDraft({ text: w })}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  )
}

/** Клип с пропусками: видео до трёх просмотров + тот же Bankfill, что в тесте. */
function ClipFill({ item, draft, setDraft, teacherMode }) {
  const [plays, setPlays] = useState(0)
  const ref = useRef(null)
  const left = Math.max(0, 3 - plays)
  return (
    <>
      <video ref={ref} className="trial-video" src={audioUrl(item.file)} preload="metadata" playsInline />
      <button
        className="trial-audio"
        disabled={left <= 0}
        onClick={() => {
          setPlays((p) => p + 1)
          setDraft({ plays: plays + 1 })
          ref.current?.play().catch(() => {})
        }}
      >
        Смотреть <span className="trial-plays">{left}</span>
      </button>
      <Bankfill item={item} draft={draft} setDraft={setDraft} lang="ru" />
      {teacherMode && <div className="trial-tpanel">Ключ: <b>{item.answers.join(', ')}</b> · {item.level}</div>}
    </>
  )
}

/** Ключ к заданию — только в режиме преподавателя. */
function TeacherKey({ item }) {
  let key = null
  if (item.pairs) key = item.pairs.map((p) => `${p[0]} ↔ ${p[1]}`).join('; ')
  else if (item.options && item.key != null) key = item.options[item.key]?.t
  else if (item.answers) key = item.answers.join(', ')
  else if (item.answer) key = Array.isArray(item.answer) ? item.answer.join(' / ') : item.answer
  if (!key) return null
  return <div className="trial-tpanel">Ключ: <b>{key}</b> · {item.level}</div>
}

/**
 * Проверка звука и видео перед диагностикой. Экран короче, чем в бандле, но
 * последствия те же: движок узнаёт, доступны ли видео и звук, и снимает
 * соответствующие блоки, а не показывает ученику молчащий плеер.
 */
function SoundCheck({ onDone }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)
  const decide = (video, audio) => {
    ref.current?.pause()
    onDone(video, audio)
  }
  return (
    <div className="trial">
      <div className="trial-card">
        <h2 className="trial-h2">Проверим звук</h2>
        <p className="trial-hint">Нажмите «Проверить» — вы должны увидеть видео и услышать речь.</p>
        <video ref={ref} className="trial-video" src={audioUrl('clips/clip1.mp4')} preload="metadata" playsInline />
        <button className="trial-audio" onClick={() => ref.current?.play().catch(() => setFailed(true))}>
          Проверить
        </button>
        {failed && <p className="trial-hint">Видео не запускается — выберите «Только звук» или «Звука нет».</p>}
        <div className="trial-opts">
          <button className="trial-primary" onClick={() => decide(true, true)}>Видео и звук работают</button>
          <button className="trial-ghost" onClick={() => decide(false, true)}>Только звук</button>
          <button className="trial-ghost" onClick={() => decide(false, false)}>Звука нет</button>
        </div>
      </div>
    </div>
  )
}

/** Выбор текста для чтения — решает преподаватель: один, оба или пропустить. */
function ReadingChoice({ suggested, onPick }) {
  const [picked, setPicked] = useState({ A2: suggested === 'A2', B1: suggested === 'B1' })
  const levels = ['A2', 'B1'].filter((k) => picked[k])
  const toggle = (k) => setPicked((p) => ({ ...p, [k]: !p[k] }))
  return (
    <div className="trial">
      <div className="trial-card">
        <h2 className="trial-h2">Чтение</h2>
        <p className="trial-hint">Какой текст читаем? Выбирает преподаватель — один, оба или пропустить раздел.</p>
        <div className="trial-opts">
          <button type="button" className={`trial-opt ${picked.A2 ? 'on' : ''}`} onClick={() => toggle('A2')}>
            Meet my family · Elementary · 4 вопроса
          </button>
          <button type="button" className={`trial-opt ${picked.B1 ? 'on' : ''}`} onClick={() => toggle('B1')}>
            Reasons for travelling · Pre-Intermediate · 4 вопроса
          </button>
        </div>
        <button className="trial-primary" onClick={() => onPick(levels)}>
          {levels.length === 0 ? 'Пропустить чтение →' : levels.length === 2 ? 'Читать оба текста →' : 'Читать выбранный текст →'}
        </button>
      </div>
    </div>
  )
}
