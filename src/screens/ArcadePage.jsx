'use client'

// «Аркада» — раздел Практики во вкладке «Говорение» (?screen=arcade): игра
// Speak or Die, перенесённая из проекта javaTest. Говоришь по-английски на
// тему — бензопила отступает от дерева, молчишь — подбирается к нему.
//
// Экран — только оболочка: шапка и возврат в Практику. Игра —
// arcade/ArcadeGame.jsx, её правила, микрофон и стенограмма —
// src/practice/arcade/, ИИ-разбор — роут /api/practice/arcade/review с дневным
// лимитом (lib/db/arcadeBudget.js). Квоты на саму игру нет, прогресс не
// синкается: раунд живёт, пока открыт экран.

import { useEffect } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import ArcadeGame from './arcade/ArcadeGame.jsx'

export default function ArcadePage({ userName, userLevel, token, onNav, onProfile }) {
  const { t } = useI18n()
  // Карточка «Аркады» стоит внизу длинной Практики, а прокрутка окна между
  // экранами не сбрасывается сама — без этого игра открывалась бы с середины.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ar">
        <div className="ar-top">
          {/* Назад — во вкладку «Говорение», откуда в игру и пришли. */}
          <button type="button" className="ar-back" onClick={() => onNav?.('practice', { skill: 'speaking' })}>
            ← {t('arcade.toPractice')}
          </button>
          <div className="ar-crumb">
            <b>{t('practice.chip.arcade')}</b>
          </div>
        </div>

        <header className="ar-head">
          <div className="ar-eyebrow">
            <span />
            {t('arcade.eyebrow')}
          </div>
          <h1>
            {t('arcade.title')}
            <span className="ar-dot">.</span>
            {/* Игра новая, ИИ-разбор ещё обкатывается — честно помечаем. */}
            <span className="ar-beta">{t('arcade.beta')}</span>
          </h1>
          <p className="ar-sub">{t('arcade.subtitle')}</p>
        </header>

        {/* Токен — только для ИИ-разбора: у гостя его нет, и разбор просит войти. */}
        <ArcadeGame token={token || null} />
      </div>
    </LearningLayout>
  )
}
