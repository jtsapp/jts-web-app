import { useEffect, useRef, useState } from 'react'
import Shell from '../components/Shell.jsx'
import LessonExitConfirm from '../components/LessonExitConfirm.jsx'
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
export default function BoothEntryPage({ token, lessonId = null, onEnter, onSignOut }) {
  const { t } = useI18n()
  // 'checking' — урок известен, спрашиваем у бэкенда его статус, прежде чем
  // решить, что показать (Правило 2, см. эффект ниже);
  // 'entering' — идёт запрос /enter; 'waiting' — занятия ещё нет, повторяем;
  // 'closed' — класс выключен или аккаунт не закреплён (повторять нечего);
  // 'left' — проверка ПОДТВЕРДИЛА, что сеанс ещё жив (IN_PROGRESS/PAUSED), —
  // только этот случай, ничего больше;
  // 'checkFailed' — проверка не удалась (сеть или бэкенд не ответили), про
  // урок мы не знаем ничего и предлагаем войти заново;
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
  // Тот же приём для повторной ПРОВЕРКИ урока (находка ревью). Осечка сети
  // длится секунды, а «Войти заново» стоит целого занятия: выход забывает
  // сеанс вкладки, и следующий вход заводит новое занятие с пустой доской,
  // закрыв прежнее как забытое (TrialBoothSessionService.enter). Поэтому
  // рядом с выходом стоит дешёвый повтор — сначала спросить ещё раз.
  const [checkTick, setCheckTick] = useState(0)
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
        // Ответ без статуса — не «урок кончился», а «мы не знаем». Разница
        // дорогая: 'finished' предлагает вход заново, а он закрывает ещё живой
        // сеанс как забытый и заводит занятие с пустой доской. Сосед по файлу
        // в такой же неопределённости выбирает ту же безопасную сторону —
        // ответ /enter без lessonId ведёт в ожидание, а не в отказ.
        if (data?.status == null) setState('checkFailed')
        else setState(OPEN_STATUSES.has(data.status) ? 'left' : 'finished')
      })
      .catch((e) => {
        // Сеть или бэкенд подвели. Автоматического входа тут по-прежнему нет
        // ни в коем случае: лишний /enter закрыл бы ещё живой сеанс как
        // забытый — ради этого проверка и заведена.
        //
        // Но и выдавать непроверенный урок за живой больше нельзя. Раньше
        // осечка приводила к той же 'left' с кнопкой «Вернуться»: нажатие
        // уводило в урок, урок оказывался завершённым, onLessonClosed
        // возвращал сюда, проверка падала снова — кольцо, из которого
        // посетитель не выходил (наблюдение владельца на дев-стенде).
        // Про урок мы не знаем НИЧЕГО, поэтому и предлагаем единственное
        // честное действие — войти заново.
        //
        // Но «не знаем» — не всякий отказ. 404 (занятия больше нет) и 403 (оно
        // не наше) — это ОТВЕТ, а не молчание: возвращаться некуда, и честное
        // состояние тут 'finished' с настоящим входом заново. Без этой ветки
        // такой отказ давал «Проверить ещё раз», которая получала бы тот же
        // код при каждом нажатии, — тупик вместо кольца. Коды берём из
        // err.status, его кладёт authGet (api.js) — тот же приём, что у
        // эффекта входа ниже.
        if (!alive) return
        if (e?.status === 403 || e?.status === 404) setState('finished')
        else setState('checkFailed')
      })
    return () => {
      alive = false
    }
  }, [token, lessonId, checkTick])

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
    // Тот же жест, что у enterNow и backToLesson: успешный повтор ведёт прямо
    // в урок, минуя отдельное нажатие, — без снятия блокировки здесь ученику
    // пришлось бы отдельно жать «Включить звук» уже внутри урока.
    unlockBroadcastAudio()
    setState('entering')
    setRetryTick((n) => n + 1)
  }

  // Спросить про урок ещё раз. Стоит перед выходом, потому что стоит дешевле:
  // осечка сети живёт секунды, а выход забывает сеанс вкладки, и следующий
  // вход заводит новое занятие с пустой доской, закрыв прежнее как забытое.
  // Ни в какой момент этот жест не шлёт /enter — только повторяет проверку.
  const checkAgain = () => {
    setState('checking')
    setCheckTick((n) => n + 1)
  }

  // Выход из аккаунта. Своей логики выхода экран не держит — чистит токен,
  // признак класса и память вкладки о сеансе тот же handleLogout из App.jsx,
  // что и кнопка выхода в профиле, и он же уводит на экран входа/регистрации.
  const signOut = () => onSignOut?.()

  // Из состояния 'left' выход СПРАШИВАЕТ. Там занятие подтверждённо идёт, а
  // кнопка стоит вплотную под «Вернуться в класс»: один промах мышью — и
  // вернуться уже нечем (память вкладки о сеансе стёрта, нужен пароль класса,
  // а новый вход закроет живой сеанс как забытый). В 'checkFailed' спрашивать
  // не о чем: там урока для нас всё равно нет.
  const [askSignOut, setAskSignOut] = useState(false)

  const waiting = state === 'entering' || state === 'waiting' || state === 'checking'
  const titleKey = {
    checking: 'booth.checking',
    entering: 'booth.entering',
    waiting: 'booth.waitingTitle',
    closed: 'booth.closedTitle',
    left: 'booth.leftTitle',
    checkFailed: 'booth.checkFailedTitle',
    finished: 'booth.finishedTitle',
  }[state]
  const textKey = {
    waiting: 'booth.waitingText',
    closed: 'booth.closedText',
    left: 'booth.leftText',
    checkFailed: 'booth.checkFailedText',
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
            <>
              <button type="button" className="btn btn--primary booth__cta" onClick={backToLesson}>
                {t('booth.back')}
              </button>
              {/* Выход есть и здесь. Раньше с этого экрана уйти было некуда:
                  единственная кнопка вела обратно в урок, а человек, который
                  на пробный уже сходил и хочет завести СВОЙ аккаунт, упирался
                  в тупик — кабинета у класса нет, выхода на экране нет
                  (наблюдение владельца на дев-стенде). Вторым действием, а не
                  первым: тот, кто вышел случайно, чаще возвращается. */}
              <button type="button" className="btn btn--secondary booth__cta" onClick={() => setAskSignOut(true)}>
                {t('booth.signOut')}
              </button>
            </>
          )}
          {state === 'checkFailed' && (
            <>
              {/* Сначала дешёвое: спросить про урок ещё раз. Осечка сети живёт
                  секунды, а выход стоит занятия — см. checkTick. */}
              <button type="button" className="btn btn--primary booth__cta" onClick={checkAgain}>
                {t('booth.checkRetry')}
              </button>
              <button type="button" className="btn btn--secondary booth__cta" onClick={signOut}>
                {t('booth.checkFailedCta')}
              </button>
            </>
          )}
          {askSignOut && (
            <LessonExitConfirm
              titleKey="booth.signOutAsk"
              subKey="booth.signOutAskSub"
              leaveKey="booth.signOutConfirm"
              onStay={() => setAskSignOut(false)}
              onLeave={signOut}
            />
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
