'use client'

// SpeakSpin — «минута английского»: барабан тем → 30 с подготовки → 60 с
// записи → прослушать и получить ИИ-разбор (Azure + Sonnet 5.5,
// /api/practice/speakspin/assess).
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/speakspin/engine.js), React его монтирует и снимает. Язык
// движка берётся из приложения; при смене языка движок пересоздаётся — так же,
// как в прототипе язык читается один раз при монтировании. Записи живут только
// в памяти вкладки: уход с экрана их освобождает (destroy).
//
// Движок живёт в Shadow DOM: классы прототипа (.hero, .spinner, .badge,
// .timer…) совпадают с глобальными классами приложения, и без изоляции чужие
// стили ломали барабан и шапку. Наследуемое (шрифт, цвет) внутрь проходит.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountSpeakSpin } from '../practice/speakspin/engine.js'
import { SPEAKSPIN_MARKUP } from '../practice/speakspin/markup.js'
import { SPEAKSPIN_CSS } from '../practice/speakspin/styles.js'
import { createAssessAdapter } from '../practice/speakspin/assessClient.js'

export default function SpeakSpinPage({ userName, userLevel, token, onNav, onProfile }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    // attachShadow разрешён один раз на элемент — при пересоздании (смена языка,
    // двойной эффект StrictMode) переиспользуем тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>${SPEAKSPIN_CSS}</style><main class="ss" id="jts-speakspin">${SPEAKSPIN_MARKUP}</main>`
    const root = shadow.getElementById('jts-speakspin')
    const destroy = mountSpeakSpin(root, {
      language: lang,
      // Уровень ученика — контекст для грейдера, не сложность задания.
      learnerLevel: typeof userLevel === 'string' && userLevel ? userLevel.toUpperCase() : null,
      // Гостю разбор не положен (лимит по device-id обходится рестартом
      // браузера): кнопка выключена, подпись зовёт войти.
      ai: token ? { enabled: true, adapter: createAssessAdapter(token), timeoutMs: 90000 } : { enabled: false },
      aiOffKey: token ? 'aiOff' : 'loginToAnalyze',
    })
    return () => {
      destroy()
      shadow.innerHTML = ''
    }
  }, [lang, token, userLevel])

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="spsp-top">
        <button type="button" className="spsp-back" onClick={() => onNav?.('practice', { skill: 'speaking' })}>
          ← {t('practice.speakspin.toPractice')}
        </button>
      </div>
      <div className="spsp-host" ref={hostRef} />
    </LearningLayout>
  )
}
