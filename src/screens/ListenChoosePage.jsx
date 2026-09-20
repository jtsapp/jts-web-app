'use client'

// «Слушай и выбирай» — раздел Практики: слышишь описание, выбираешь из четырёх
// почти одинаковых фото. Порт data/jtslistenchoose.html («Listen & Choose»);
// данные и записи режут и делают scripts/extract-listenchoose.js и
// scripts/make-listenchoose-audio.js, движок — src/practice/listenchoose/.
//
// Сам экран только грузит данные и держит жизненный цикл контроллера набора
// (ListenChooseSession: он создаёт плеер и запись, поэтому создаётся в эффекте с
// уборкой — режим строгой проверки React иначе оставил бы два «живых» плеера).
// Раскладка и клавиатура — в listenchoose/LcMain.jsx.

import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { loadListenChoose } from '../practice/listenchoose/data.js'
import { LEVELS } from '../practice/listenchoose/engine.js'
import { readSeen, writeSeen } from '../practice/listenchoose/listenchooseProgress.js'
import { readDevice, writeDevice } from '../practice/listenchoose/listenchooseSettings.js'
import { ListenChooseSession } from '../practice/listenchoose/session.js'
import { recordSkill } from '../practice/skillStats.js'
import LcMain, { LcDifficulty } from './listenchoose/LcMain.jsx'

const DEVICE = { read: readDevice, write: writeDevice }
const PROGRESS = { readSeen, writeSeen }

export default function ListenChoosePage({ userName, userLevel, token, onNav, onProfile, initialTarget }) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let alive = true
    loadListenChoose()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  // Диплинк (?screen=listenchoose&difficulty=hard) сильнее запомненной сложности.
  const difficulty = initialTarget && LEVELS.includes(initialTarget.difficulty) ? initialTarget.difficulty : undefined
  useEffect(() => {
    if (!data) return undefined
    const s = new ListenChooseSession({
      data,
      device: DEVICE,
      progress: PROGRESS,
      level: difficulty,
      // Навык «аудирование» растёт от ответа с первой попытки — как «с первого
      // раза» у остальных тренажёров.
      onResolved: ({ correct, attempts }) => recordSkill('listening', correct && attempts === 1),
    })
    setSession(s)
    return () => {
      s.destroy()
      setSession(null)
    }
  }, [data, difficulty])

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="lc">
        <div className="lc-top">
          <button type="button" className="lc-back" onClick={() => onNav?.('practice')}>
            ← {t('listenchoose.toPractice')}
          </button>
          <div className="lc-crumb">
            <b>{t('practice.listenchoose.title')}</b>
          </div>
        </div>

        <header className="lc-head">
          <div>
            <div className="lc-eyebrow">
              <span />
              {t('listenchoose.eyebrow')}
            </div>
            <h1>
              {t('listenchoose.title')}
              <span className="lc-dot">.</span>
            </h1>
            <p className="lc-sub">{t('listenchoose.subtitle')}</p>
          </div>
          {session && <LcDifficulty session={session} t={t} />}
        </header>

        {failed && <div className="lc-notice lc-notice--err">{t('listenchoose.loadError')}</div>}
        {!failed && !session && <div className="lc-notice">{t('listenchoose.pageLoading')}</div>}
        {session && <LcMain session={session} data={data} t={t} />}
      </div>
    </LearningLayout>
  )
}
