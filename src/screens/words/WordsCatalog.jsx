'use client'

// Каталог: чипы секций плюс сетка сцен с обложками (renderHome прототипа,
// jtswords.html:~350). Секцию держит родитель — возврат из сцены обязан
// вернуть в тот же срез каталога.

import { useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { sceneCoverUrl } from '../../practice/words/assets.js'
import { readState, sceneProgress, sceneState } from '../../practice/words/wordsProgress.js'

export default function WordsCatalog({ meta, section, progressTick, onSection, onOpen }) {
  const { t } = useI18n()

  // progressTick в зависимостях — пересчёт на каждую отметку и на гидратацию с
  // сервера: readState() читает localStorage, и без тика проценты замирали бы
  // до перемонтирования экрана.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const state = useMemo(() => readState(), [progressTick])

  const current = meta ? meta.sections.find((s) => s.id === section) || meta.sections[0] : null

  return (
    <>
      <div className="wd-hero">
        <h1>{t('words.hero.title')}</h1>
        <p>{t('words.hero.desc')}</p>
      </div>

      <p className="wd-label" id="wd-lbl-section">{t('words.section')}</p>
      <div className="wd-chips" role="group" aria-labelledby="wd-lbl-section">
        {(meta ? meta.sections : []).map((s) => (
          <button
            key={s.id}
            type="button"
            className="wd-chip"
            aria-pressed={section === s.id}
            onClick={() => onSection(s.id)}
          >
            {t('words.section.' + s.id)}
            <em>{s.words}</em>
          </button>
        ))}
      </div>

      {!meta ? (
        <div className="wd-note">{t('words.loading')}</div>
      ) : (
        <div className="wd-grid">
          {current.scenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} state={state} onOpen={onOpen} />
          ))}
        </div>
      )}
    </>
  )
}

function SceneCard({ scene, state, onOpen }) {
  const { t } = useI18n()
  const pct = sceneProgress(scene.id, scene.count, state)
  const done = sceneState(scene.id, state).done
  const label = pct === 0 ? t('words.start') : done || pct === 100 ? t('words.again') : t('words.cont')

  return (
    <article className="wd-card">
      <div className="wd-card__cover" style={{ '--wd-tint': scene.tint, '--wd-tint2': scene.tint2 }}>
        {/* Обложка декоративная: сцену называет заголовок под ней, и второй
            раз читать то же имя скринридеру незачем. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- картинки раздела пережаты офлайн (WebP) и лежат в public: next/image добавил бы прокси на 1100 файлов без выигрыша. */}
        <img src={sceneCoverUrl(scene.id)} alt="" loading="lazy" decoding="async" />
        {done && <span className="wd-card__done">{t('words.done')}</span>}
      </div>
      <div className="wd-card__body">
        <h3 className="wd-card__title">{scene.name}</h3>
        <div className="wd-card__meta">{t('words.wordCount', { n: scene.count })}</div>
        <div className="wd-card__bar">
          <span className="wd-bar">
            <i style={{ width: `${pct}%` }} />
          </span>
          <span>{pct}%</span>
        </div>
        <button type="button" className="wd-btn wd-btn--primary wd-btn--block" onClick={() => onOpen(scene.id)}>
          {label}
        </button>
      </div>
    </article>
  )
}
