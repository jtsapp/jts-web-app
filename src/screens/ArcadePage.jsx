'use client'

// «Аркада» — раздел Практики (?screen=arcade): зал мини-игр. Карточка
// раздела стоит во вкладках «Говорение» и «Чтение».
//   • Speak or Die — говоришь по-английски на тему, молчание подпускает
//     бензопилу к дереву (arcade/ArcadeGame.jsx; микрофон, стенограмма и
//     ИИ-разбор — src/practice/arcade/ и /api/practice/arcade/review).
//   • Word Rush — бег по трём дорожкам сквозь ворота с переводом слова
//     (arcade/runner/, правила — src/practice/arcade/runner/).
// Диплинк прямо в игру: ?screen=arcade&game=speak|runner.
//
// Экран — оболочка: шапка, «Назад» (из игры — в зал, из зала — в ту вкладку
// Практики, откуда пришли) и выбор игры. Прогресс не синкается: раунд
// живёт, пока открыт экран.

import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import ArcadeGame from './arcade/ArcadeGame.jsx'
import ArcadeHub, { ARCADE_GAMES } from './arcade/ArcadeHub.jsx'
import RunnerGame from './arcade/runner/RunnerGame.jsx'
import { SKILL_KEYS } from './practice/practiceTabs.js'

const HEADS = {
  hub: { eyebrow: 'arcade.hub.eyebrow', title: 'arcade.hub.title', subtitle: 'arcade.hub.subtitle' },
  // Игры новые, ИИ-разбор ещё обкатывается — честно помечаем бетой.
  speak: { eyebrow: 'arcade.eyebrow', title: 'arcade.title', subtitle: 'arcade.subtitle', beta: true },
  runner: { eyebrow: 'arcade.run.eyebrow', title: 'arcade.run.title', subtitle: 'arcade.run.subtitle', beta: true },
}

export default function ArcadePage({ userName, userLevel, token, onNav, onProfile, initialTarget = null }) {
  const { t } = useI18n()
  const [game, setGame] = useState(() => (ARCADE_GAMES.includes(initialTarget?.game) ? initialTarget.game : null))
  const fromSkill = SKILL_KEYS.includes(initialTarget?.skill) ? initialTarget.skill : 'speaking'
  // Карточка «Аркады» стоит внизу длинной Практики, а прокрутка окна между
  // экранами не сбрасывается сама — без этого игра открывалась бы с середины.
  // То же при переходе зал ↔ игра: поле игры ниже шапки зала.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [game])
  const head = HEADS[game || 'hub']
  const back = () => (game ? setGame(null) : onNav?.('practice', { skill: fromSkill }))
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ar">
        <div className="ar-top">
          <button type="button" className="ar-back" onClick={back}>
            ← {t(game ? 'arcade.toHub' : 'arcade.toPractice')}
          </button>
          <div className="ar-crumb">
            <b>{t('practice.chip.arcade')}</b>
          </div>
        </div>

        <header className="ar-head">
          <div className="ar-eyebrow">
            <span />
            {t(head.eyebrow)}
          </div>
          <h1>
            {t(head.title)}
            <span className="ar-dot">.</span>
            {head.beta && <span className="ar-beta">{t('arcade.beta')}</span>}
          </h1>
          <p className="ar-sub">{t(head.subtitle)}</p>
        </header>

        {/* Токен — только для ИИ-разбора Speak or Die: у гостя его нет, и разбор просит войти. */}
        {game === 'speak' && <ArcadeGame token={token || null} />}
        {game === 'runner' && <RunnerGame onExit={() => setGame(null)} />}
        {!game && <ArcadeHub onPick={setGame} />}
      </div>
    </LearningLayout>
  )
}
