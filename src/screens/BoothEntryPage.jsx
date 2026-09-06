import { useEffect, useRef, useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import { enterTrialBooth, getLessonById } from '../api.js'
import { unlockBroadcastAudio } from './live/audioReport.js'

// Через сколько повторять вход, пока преподаватель не открыл класс. Человек в
// это время стоит перед экраном и ждёт начала урока — пять секунд он замечает
// как «страница живая», а не как задержку.
const RETRY_MS = 5000

// Статусы занятия, при которых сеанс ещё жив (тот же список решает то же
// самое в LiveLessonPage — можно ли ещё отвечать). Любой другой статус,
// включая COMPLETED, — сеанс кончился.
const OPEN_STATUSES = new Set(['IN_PROGRESS', 'PAUSED'])

/**
 * Единственный экран аккаунта класса преподавателя: он же вход в пробный урок.
 *
 * Кабинета у этого аккаунта нет (App.jsx закрывает остальные экраны по тому же
 * признаку boothAccount), поэтому экран ничего не предлагает выбрать: он либо
 * уводит в урок, либо честно объясняет, почему пока не уводит.
 *
 * `lessonId` — урок, который эта вкладка уже открывала. Он приходит снаружи
 * (App.jsx хранит его в boothLessonId и переживает перезагрузку через
 * sessionStorage — см. lib/session.js), а не заводится здесь заново, потому
 * что повторный вход в класс НЕ безобиден: пока вышедшего в классе не видно,
 * бэкенд закрывает открытый сеанс как забытый и заводит новое занятие — с
 * пустой доской и без того, что уже наработали.
 *
 * Но и самому lessonId на слово не верят (Правило 2 памяти вкладки): урок мог
 * завершиться уже ПОСЛЕ того, как эта вкладка в последний раз о нём знала —
 * например, ученик вышел из урока сам, экран урока размонтировался и больше
 * не следит за статусом, а преподаватель тем временем нажал «Завершить».
 * Поэтому известный урок не сразу предлагает «Вернуться»: сначала экран сам
 * спрашивает бэкенд о его статусе (см. эффект проверки ниже) и только по
 * ответу решает, куда вести. Раньше это же решала пара признаков из App.jsx
 * (lessonId для «сеанс жив» и отдельный justFinished для «сеанс только что
 * закрыт преподавателем) — оба жили только в React-состоянии, и перезагрузка
 * их стирала. Теперь единственный источник правды — ответ бэкенда на каждом
 * монтировании этого экрана, а не память вкладки саму по себе.
 */
export default function BoothEntryPage({ token, lessonId = null, onEnter }) {
  const { t } = useI18n()
  // 'checking' — урок известен, спрашиваем у бэкенда его статус, прежде чем
  // решить, что показать (Правило 2, см. эффект ниже);
  // 'entering' — идёт запрос /enter; 'waiting' — занятия ещё нет, повторяем;
  // 'closed' — класс выключен или аккаунт не закреплён (повторять нечего);
  // 'left' — проверка подтвердила, что сеанс ещё жив (IN_PROGRESS/PAUSED),
  // либо сама проверка не удалась — сеть подвела, а мы не входим заново ни в
  // коем случае, чтобы не убить ещё живой сеанс из-за одной секунды сети;
  // 'finished' — проверка вернула терминальный статус, ждём нажатия, чтобы
  // принять следующего.
  const [state, setState] = useState(lessonId != null ? 'checking' : 'entering')
  // Разрешение самому звать /enter. Урок неизвестен — можно сразу; урок
  // известен — сначала его нужно проверить (эффект ниже сам не входит) или
  // дождаться нажатия кнопки (enterNow), иначе вход ушёл бы автоматически
  // поверх ещё не проверенного или ещё живого сеанса.
  const [armed, setArmed] = useState(lessonId == null)
  // Ручной повтор из состояния «класс закрыт» (см. retryClosed и кнопку ниже).
  // Автоповтора там по спеке нет — armed к этому моменту уже true, и одного
  // setArmed(true) эффекту не хватит, чтобы перезапуститься: его зависимости
  // не увидят изменения значения. Счётчик — та самая недостающая зависимость:
  // каждый клик меняет своё значение и заставляет attempt() отработать ещё раз
  // (находка 3 финального ревью).
  const [retryTick, setRetryTick] = useState(0)
  // onEnter приезжает новой стрелкой на каждый рендер App — держим в ref, иначе
  // эффект перезапускался бы вместе с ним и слал вход по кругу.
  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter

  // Проверка известного урока (Правило 2). Срабатывает один раз при
  // монтировании с непустым lessonId — App.jsx перемонтирует BoothEntryPage
  // при каждом переходе на экран 'booth' (key={view} в App.jsx), так что
  // «протухший» результат этой проверки долго не живёт: следующий заход на
  // класс — это всегда новое монтирование и новый вопрос бэкенду.
  useEffect(() => {
    if (lessonId == null) return undefined
    let alive = true
    getLessonById(token, lessonId)
      .then((data) => {
        if (!alive) return
        setState(OPEN_STATUSES.has(data?.status) ? 'left' : 'finished')
      })
      .catch(() => {
        // Сеть или бэкенд подвели — не входим заново ни в коем случае: мы бы
        // рисковали убить ещё живой сеанс из-за одной секунды сети. Считаем
        // урок как будто жив (та же 'left', та же кнопка «Вернуться») — если
        // ошиблись, экран урока сам обнаружит терминальный статус при своём
        // следующем опросе и вернёт сюда через onLessonClosed.
        if (alive) setState('left')
      })
    return () => {
      alive = false
    }
  }, [token, lessonId])

  useEffect(() => {
    if (!armed) return undefined
    let alive = true
    let timer = null

    const retryLater = () => {
      setState('waiting')
      timer = setTimeout(attempt, RETRY_MS)
    }

    async function attempt() {
      try {
        const data = await enterTrialBooth(token)
        if (!alive) return
        if (data?.lessonId != null) onEnterRef.current?.(data.lessonId)
        // Ответ без урока — то же самое «класса ещё нет»: ждём и спросим снова.
        else retryLater()
      } catch (e) {
        if (!alive) return
        // 403 — аккаунт не закреплён за действующим классом (в том числе класс
        // выключен), 404 — класса нет вовсе. Через пять секунд ответ будет тот
        // же, и повторять его значит обещать урок, которого не будет.
        if (e?.status === 403 || e?.status === 404) setState('closed')
        else retryLater()
      }
    }

    attempt()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [token, armed, retryTick])

  const backToLesson = () => {
    // Разрешение играть звук трансляции снимается ЖЕСТОМ и заранее (см.
    // live/audioReport.js). Это единственное нажатие на пути в класс: на
    // автоматическом входе жеста нет вовсе, и там звук разблокирует уже сам
    // урок своей кнопкой «Включить звук».
    unlockBroadcastAudio()
    onEnter?.(lessonId)
  }

  // Кнопка состояния «урок завершён»: прошлого сеанса больше нет, значит
  // вернуться некуда — вооружаем эффект выше, и он честно зовёт /enter, как
  // при обычном первом входе.
  const enterNow = () => {
    unlockBroadcastAudio()
    setState('entering')
    setArmed(true)
  }

  // Кнопка состояния «класс закрыт»: 403/404 сами по себе не пересматриваются
  // (см. эффект выше — ровно то, чего требует спека), но ручной повтор не
  // автоповтор. Без кнопки посетителю, пришедшему на минуту раньше, чем
  // преподаватель включил класс, было нечего нажать (находка 3 финального
  // ревью).
  const retryClosed = () => {
    setState('entering')
    setRetryTick((n) => n + 1)
  }

  const waiting = state === 'entering' || state === 'waiting' || state === 'checking'
  const titleKey = {
    checking: 'booth.checking',
    entering: 'booth.entering',
    waiting: 'booth.waitingTitle',
    closed: 'booth.closedTitle',
    left: 'booth.leftTitle',
    finished: 'booth.finishedTitle',
  }[state]
  const textKey = {
    waiting: 'booth.waitingText',
    closed: 'booth.closedText',
    left: 'booth.leftText',
    finished: 'booth.finishedText',
  }[state]

  return (
    <Shell>
      <div className="form-inner">
        {/* Состояние экрана меняется само, без нажатий, — озвучиваем смену тем,
            кто экран не видит. */}
        <div className="form-card" aria-live="polite">
          {waiting && <div className="booth__spinner spinner" aria-hidden="true" />}
          <h2 className="form-title">{t(titleKey)}</h2>
          {textKey && <p className="form-sub">{t(textKey)}</p>}
          {state === 'left' && (
            <button type="button" className="btn btn--primary booth__cta" onClick={backToLesson}>
              {t('booth.back')}
            </button>
          )}
          {state === 'finished' && (
            <button type="button" className="btn btn--primary booth__cta" onClick={enterNow}>
              {t('booth.finishedCta')}
            </button>
          )}
          {state === 'closed' && (
            <button type="button" className="btn btn--primary booth__cta" onClick={retryClosed}>
              {t('booth.closedRetry')}
            </button>
          )}
        </div>
      </div>
    </Shell>
  )
}
