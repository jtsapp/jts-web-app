import { useEffect, useRef, useState } from 'react'
import AssetImage from '../components/AssetImage.jsx'
import LearningLayout from '../components/LearningLayout.jsx'
import { HomeworkIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'
import { computeKingdoms, kingdomAvatar } from '../kingdoms.js'
import { getMyHomework } from '../api.js'
import { isTeacher } from '../lib/jwt.js'
import { pendingCount } from './homework/homeworkFormat.js'

// Карта уровней (макет Figma «Обучение», Screen 2060:2401 / 2062:2883).
//
// Остров — картинка, а не фон панели: узлы позиционируются в процентах ОТ
// КАРТИНКИ (kingdoms.js), иначе при любой другой ширине короли уезжают со
// своих городов. Кадр острова — колонкой по центру контента (ширина как у
// продовой карты), вокруг — океан; заголовок и его затемнение липнут сверху.
export default function LearningPage({ userLevel = 'A1', userName, token, unlockAll = false, onOpenKingdom, onOpenHomework, onNav, onProfile }) {
  const { t } = useI18n()
  // unlockAll — режим просмотра контента (?unlock=1, только dev): замки на
  // карте сняты, гейтинг по уровню не применяется.
  const kingdoms = computeKingdoms(userLevel).map((k) => (unlockAll ? { ...k, unlocked: true } : k))

  // Остров выше экрана и нарисован снизу вверх: в самом верху — C1, до
  // которого ещё расти. Открываем карту на своём уровне, иначе первое, что
  // видит студент, — чужие закрытые города (в макете кадр тоже нижний).
  const currentRef = useRef(null)
  useEffect(() => {
    const el = currentRef.current
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])

  // Вход в домашнюю работу прямо с главной: задание живёт вне карты уровней, и
  // без напоминания здесь ученик узнаёт о нём только от преподавателя. Счётчик
  // — best-effort: не загрузился, значит показываем просто вход, а не ошибку
  // поверх карты.
  // Домашние работы бывают только у ученика: у преподавателя /homework/my пуст
  // по определению, и вход показывал ему «всё сдано» про работы, которых у него
  // нет. Свои задания он проверяет во вкладке «Домашние задания» на «Уроках».
  const student = !isTeacher(token)
  const [pending, setPending] = useState(null)
  useEffect(() => {
    if (!token || !student) return
    let cancelled = false
    getMyHomework(token)
      .then((list) => { if (!cancelled) setPending(pendingCount(list)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token, student])

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="learning" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="lp lp--map">
        <div className="lp-isle">
          {/* Шапка с затемнением: липнет сверху и не перехватывает клики —
              под ней прокручиваются и остаются кликабельными узлы карты.
              Кнопке «Домашняя работа» клики возвращает pointer-events: auto. */}
          <div className="lp-isle__head">
            <h1 className="lp-isle__title">{t('nav.learning')}</h1>
            <p className="lp-isle__sub">{t('learn.subtitle')}</p>
            {onOpenHomework && student && (
              <button type="button" className="lp-hw" onClick={onOpenHomework}>
                <HomeworkIcon size={20} />
                <span className="lp-hw__label">{t('homework.entry')}</span>
                {pending !== null && (
                  <span className="lp-hw__count">
                    {pending > 0 ? t('homework.entryPending', { count: pending }) : t('homework.entryDone')}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="lp-isle__map">
            <img className="lp-isle__art" src="/assets/learning/island.webp" alt="" />

            {kingdoms.map((k) => {
              const locked = !k.unlocked
              const cls = `lp-node${k.current ? ' is-current' : ''}${locked ? ' is-locked' : ''}`
              return (
                <button
                  key={k.id}
                  ref={k.current ? currentRef : undefined}
                  className={cls}
                  style={{ left: `${k.map.x}%`, top: `${k.map.y}%`, '--ring': k.ring }}
                  disabled={locked}
                  aria-disabled={locked}
                  title={locked ? t('learn.locked', { label: k.level }) : k.name}
                  onClick={() => !locked && onOpenKingdom?.(k)}
                >
                  {/* Узел карты — готовый рендер из макета: обводка, белый
                      зазор и круг с королём внутри собраны в Figma и вывезены
                      экспортом. Повторять «круг в круге» масками по числам не
                      надо — кадр персонажа в макете свой у каждого уровня
                      (см. Group 77…82, Screen 2062:2883). */}
                  <span className="lp-node__ring">
                    {/* Без loading="lazy": узлов всего шесть, карта сама
                        прокручивается к текущему уровню, и отложенная загрузка
                        оставляла бы соседние кружки пустыми. */}
                    <AssetImage className="lp-node__av" src={`/assets/world/nodes/${kingdomAvatar(k)}.webp`} alt={k.name} />
                    {locked && (
                      <span className="lp-node__lock" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="#fff" />
                          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="lp-node__label">{t('kingdom.levelBadge', { label: k.level })}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </LearningLayout>
  )
}
