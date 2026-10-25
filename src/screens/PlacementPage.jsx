'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { installBridge } from '../placement/bridge.js'
import SpeakingTask from '../placement/SpeakingTask.jsx'

// Тест уровня v16 (спека 2026-10-14-placement-v16-first-login-design.md): тест методиста встроен как есть — страница
// public/placement/v16/index.html в iframe с того же адреса, — а своё приложение подключает его крючками (bridge.js).
// Режим фокуса: без меню, только «назад» — у теста своя шапка с языком и прогрессом.
//
// Прогон v16 хранит в localStorage сам и по пространству профиля (ns): вернувшись на экран (или после F5), ученик
// продолжает с того же места, а другой ученик на том же устройстве начинает свой.

function storageNs(profileId) {
  return String(profileId || 'guest').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

export default function PlacementPage({ token, profileId, onExit, onResult, onContinue, onActivity, onSection }) {
  const { t, lang } = useI18n()
  // Адрес считаем один раз: смена языка приложения посреди теста не должна перезагружать iframe — у теста свой
  // переключатель, и выбор там запоминается.
  const [src] = useState(() => `/placement/v16/index.html?lang=${encodeURIComponent(lang)}&ns=${storageNs(profileId)}`)
  const frame = useRef(null)
  const [speaking, setSpeaking] = useState(null) // { args, resolve, reject }
  // Крючки ставятся в окно iframe один раз на загрузку, а пропсы меняются с каждым рендером App — мост зовёт их через
  // ссылку, иначе сохранял бы результат по токену и уровню, какими они были в момент загрузки страницы теста.
  const handlers = useRef({})
  useEffect(() => {
    handlers.current = { onResult, onContinue, onActivity, onSection, onExit }
  })
  const uninstall = useRef(() => {})

  const attach = () => {
    uninstall.current()
    const win = frame.current?.contentWindow
    if (!win) return
    uninstall.current = installBridge(win, {
      onResult: (env) => handlers.current.onResult?.(env),
      onContinue: (env) => handlers.current.onContinue?.(env),
      onActivity: (rec, env) => handlers.current.onActivity?.(rec, env),
      onSection: (section, env) => handlers.current.onSection?.(section, env),
      startSpeaking: (args) => new Promise((resolve, reject) => setSpeaking({ args, resolve, reject })),
      onExit: () => handlers.current.onExit?.(),
    })
    // Тест рисует экран раньше события load, то есть до крючков. Открытый после F5 экран говорения проверяет
    // Speaking Buddy при отрисовке и, не найдя его, писал бы «разговор недоступен» — перерисовываем уже с крючками.
    try {
      win.render?.()
    } catch {
      /* старая версия теста без глобального render */
    }
  }

  useEffect(() => () => uninstall.current(), [])

  return (
    <div className="pl-page">
      {/* «Назад» — круглой кнопкой в шапке самого теста (макет «3 · Тест уровня»), она зовёт onExit через мост. */}
      <iframe
        ref={frame}
        className="pl-page__frame"
        src={src}
        title={t('placement.title')}
        onLoad={attach}
        // Микрофон нужен только нашему окну говорения (оно в самом приложении), но автор проверяет звук — плееру
        // iframe автозапуск и полный экран видео разрешаем.
        allow="autoplay; fullscreen"
      />
      {speaking && (
        <SpeakingTask
          token={token}
          args={speaking.args}
          onDone={(r) => {
            speaking.resolve(r)
            setSpeaking(null)
          }}
          onSkip={() => {
            speaking.reject(new Error('skipped'))
            setSpeaking(null)
          }}
        />
      )}
    </div>
  )
}
