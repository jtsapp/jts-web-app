'use client'

// «Грамматика · игры» отдельным экраном — 125 тем на пяти уровнях: правило темы (3D-карточки формул, таблицы,
// типичные ошибки) и сетка из 11–13 игр с финальным боем Декстера и Спарка (спека
// 2026-10-25-grammar-games-speed-reading-design, A3).
//
// Обычно раздел открывают вкладкой Практики, а экран остался для адресов, которые ведут сразу в тему:
// ?screen=grammar-games&topic=L1-01 («Открыть на сайте» в админке) и переход Луны. Сам раздел — GrammarGamesView,
// здесь только кабинет вокруг него и «назад».

import LearningLayout from '../components/LearningLayout.jsx'
import GrammarGamesView from './grammar-games/GrammarGamesView.jsx'

export default function GrammarGamesPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel, initialTarget }) {
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'grammarGames' }))

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <GrammarGamesView
        token={token}
        userLevel={userLevel}
        initialTopic={initialTarget?.topic || null}
        onBack={goBack}
        backLabel={backLabel}
      />
    </LearningLayout>
  )
}
