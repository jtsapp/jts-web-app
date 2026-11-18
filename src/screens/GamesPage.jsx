'use client'

// «Игры» — свой пункт меню сразу после «Практики» (?screen=games). Задача 226 доски, файл методиста
// practice-categories.md (18.11.2026, «обновления после созвона»): игры выносятся из «Практики» в отдельный раздел,
// в Практике остаются пять вкладок по навыкам.
//
// Карточки — те же, что жили во вкладке «Игры» Практики (PracticeTile, practiceCatalog.js): обложка, токены за
// прохождение и переход на экран игры. Под описанием — чипы «что тренирует» из файла. Уровней у игр нет — строки
// уровней на экране нет (как была выключена у вкладки). «Назад» из игры ведёт сюда (App: sectionBack('games')).
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { PracticeTile } from './practice/PracticeCards.jsx'
import { GAMES } from './practice/practiceTabs.js'
import { cardOf } from './practice/practiceCatalog.js'
import { sectionTokenPoints, useStudentTokens } from '../practice/practiceTokens.js'

export default function GamesPage({ userName, userLevel, token, onNav, onProfile }) {
  const { t } = useI18n()
  const tokenData = useStudentTokens(token)
  const rules = Array.isArray(tokenData?.practiceRules) ? tokenData.practiceRules : []

  // «Аркада» знает, откуда её открыли (`skill`): «назад» из Speak or Die и Word Rush ведёт в «Игры», а не в Практику.
  const open = (card) => onNav?.(card.nav, card.nav === 'arcade' ? { ...card.payload, skill: 'games' } : card.payload || undefined)

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="games" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="pk pk-c--games pk-games pp--enter">
        <header className="pk-head">
          <h1 className="pk-head__title">{t('games.title')}</h1>
        </header>
        <p className="pk-games__sub">{t('games.sub')}</p>
        <div className="pk-grid">
          {GAMES.map((game) => {
            const card = cardOf(game.id)
            return (
              <PracticeTile
                key={game.id}
                card={card}
                tokens={card.tokens ? sectionTokenPoints(rules, card.tokens) : 0}
                tags={game.trains.map((k) => t(`games.trains.${k}`))}
                onOpen={() => open(card)}
              />
            )
          })}
        </div>
      </div>
    </LearningLayout>
  )
}
