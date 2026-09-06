import { useEffect, useRef, useState } from 'react'
import Shell from '../components/Shell.jsx'
import { useI18n } from '../i18n.jsx'
import { enterTrialBooth } from '../api.js'
import { unlockBroadcastAudio } from './live/audioReport.js'

// Через сколько повторять вход, пока преподаватель не открыл класс. Человек в
// это время стоит перед экраном и ждёт начала урока — пять секунд он замечает
// как «страница живая», а не как задержку.
const RETRY_MS = 5000

/**
 * Единственный экран аккаунта класса преподавателя: он же вход в пробный урок.
 *
 * Кабинета у этого аккаунта нет (App.jsx закрывает остальные экраны по тому же
 * признаку boothAccount), поэтому экран ничего не предлагает выбрать: он либо
 * уводит в урок, либо честно объясняет, почему пока не уводит.
 *
 * `lessonId` — урок, который эта вкладка уже открывала. Он приходит снаружи, а
 * не хранится здесь, потому что повторный вход в класс НЕ безобиден: пока
 * вышедшего в классе не видно, бэкенд закрывает открытый сеанс как забытый и
 * заводит новое занятие — с пустой доской и без того, что уже наработали.
 */
export default function BoothEntryPage({ token, lessonId = null, onEnter }) {
  const { t } = useI18n()
  // 'entering' — идёт первый запрос; 'waiting' — занятия ещё нет, повторяем;
  // 'closed' — класс выключен или аккаунт не закреплён (повторять нечего);
  // 'left' — сеанс этой вкладки известен, ученик вышел из урока сам.
  const [state, setState] = useState(lessonId != null ? 'left' : 'entering')
  // onEnter приезжает новой стрелкой на каждый рендер App — держим в ref, иначе
  // эффект перезапускался бы вместе с ним и слал вход по кругу.
  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter

  useEffect(() => {
    if (lessonId != null) return undefined
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
  }, [token, lessonId])

  const backToLesson = () => {
    // Разрешение играть звук трансляции снимается ЖЕСТОМ и заранее (см.
    // live/audioReport.js). Это единственное нажатие на пути в класс: на
    // автоматическом входе жеста нет вовсе, и там звук разблокирует уже сам
    // урок своей кнопкой «Включить звук».
    unlockBroadcastAudio()
    onEnter?.(lessonId)
  }

  const waiting = state === 'entering' || state === 'waiting'
  const titleKey = {
    entering: 'booth.entering',
    waiting: 'booth.waitingTitle',
    closed: 'booth.closedTitle',
    left: 'booth.leftTitle',
  }[state]
  const textKey = { waiting: 'booth.waitingText', closed: 'booth.closedText', left: 'booth.leftText' }[state]

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
        </div>
      </div>
    </Shell>
  )
}
