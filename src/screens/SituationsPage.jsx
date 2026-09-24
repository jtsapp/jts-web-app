'use client'

// «Ситуации» — разговорная практика A1–C1.
//
// Раньше уровень открывался полноэкранным оверлеем с iframe на
// public/practice/situations/<level>.html: приложение не знало, что происходит
// внутри, поэтому прохождение считалось по факту «открыл уровень», оценка речи
// работала только в Chrome (браузерный webkitSpeechRecognition), а грамматика
// уезжала на публичный api.languagetool.org. Теперь экран свой: данные режет
// scripts/build-situations-data.js, разбор устного ответа считает наш стек
// (см. app/api/practice/situations/assess).
//
// Внутренняя view-машина каталог → сценарий, без Next-роутов: навигация всего
// приложения — state-машина App.jsx.
//
// Переключателя уровней внутри экрана нет намеренно: уровень — единица квоты
// PRACTICE_SITUATIONS (её списывает Практика перед переходом сюда), и
// переключалка внутри дала бы обход этой проверки.

import { useCallback, useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { SITUATIONS_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { recordSkill } from '../practice/skillStats.js'
import { countDone, markItemDone, readDoneItems } from '../practice/situations/itemsProgress.js'
import { loadLevel } from '../practice/situations/situationsData.js'
import { markSituationLevelDone } from '../practice/situations/situationsProgress.js'
import SituationsCatalog from './situations/SituationsCatalog.jsx'
import SituationView from './situations/SituationView.jsx'

export const SITUATION_LEVEL_CODES = ['a1', 'a2', 'b1', 'b2', 'c1']

export default function SituationsPage({ userName, userLevel, token, initialTarget, onNav, onProfile }) {
  const { t } = useI18n()
  const level = SITUATION_LEVEL_CODES.includes(String(initialTarget?.level || '').toLowerCase())
    ? String(initialTarget.level).toLowerCase()
    : 'a1'

  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(() => Number(initialTarget?.id) || null)
  const [done, setDone] = useState([])

  // Прогресс читаем после монтирования: localStorage на сервере нет, а чтение
  // прямо в useState развело бы первый клиентский рендер с серверным
  // (см. комментарий про hydration mismatch в App.jsx).
  useEffect(() => {
    setDone(readDoneItems(level))
    const sync = () => setDone(readDoneItems(level))
    window.addEventListener(SITUATIONS_PROGRESS_EVENT, sync)
    return () => window.removeEventListener(SITUATIONS_PROGRESS_EVENT, sync)
  }, [level])

  // Открытый уровень засчитываем и как единицу квоты: обычно это уже сделала
  // Практика перед переходом, но диплинком (?screen=situations&level=b1) сюда
  // попадают мимо неё. Вызов идемпотентный.
  useEffect(() => {
    markSituationLevelDone(level)
  }, [level])

  useEffect(() => {
    let alive = true
    setError('')
    loadLevel(level)
      .then((list) => {
        if (alive) setItems(list)
      })
      .catch(() => {
        if (alive) setError('load')
      })
    return () => {
      alive = false
    }
  }, [level])

  const handleDone = useCallback(
    (id) => {
      markItemDone(level, id)
      // Сценарий засчитан — это говорение, и в сводке навыков он должен быть
      // виден: раздел до этого в skillStats не попадал вовсе.
      //
      // Вторым аргументом `true`, то есть как выполненное задание, а не как
      // «ответил верно» (так же считает дочитанная книга в BookDetail).
      // Оценивать нечем: разбор платный и необязательный — студент может
      // записаться и уйти, и трактовать это как ошибку было бы враньём.
      recordSkill('speaking', true)
      setDone(readDoneItems(level))
    },
    [level],
  )

  const current = items && openId ? items.find((s) => s.id === openId) : null

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="practice"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
    >
      <div className="sit">
        {error && <p className="sit-error">{t('situations.error.load')}</p>}
        {!items && !error && <p className="sit-loading">{t('situations.loading')}</p>}

        {items && !current && (
          <SituationsCatalog
            level={level}
            items={items}
            done={done}
            onOpen={(id) => {
              setOpenId(id)
              window.scrollTo({ top: 0 })
            }}
            // «Ситуации» в Практике живут во вкладке «Говорение»: без навыка
            // возврат вёл бы на вкладку по умолчанию, где раздела нет.
            onBack={() => onNav?.('practice', { skill: 'speaking' })}
          />
        )}

        {current && (
          <SituationView
            level={level}
            item={current}
            token={token}
            done={done.includes(current.id)}
            onBack={() => {
              setOpenId(null)
              window.scrollTo({ top: 0 })
            }}
            onDone={() => handleDone(current.id)}
          />
        )}
      </div>
    </LearningLayout>
  )
}

// Счётчик для карточек Практики: сколько сценариев уровня пройдено.
export { countDone }
